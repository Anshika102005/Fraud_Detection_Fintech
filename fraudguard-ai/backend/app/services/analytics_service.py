"""Analytics service - all metrics computed from the user's OWN stored data.

Nothing is hardcoded; every endpoint aggregates the authenticated user's
transactions. If a user has no data, empty/zero values are returned rather
than invented numbers.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models import Transaction


def _user_transactions(db: Session, user_id: int) -> list[Transaction]:
    """ALWAYS scoped to the authenticated user - data isolation by construction."""
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.transaction_datetime.asc())
        .all()
    )


def _month_key(dt: datetime) -> str:
    return f"{dt.year:04d}-{dt.month:02d}"


def analytics_summary(db: Session, user_id: int) -> dict[str, Any]:
    txns = _user_transactions(db, user_id)
    total = len(txns)
    fraudulent = sum(1 for t in txns if t.ml_prediction == "fraudulent")
    suspicious = sum(1 for t in txns if t.ml_prediction == "suspicious")
    values = [t.amount for t in txns]
    risk_scores = [t.risk_score for t in txns if t.risk_score is not None]

    current_month = _month_key(datetime.now())
    monthly_count = sum(1 for t in txns if _month_key(t.transaction_datetime) == current_month)

    return {
        "total_transactions": total,
        "fraudulent_transactions": fraudulent,
        "suspicious_transactions": suspicious,
        "fraud_rate": round((fraudulent / total) * 100, 2) if total else 0.0,
        "total_transaction_value": round(sum(values), 2),
        "average_transaction_value": round(sum(values) / total, 2) if total else 0.0,
        "average_risk_score": round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0.0,
        "monthly_payment_count": monthly_count,
    }


def _bucket_by_period(txns: list[Transaction], key_fn) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, Any]] = {}
    for t in txns:
        key = key_fn(t.transaction_datetime)
        if key not in buckets:
            buckets[key] = {
                "period": key,
                "transaction_count": 0,
                "total_value": 0.0,
                "fraud_count": 0,
                "suspicious_count": 0,
                "average_risk_score": 0.0,
                "_risk_sum": 0.0,
                "_risk_n": 0,
            }
        b = buckets[key]
        b["transaction_count"] += 1
        b["total_value"] += t.amount
        if t.ml_prediction == "fraudulent":
            b["fraud_count"] += 1
        elif t.ml_prediction == "suspicious":
            b["suspicious_count"] += 1
        if t.risk_score is not None:
            b["_risk_sum"] += t.risk_score
            b["_risk_n"] += 1
    out = []
    for key in sorted(buckets):
        b = buckets[key]
        b["total_value"] = round(b["total_value"], 2)
        risk_n = b.pop("_risk_n")
        risk_sum = b.pop("_risk_sum")
        b["average_risk_score"] = round(risk_sum / risk_n, 1) if risk_n else 0.0
        out.append(b)
    return out


def analytics_daily(db: Session, user_id: int, days: int = 30) -> list[dict[str, Any]]:
    txns = _user_transactions(db, user_id)
    cutoff = datetime.now() - timedelta(days=days)
    txns = [t for t in txns if t.transaction_datetime >= cutoff]
    return _bucket_by_period(txns, lambda dt: dt.strftime("%Y-%m-%d"))


def analytics_weekly(db: Session, user_id: int, weeks: int = 12) -> list[dict[str, Any]]:
    txns = _user_transactions(db, user_id)
    return _bucket_by_period(
        txns, lambda dt: f"{dt.isocalendar().year}-W{dt.isocalendar().week:02d}"
    )


def analytics_monthly(db: Session, user_id: int) -> list[dict[str, Any]]:
    txns = _user_transactions(db, user_id)
    return _bucket_by_period(txns, lambda dt: _month_key(dt))


def _breakdown(db: Session, user_id: int, attr: str, top: int = 15) -> list[dict[str, Any]]:
    txns = _user_transactions(db, user_id)
    stats: dict[str, dict[str, Any]] = {}
    for t in txns:
        key = (getattr(t, attr) or "Unknown") or "Unknown"
        s = stats.setdefault(key, {
            "name": key, "transaction_count": 0, "total_value": 0.0,
            "fraud_count": 0, "average_risk_score": 0.0,
            "_risk_sum": 0.0, "_risk_n": 0,
        })
        s["transaction_count"] += 1
        s["total_value"] += t.amount
        if t.ml_prediction == "fraudulent":
            s["fraud_count"] += 1
        if t.risk_score is not None:
            s["_risk_sum"] += t.risk_score
            s["_risk_n"] += 1
    out = []
    for s in stats.values():
        s["total_value"] = round(s["total_value"], 2)
        risk_n = s.pop("_risk_n")
        risk_sum = s.pop("_risk_sum")
        s["average_risk_score"] = round(risk_sum / risk_n, 1) if risk_n else 0.0
        out.append(s)
    out.sort(key=lambda s: s["transaction_count"], reverse=True)
    return out[:top]


def analytics_categories(db: Session, user_id: int) -> list[dict[str, Any]]:
    return _breakdown(db, user_id, "merchant_category")


def analytics_merchants(db: Session, user_id: int) -> list[dict[str, Any]]:
    return _breakdown(db, user_id, "merchant")


def analytics_locations(db: Session, user_id: int) -> list[dict[str, Any]]:
    return _breakdown(db, user_id, "location")


def analytics_payment_methods(db: Session, user_id: int) -> list[dict[str, Any]]:
    return _breakdown(db, user_id, "payment_method")


def analytics_hourly(db: Session, user_id: int) -> list[dict[str, Any]]:
    txns = _user_transactions(db, user_id)
    buckets: dict[int, dict[str, Any]] = {
        h: {"hour": h, "transaction_count": 0, "total_value": 0.0, "fraud_count": 0}
        for h in range(24)
    }
    for t in txns:
        b = buckets[t.transaction_datetime.hour]
        b["transaction_count"] += 1
        b["total_value"] += t.amount
        if t.ml_prediction == "fraudulent":
            b["fraud_count"] += 1
    for b in buckets.values():
        b["total_value"] = round(b["total_value"], 2)
    return [buckets[h] for h in range(24)]


def analytics_risk_distribution(db: Session, user_id: int) -> dict[str, Any]:
    from collections import Counter

    txns = _user_transactions(db, user_id)
    by_level: Counter[str] = Counter()
    by_prediction: Counter[str] = Counter()
    for t in txns:
        by_level[t.risk_level or "UNKNOWN"] += 1
        by_prediction[t.ml_prediction or "unrated"] += 1
    return {
        "by_risk_level": {k: v for k, v in sorted(by_level.items())},
        "by_prediction": {k: v for k, v in sorted(by_prediction.items())},
        "total": len(txns),
    }
