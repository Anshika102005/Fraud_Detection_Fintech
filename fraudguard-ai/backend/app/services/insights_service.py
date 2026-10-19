"""Spending insights, personal safety score, and monthly security report.

All values are derived from the user's actual stored transactions.
If there is not enough data to compute something, it is omitted - never
invented (e.g. no fake safety score with zero history).
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models import FraudAlert, Transaction
from app.services.analytics_service import _month_key, _user_transactions

INSUFFICIENT_DATA = "insufficient_data"


def generate_spending_insights(db: Session, user_id: int) -> dict[str, Any]:
    """Human-readable insights computed from actual user data."""
    txns = _user_transactions(db, user_id)
    now = datetime.now()
    current_month_key = _month_key(now)
    prev_month = (now.replace(day=1) - timedelta(days=1))
    prev_month_key = _month_key(prev_month)

    current = [t for t in txns if _month_key(t.transaction_datetime) == current_month_key]
    previous = [t for t in txns if _month_key(t.transaction_datetime) == prev_month_key]

    insights: list[str] = []
    if not txns:
        return {"insights": [], "message": INSUFFICIENT_DATA,
                "detail": "Add transactions or upload a CSV to see insights."}

    if current and previous:
        cur_total = sum(t.amount for t in current)
        prev_total = sum(t.amount for t in previous)
        if prev_total > 0:
            change = ((cur_total - prev_total) / prev_total) * 100
            direction = "more" if change >= 0 else "less"
            insights.append(
                f"You spent {abs(change):.0f}% {direction} this month compared to last month."
            )
        cur_count, prev_count = len(current), len(previous)
        if prev_count:
            freq_change = ((cur_count - prev_count) / prev_count) * 100
            if abs(freq_change) >= 5:
                insights.append(
                    f"Your transaction frequency {'increased' if freq_change > 0 else 'decreased'} "
                    f"by {abs(freq_change):.0f}%."
                )

    cat_totals: Counter[str] = Counter()
    for t in txns:
        cat_totals[t.merchant_category or "Other"] += t.amount
    if cat_totals:
        top_cat, top_val = cat_totals.most_common(1)[0]
        insights.append(f"{top_cat} is your highest spending category (Rs.{top_val:,.0f} total).")

    hours = Counter(t.transaction_datetime.hour for t in txns)
    if hours:
        peak_hour = hours.most_common(1)[0][0]
        window = f"{max(0, peak_hour - 2)}:00 and {min(23, peak_hour + 2)}:00"
        insights.append(f"Most of your transactions occur between {window}.")

    amounts = sorted(t.amount for t in txns)
    if len(amounts) >= 5:
        q1 = amounts[len(amounts) // 4]
        threshold = max(q1 * 4, 5000)
        large = [t for t in current if t.amount >= threshold]
        if large:
            insights.append(
                f"You made {len(large)} unusually large transaction(s) this month."
            )

    monthly_fraud = [t for t in current if t.ml_prediction in ("fraudulent", "suspicious")]
    if monthly_fraud:
        insights.append(
            f"{len(monthly_fraud)} transaction(s) this month were flagged as "
            "suspicious or fraudulent - review your fraud alerts."
        )

    return {"insights": insights, "message": "ok", "detail": None}


def calculate_safety_score(db: Session, user_id: int) -> dict[str, Any]:
    """Personal digital safety score (0-100) with component breakdown.

    Components are only computed when enough data exists - never invented.
      - transaction_safety: share of transactions without high risk
      - payment_behavior: night-activity habits
      - fraud_awareness: alert responsiveness
      - security_habits: alert handling behavior
    """
    txns = _user_transactions(db, user_id)
    if not txns:
        return {
            "overall_score": None,
            "components": {},
            "recommendations": [
                "Add or upload transactions so FraudGuard can assess your safety score",
            ],
            "message": INSUFFICIENT_DATA,
        }

    components: dict[str, Any] = {}

    rated = [t for t in txns if t.risk_score is not None]
    if rated:
        avg_risk = sum(t.risk_score for t in rated) / len(rated)
        high_risk_share = sum(
            1 for t in rated if (t.risk_level or "") in ("HIGH", "CRITICAL")
        ) / len(rated)
        components["transaction_safety"] = round(
            max(0, 100 - avg_risk * 0.8 - high_risk_share * 30), 1
        )
    else:
        components["transaction_safety"] = None

    night_share = sum(
        1 for t in txns if t.transaction_datetime.hour >= 22 or t.transaction_datetime.hour < 5
    ) / len(txns)
    components["payment_behavior"] = round(max(0, 100 - night_share * 120), 1)

    alerts = db.query(FraudAlert).filter(FraudAlert.user_id == user_id).all()
    if alerts:
        resolved = [a for a in alerts if a.status != "new" and a.resolved_at]
        response_hours = [
            (a.resolved_at - a.created_at).total_seconds() / 3600
            for a in resolved if a.resolved_at and a.created_at
        ]
        avg_response = sum(response_hours) / len(response_hours) if response_hours else None
        responsiveness = 100 if avg_response is None else max(0, 100 - avg_response * 2)
        components["fraud_awareness"] = round(responsiveness, 1)
    else:
        components["fraud_awareness"] = None

    if alerts:
        handled = sum(1 for a in alerts if a.status in ("dismissed", "confirmed_fraud", "false_positive"))
        components["security_habits"] = round(60 + 40 * (handled / len(alerts)), 1)
    else:
        components["security_habits"] = None

    scored = [v for v in components.values() if v is not None]
    overall = round(sum(scored) / len(scored), 1) if scored else None

    recommendations: list[str] = []
    if (components["transaction_safety"] or 100) < 70:
        recommendations.append("Review recent high-risk transactions in your fraud alerts")
    if (components["payment_behavior"] or 100) < 70:
        recommendations.append("Avoid making payments late at night when you normally don't")
    if not alerts:
        recommendations.append("Learn how QR payment scams work in the Safety Center")
    if (components["fraud_awareness"] or 100) < 70:
        recommendations.append("Respond to fraud alerts faster to improve your score")
    if not recommendations:
        recommendations.append("Keep it up - review your alerts regularly to stay safe")

    return {
        "overall_score": overall,
        "components": components,
        "recommendations": recommendations,
        "message": "ok",
    }


def monthly_security_report(db: Session, user_id: int) -> dict[str, Any]:
    """Structured monthly security report (JSON; PDF generation can come later)."""
    txns = _user_transactions(db, user_id)
    now = datetime.now()
    month_key = _month_key(now)
    month_txns = [t for t in txns if _month_key(t.transaction_datetime) == month_key]
    prev_month = (now.replace(day=1) - timedelta(days=1))
    prev_txns = [t for t in txns if _month_key(t.transaction_datetime) == _month_key(prev_month)]

    if not month_txns:
        return {
            "month": month_key,
            "message": INSUFFICIENT_DATA,
            "detail": "No transactions recorded for this month yet.",
            "report": None,
        }

    fraudulent = [t for t in month_txns if t.ml_prediction == "fraudulent"]
    suspicious = [t for t in month_txns if t.ml_prediction == "suspicious"]
    risk_scores = [t.risk_score for t in month_txns if t.risk_score is not None]
    highest_risk = max(month_txns, key=lambda t: (t.risk_score or 0), default=None)

    payment_methods = Counter(t.payment_method for t in month_txns)
    categories = Counter(t.merchant_category for t in month_txns)

    cur_total = sum(t.amount for t in month_txns)
    prev_total = sum(t.amount for t in prev_txns)
    spending_change = (
        round(((cur_total - prev_total) / prev_total) * 100, 1) if prev_total else None
    )

    safety = calculate_safety_score(db, user_id)

    return {
        "month": month_key,
        "message": "ok",
        "report": {
            "total_transactions": len(month_txns),
            "total_value": round(cur_total, 2),
            "fraudulent_transactions": len(fraudulent),
            "suspicious_transactions": len(suspicious),
            "fraud_rate": round(len(fraudulent) / len(month_txns) * 100, 2),
            "average_risk_score": round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0.0,
            "highest_risk_transaction": {
                "id": highest_risk.id,
                "merchant": highest_risk.merchant,
                "amount": highest_risk.amount,
                "risk_score": highest_risk.risk_score,
                "risk_level": highest_risk.risk_level,
            } if highest_risk else None,
            "most_used_payment_method": payment_methods.most_common(1)[0][0] if payment_methods else None,
            "most_used_merchant_category": categories.most_common(1)[0][0] if categories else None,
            "spending_change_percent": spending_change,
            "safety_score": safety.get("overall_score"),
        },
        "disclaimer": (
            "FraudGuard predictions are probabilistic decision-support signals, "
            "not confirmed fraud verdicts."
        ),
    }
