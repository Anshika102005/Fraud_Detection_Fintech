"""Fraud detection pipeline orchestrator.

For each transaction:
  save transaction -> behavioral features (vs user history) -> ML probability
  -> risk score -> explanation -> alert (if thresholds met) -> persist.

The pipeline NEVER claims certainty: outputs are probabilistic and every
alert explicitly says what would have to be confirmed by the user.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime

import pandas as pd
from sqlalchemy.orm import Session

from app.config import settings
from app.models import FraudAlert, Transaction, TransactionStatus, User
from app.services import rules_engine
from app.services.model_service import ModelUnavailableError, get_model_service

logger = logging.getLogger("fraudguard.detection")


@dataclass
class DetectionResult:
    transaction_id: int
    fraud_probability: float
    risk_score: int
    risk_level: str
    prediction: str
    behavioral_anomaly_score: int
    reasons: list[dict] = field(default_factory=list)
    alert_created: bool = False
    alert_id: int | None = None
    features: dict | None = None


def build_history_frame(db: Session, user_id: int, exclude_txn_id: int | None = None) -> pd.DataFrame:
    """User's stored transactions as a DataFrame (excludes the txn under eval)."""
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    if exclude_txn_id is not None:
        query = query.filter(Transaction.id != exclude_txn_id)
    rows = query.order_by(Transaction.transaction_datetime.asc()).all()
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame([
        {
            "amount": t.amount,
            "transaction_datetime": t.transaction_datetime,
            "merchant": t.merchant,
            "merchant_category": t.merchant_category,
            "location": t.location,
            "payment_method": t.payment_method,
            "device_type": t.device_type,
        }
        for t in rows
    ])


def analyze_transaction(
    db: Session,
    user: User,
    transaction: Transaction,
    history_df: pd.DataFrame | None = None,
    create_alert: bool = True,
) -> DetectionResult:
    """Run the complete fraud detection pipeline for one stored transaction."""
    from ml.features import (  # local import to keep backend import-time light
        build_history_profile,
        engineer_transaction_features,
        features_to_frame,
        velocity_counts,
    )

    model_service = get_model_service()
    if history_df is None:
        history_df = build_history_frame(db, user.id, exclude_txn_id=transaction.id)

    dt: datetime = transaction.transaction_datetime
    history_datetimes = (
        [d.to_pydatetime() for d in pd.to_datetime(history_df["transaction_datetime"])]
        if len(history_df) else []
    )
    c1h, c24h = velocity_counts(history_datetimes, dt)
    profile = build_history_profile(history_df)

    features = engineer_transaction_features(
        amount=transaction.amount,
        transaction_datetime=dt,
        merchant=transaction.merchant,
        merchant_category=transaction.merchant_category,
        payment_method=transaction.payment_method,
        location=transaction.location,
        device_type=transaction.device_type,
        history_profile=profile,
        txn_count_1h=c1h,
        txn_count_24h=c24h,
    )
    features_frame = features_to_frame([dict(features)])

    try:
        probability = model_service.predict_proba(features_frame)
        contributions = model_service.explain(features_frame)
    except ModelUnavailableError:
        logger.error("Model unavailable - falling back to rules-only assessment")
        probability = 0.0
        contributions = []

    assessment = rules_engine.compute_risk(features, probability)

    # Persist ML snapshot on the transaction (denormalised dashboard data)
    transaction.fraud_probability = assessment.fraud_probability
    transaction.risk_score = assessment.risk_score
    transaction.risk_level = assessment.risk_level
    transaction.ml_prediction = assessment.prediction
    if transaction.status == TransactionStatus.PENDING.value:
        transaction.status = {
            "legitimate": TransactionStatus.LEGITIMATE.value,
            "suspicious": TransactionStatus.SUSPICIOUS.value,
            "fraudulent": TransactionStatus.FRAUDULENT.value,
        }.get(assessment.prediction, TransactionStatus.PENDING.value)

    reasons = build_human_reasons(assessment.flags, contributions, features)
    db.flush()

    alert_id = None
    alert_created = False
    if create_alert and _should_alert(assessment, settings):
        alert = _create_alert(db, user.id, transaction.id, assessment, reasons)
        alert_id = alert.id
        alert_created = True

    db.commit()
    return DetectionResult(
        transaction_id=transaction.id,
        fraud_probability=assessment.fraud_probability,
        risk_score=assessment.risk_score,
        risk_level=assessment.risk_level,
        prediction=assessment.prediction,
        behavioral_anomaly_score=assessment.behavioral_anomaly_score,
        reasons=reasons,
        alert_created=alert_created,
        alert_id=alert_id,
        features={k: (v if isinstance(v, (int, float, str)) else str(v)) for k, v in features.items()},
    )


