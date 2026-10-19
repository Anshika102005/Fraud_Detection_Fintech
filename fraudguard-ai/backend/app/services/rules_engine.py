"""Risk Scoring Engine + Behavioral Risk Engine (rule layer).

The risk score is deliberately SEPARATE from raw model probability:
business rules and behavioral intelligence contribute on top of the ML signal,
so a single rule never auto-labels a transaction as fraud - combinations do.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class RuleFlag:
    code: str
    weight: int
    message: str
    feature: str


@dataclass
class RiskAssessment:
    fraud_probability: float
    risk_score: int
    risk_level: str
    prediction: str
    behavioral_anomaly_score: int
    flags: list[RuleFlag] = field(default_factory=list)


def risk_level_from_score(score: int) -> str:
    if score <= 25:
        return "LOW"
    if score <= 50:
        return "MEDIUM"
    if score <= 75:
        return "HIGH"
    return "CRITICAL"


def prediction_from_probability(
    probability: float,
    suspicious_threshold: float = 0.30,
    fraudulent_threshold: float = 0.70,
) -> str:
    if probability < suspicious_threshold:
        return "legitimate"
    if probability < fraudulent_threshold:
        return "suspicious"
    return "fraudulent"


def evaluate_rule_flags(features: dict[str, Any]) -> list[RuleFlag]:
    """Evaluate behavioral/business rules. Each returns a human-readable flag."""
    flags: list[RuleFlag] = []

    avg_ratio = float(features.get("amount_vs_user_avg") or 1.0)
    if avg_ratio >= 3.0:
        flags.append(RuleFlag(
            code="amount_deviation",
            weight=16 if avg_ratio >= 5 else 10,
            feature="amount_vs_user_avg",
            message="Transaction amount is significantly higher than your normal spending",
        ))

    if not features.get("merchant_seen_before") and int(features.get("user_txn_count") or 0) >= 10:
        flags.append(RuleFlag(
            code="new_merchant", weight=8, feature="merchant_seen_before",
            message="Merchant is new for you",
        ))

    if not features.get("location_seen_before") and int(features.get("user_txn_count") or 0) >= 10:
        flags.append(RuleFlag(
            code="new_location", weight=8, feature="location_seen_before",
            message="Transaction location differs from your historical behavior",
        ))

    if features.get("is_night"):
        flags.append(RuleFlag(
            code="unusual_time", weight=8, feature="is_night",
            message="Transaction occurred at an unusual time (late night)",
        ))

    if int(features.get("txn_count_1h") or 0) >= 3:
        flags.append(RuleFlag(
            code="high_velocity", weight=11, feature="txn_count_1h",
            message="High transaction velocity in the last hour",
        ))
    elif int(features.get("txn_count_24h") or 0) >= 8:
        flags.append(RuleFlag(
            code="elevated_velocity", weight=5, feature="txn_count_24h",
            message="Elevated transaction frequency in the last 24 hours",
        ))

    if not features.get("category_seen_before") and int(features.get("user_txn_count") or 0) >= 10:
        flags.append(RuleFlag(
            code="new_category", weight=5, feature="category_seen_before",
            message="Spending category is unusual for you",
        ))

    if float(features.get("amount") or 0) >= 25000:
        flags.append(RuleFlag(
            code="large_amount", weight=5, feature="amount",
            message="Unusually large transaction amount",
        ))

    return flags


def behavioral_anomaly_score(features: dict[str, Any]) -> int:
    """0-100 score of how much this transaction deviates from user's baseline."""
    score = 0
    ratio = float(features.get("amount_vs_user_avg") or 1.0)
    if ratio >= 3:
        score += 30
    elif ratio >= 2:
        score += 18
    elif ratio >= 1.5:
        score += 8
    if features.get("is_night"):
        score += 20
    if not features.get("merchant_seen_before"):
        score += 15
    if not features.get("location_seen_before"):
        score += 15
    if int(features.get("txn_count_1h") or 0) >= 3:
        score += 20
    return min(100, score)


def compute_risk(
    features: dict[str, Any],
    fraud_probability: float,
    *,
    probability_weight: float = 60.0,
    flag_weight_cap: float = 40.0,
) -> RiskAssessment:
    """Blend model probability with rule flags into one 0-100 risk score."""
    flags = evaluate_rule_flags(features)
    flag_total = sum(f.weight for f in flags)
    flag_component = min(flag_total, flag_weight_cap)
    raw = fraud_probability * probability_weight + flag_component
    risk_score = int(round(max(0.0, min(100.0, raw))))
    return RiskAssessment(
        fraud_probability=round(float(fraud_probability), 4),
        risk_score=risk_score,
        risk_level=risk_level_from_score(risk_score),
        prediction=prediction_from_probability(fraud_probability),
        behavioral_anomaly_score=behavioral_anomaly_score(features),
        flags=flags,
    )
