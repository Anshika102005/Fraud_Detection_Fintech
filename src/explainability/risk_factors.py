"""Map SHAP contributions to human-readable risk factors (interview-grade UX).

The mapping encodes fraud-domain knowledge: a positive SHAP contribution on
`amount_zscore` is communicated as "amount far above the customer's historical
average", not as a raw feature name.
"""
from __future__ import annotations

import numpy as np

FACTOR_TEMPLATES: dict[str, str] = {
    "amount_ratio_to_mean": "Transaction amount far above the customer's historical average",
    "amount_zscore": "Statistically unusual amount vs the customer's spend profile",
    "amount_deviation_from_mean": "Amount deviates strongly from historical mean",
    "amount_ratio_to_prev": "Large jump vs the previous transaction",
    "log_amount": "Unusually large transaction amount",
    "new_device_flag": "Transaction from a device never seen for this customer",
    "device_changed_flag": "Device differs from the customer's usual one",
    "device_location_mismatch_flag": "Known device used from an unusual location",
    "new_country_flag": "First-time transaction country for this customer",
    "country_changed_flag": "Transaction country changed since the previous transaction",
    "multi_country_24h_flag": "Card used in multiple countries within 24h",
    "unique_countries_24h": "Multiple countries within 24h",
    "impossible_travel_flag": "Physically impossible travel since the previous transaction",
    "impossible_travel_kmh": "Implied travel speed is unrealistically high",
    "distance_from_home_km": "Transaction far from the customer's home location",
    "customer_txn_count_5m": "Burst of transactions within 5 minutes (card-testing pattern)",
    "customer_txn_count_15m": "Abnormal transaction velocity (15-minute window)",
    "customer_txn_count_1h": "Abnormal transaction velocity (1-hour window)",
    "customer_txn_count_24h": "Elevated transaction count in the last 24h",
    "customer_amount_sum_24h": "Elevated spending volume in the last 24h",
    "merchant_fraud_rate_hist": "Merchant has an elevated historical fraud rate",
    "mcc_fraud_rate_hist": "Merchant category has an elevated historical fraud rate",
    "merchant_category_woe": "Risky merchant category",
    "new_merchant_for_customer_flag": "First-time merchant for this customer",
    "is_night": "Transaction at an unusual (night) hour",
    "hour_deviation_circular": "Transaction hour deviates from the customer's typical hours",
    "failed_auth_attempts": "Failed authentication attempts on this transaction",
    "auth_failures_24h": "Multiple authentication failures in the last 24h",
    "failed_txn_count_24h": "Recent failed transactions on this card",
    "device_customer_count": "Device is shared across multiple customer accounts",
    "ip_customer_count": "IP address shared across multiple customer accounts",
    "ip_risk_score": "High-risk IP address",
    "ip_txn_count_24h": "High transaction volume from this IP in 24h",
    "rapid_repeat_txn_flag": "Rapid repeat transaction (seconds apart)",
    "merchant_txn_count_1h": "Unusual activity burst at this merchant",
    "customer_merchant_txn_count_90d": "Unusual customer-merchant interaction frequency",
    "night_x_amount_ratio_mean": "Large amount at an unusual (night) hour",
    "new_device_x_amount_zscore": "Large amount combined with a new device",
    "new_country_x_log_amount": "Large amount in a first-time country",
    "amount_x_velocity_24h": "Large amount combined with high velocity",
    "amount_zscore_x_velocity_24h": "Unusual amount combined with high velocity",
    "customer_weekend_ratio_30d": "Weekend activity pattern anomaly",
    "customer_night_ratio_30d": "Night-activity pattern anomaly",
}

DEFAULT_POSITIVE = "Anomalous value for feature '{feature}' pushes risk up"
DEFAULT_NEGATIVE = "Value for feature '{feature}' is consistent with normal behavior"


def top_risk_factors(shap_row: np.ndarray, feature_names: list[str], k: int = 5,
                     risk_up_only: bool = True) -> list[dict]:
    """Top-k human-readable risk factors for ONE transaction.

    shap_row: SHAP values for the fraud class (positive => pushes toward fraud).
    """
    shap_row = np.asarray(shap_row, dtype=float)
    order = np.argsort(-np.abs(shap_row))
    factors = []
    for i in order:
        val = float(shap_row[i])
        if risk_up_only and val <= 0:
            continue
        feature = feature_names[i]
        explanation = FACTOR_TEMPLATES.get(feature)
        if explanation is None:
            explanation = (DEFAULT_POSITIVE if val > 0 else DEFAULT_NEGATIVE
                           ).format(feature=feature)
        factors.append({"feature": feature, "contribution": round(val, 4),
                        "explanation": explanation})
        if len(factors) >= k:
            break
    return factors