def _should_alert(assessment: rules_engine.RiskAssessment, cfg=settings) -> bool:
    """Alert when risk score, probability, or multiple anomalies cross thresholds."""
    return (
        assessment.risk_score >= cfg.alert_risk_score_threshold
        or assessment.fraud_probability >= cfg.alert_fraud_probability_threshold
        or len(assessment.flags) >= cfg.alert_min_anomaly_flags
    )


def _create_alert(db: Session, user_id: int, transaction_id: int, assessment, reasons) -> FraudAlert:
    severity = assessment.risk_level if assessment.risk_level != "LOW" else "MEDIUM"
    alert = FraudAlert(
        user_id=user_id,
        transaction_id=transaction_id,
        alert_type="high_risk",
        severity=severity,
        title="Unusual transaction detected",
        description=(
            "FraudGuard detected unusual patterns in this transaction. "
            "This is a probabilistic signal, not a confirmed fraud. "
            "Please review the reasons and confirm whether you recognise this transaction."
        ),
        fraud_probability=assessment.fraud_probability,
        risk_score=assessment.risk_score,
        reasons=[r["message"] for r in reasons] or ["Behavioral pattern flagged by the model"],
        status="new",
    )
    db.add(alert)
    db.flush()
    logger.info(
        "Fraud alert created user=%s transaction=%s risk=%s level=%s",
        user_id, transaction_id, assessment.risk_score, assessment.risk_level,
    )
    return alert


def build_human_reasons(
    flags: list[rules_engine.RuleFlag],
    contributions: list[dict],
    features: dict,
) -> list[dict]:
    """Machine-readable + human-readable explanation list.

    Combines rule-based reasons (always meaningful) with SHAP contributions
    (explanatory). Raw math is never exposed to end users.
    """
    FEATURE_MESSAGES = {
        "amount": "Transaction amount is a key driver of this assessment",
        "log_amount": "Transaction amount is a key driver of this assessment",
        "transaction_hour": "The time of the transaction contributes to the risk",
        "amount_vs_user_avg": "Transaction amount is significantly higher than your normal spending",
        "amount_zscore": "Transaction amount is significantly higher than your normal spending",
        "merchant_seen_before": "Merchant is new for you",
        "location_seen_before": "Location differs from your historical behavior",
        "category_seen_before": "Spending category is unusual for you",
        "txn_count_1h": "High transaction velocity in the last hour",
        "is_night": "Transaction occurred at an unusual time (late night)",
        "payment_method": "Payment method contributes to this assessment",
        "merchant_category": "Merchant category contributes to this assessment",
        "location": "Location contributes to this assessment",
    }
    seen: set[str] = set()
    reasons: list[dict] = []

    def add(feature: str, impact: str, direction: str, message: str) -> None:
        if feature in seen:
            return
        seen.add(feature)
        reasons.append({
            "feature": feature,
            "impact": impact,
            "direction": direction,
            "message": message,
        })

    # Rule flags first (most actionable, human-readable)
    for flag in flags:
        impact = "high" if flag.weight >= 10 else "medium"
        add(flag.feature, impact, "increases_risk", flag.message)

    # SHAP contributions (magnitude-scaled)
    max_abs = max((abs(c["contribution"]) for c in contributions), default=0.0) or 1.0
    for c in contributions:
        if len(reasons) >= 6:
            break
        feature = c["feature"]
        if feature not in FEATURE_MESSAGES:
            continue
        magnitude = abs(c["contribution"])
        if magnitude < 0.02 * max_abs:
            continue
        direction = "increases_risk" if c["contribution"] > 0 else "decreases_risk"
        impact = "high" if magnitude >= 0.6 * max_abs else "medium"
        add(feature, impact, direction, FEATURE_MESSAGES[feature])

    if not reasons:
        reasons.append({
            "feature": "overall",
            "impact": "low",
            "direction": "neutral",
            "message": "Transaction is consistent with your normal behavior",
        })
    return reasons
