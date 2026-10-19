"""FraudGuard AI - shared feature engineering.

This module is the SINGLE source of truth for the feature space. It is used by:
  1. ml/models/fraud_model.py  (training)
  2. backend/app/services/model_service.py (inference)

Keeping it independent of FastAPI allows the model to be trained and tested
separately, while guaranteeing train/inference feature parity.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd

# Canonical feature order used everywhere (training + inference).
NUMERIC_FEATURES = [
    "amount",
    "log_amount",
    "transaction_hour",
    "transaction_day",
    "day_of_week",
    "is_weekend",
    "is_night",
    "amount_vs_user_avg",
    "amount_vs_user_max",
    "amount_zscore",
    "txn_count_1h",
    "txn_count_24h",
    "hours_since_last_txn",
    "merchant_frequency",
    "merchant_seen_before",
    "location_frequency",
    "location_seen_before",
    "category_frequency",
    "category_seen_before",
    "user_txn_count",
]

CATEGORICAL_FEATURES = [
    "merchant_category",
    "payment_method",
    "location",
    "device_type",
]

FEATURE_NAMES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET_COLUMN = "is_fraud"

# Imputation defaults for missing history (cold-start user).
HISTORY_DEFAULTS = {
    "amount_vs_user_avg": 1.0,
    "amount_vs_user_max": 0.5,
    "amount_zscore": 0.0,
    "hours_since_last_txn": 24.0,
}


def _safe_log1p(value: float) -> float:
    try:
        return float(np.log1p(max(0.0, float(value))))
    except (TypeError, ValueError):
        return 0.0


def parse_transaction_datetime(date_part: Any, time_part: Any = None) -> datetime | None:
    """Parse flexible date/time inputs into a naive datetime (local, IST assumed)."""
    if isinstance(date_part, datetime):
        dt = date_part
        if time_part and isinstance(time_part, str) and ":" in time_part:
            try:
                hh, mm = time_part.split(":")[:2]
                dt = dt.replace(hour=int(hh), minute=int(mm))
            except (ValueError, TypeError):
                pass
        return dt
    if date_part is None:
        return None
    text = str(date_part).strip()
    if time_part:
        text = f"{text} {str(time_part).strip()}"
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%d/%m/%Y %H:%M",
        "%d-%m-%Y %H:%M",
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
    ):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    try:
        return pd.to_datetime(text).to_pydatetime()
    except Exception:  # noqa: BLE001
        return None


def build_history_profile(history: pd.DataFrame | list[dict]) -> dict[str, Any]:
    """Aggregate a user's historical transactions into behavioral profile stats.

    `history` must contain: amount, transaction_datetime, merchant,
    merchant_category, location. Must EXCLUDE the transaction under evaluation.
    """
    if isinstance(history, list):
        history = pd.DataFrame(history)
    profile: dict[str, Any] = {
        "count": 0,
        "avg_amount": None,
        "median_amount": None,
        "max_amount": None,
        "std_amount": None,
        "merchants": [],
        "locations": [],
        "categories": [],
        "hours": [],
        "last_datetime": None,
    }
    if history is None or len(history) == 0:
        return profile

    amounts = pd.to_numeric(history["amount"], errors="coerce").dropna()
    profile["count"] = int(len(history))
    if len(amounts):
        profile["avg_amount"] = float(amounts.mean())
        profile["median_amount"] = float(amounts.median())
        profile["max_amount"] = float(amounts.max())
        profile["std_amount"] = float(amounts.std(ddof=0)) if len(amounts) > 1 else 0.0

    for col, key in (
        ("merchant", "merchants"),
        ("location", "locations"),
        ("merchant_category", "categories"),
    ):
        if col in history.columns:
            values = history[col].dropna().astype(str).str.strip().str.lower()
            profile[key] = sorted({v for v in values if v})[:500]

    dts = pd.to_datetime(history["transaction_datetime"], errors="coerce").dropna()
    if len(dts):
        profile["hours"] = sorted({int(h) for h in dts.dt.hour})
        profile["last_datetime"] = dts.max().to_pydatetime()
    return profile


def engineer_transaction_features(
    amount: float,
    transaction_datetime: datetime,
    merchant: str,
    merchant_category: str,
    payment_method: str,
    location: str | None = None,
    device_type: str | None = None,
    history_profile: dict[str, Any] | None = None,
    txn_count_1h: int = 0,
    txn_count_24h: int = 0,
) -> dict[str, float | str]:
    """Build one feature row for a transaction given the user's history profile.

    Behavioral features compare the transaction against history, e.g. a user
    normally spending Rs.300-1,200 whose current transaction is Rs.9,500 gets a
    large deviation feature. A cold-start user (no history) gets neutral
    defaults - never fabricated "normal" behavior.
    """
    profile = history_profile or {}
    dt = transaction_datetime

    user_count = int(profile.get("count") or 0)
    user_avg = profile.get("avg_amount")
    user_max = profile.get("max_amount")
    user_std = profile.get("std_amount") or 0.0

    amount = float(amount)
    amount_vs_avg = (
        amount / user_avg if user_avg and user_avg > 0
        else HISTORY_DEFAULTS["amount_vs_user_avg"]
    )
    amount_vs_max = (
        amount / user_max if user_max and user_max > 0
        else HISTORY_DEFAULTS["amount_vs_user_max"]
    )
    if user_avg is not None and user_std and user_std > 0:
        amount_zscore = (amount - user_avg) / user_std
    elif user_avg is not None:
        amount_zscore = 0.0 if abs(amount - user_avg) < 1e-9 else 3.0 * (1.0 if amount > user_avg else -1.0)
    else:
        amount_zscore = HISTORY_DEFAULTS["amount_zscore"]

    hours_since_last = HISTORY_DEFAULTS["hours_since_last_txn"]
    last_dt = profile.get("last_datetime")
    if last_dt is not None:
        delta_hours = (dt - last_dt).total_seconds() / 3600.0
        hours_since_last = float(np.clip(delta_hours, 0.0, 24 * 30))

    merchant_norm = (merchant or "").strip().lower()
    location_norm = (location or "").strip().lower()
    category_norm = (merchant_category or "").strip().lower()

    merchants = set(profile.get("merchants") or [])
    locations = set(profile.get("locations") or [])
    categories = set(profile.get("categories") or [])

    features: dict[str, float | str] = {
        "amount": amount,
        "log_amount": _safe_log1p(amount),
        "transaction_hour": int(dt.hour),
        "transaction_day": int(dt.day),
        "day_of_week": int(dt.weekday()),
        "is_weekend": 1 if dt.weekday() >= 5 else 0,
        "is_night": 1 if (dt.hour >= 22 or dt.hour < 5) else 0,
        "amount_vs_user_avg": float(np.clip(amount_vs_avg, 0, 100)),
        "amount_vs_user_max": float(np.clip(amount_vs_max, 0, 100)),
        "amount_zscore": float(np.clip(amount_zscore, -20, 50)),
        "txn_count_1h": int(txn_count_1h),
        "txn_count_24h": int(txn_count_24h),
        "hours_since_last_txn": hours_since_last,
        "merchant_frequency": float(sum(1 for m in merchants if m == merchant_norm)),
        "merchant_seen_before": 1 if merchant_norm and merchant_norm in merchants else 0,
        "location_frequency": float(sum(1 for loc in locations if loc == location_norm)),
        "location_seen_before": 1 if location_norm and location_norm in locations else 0,
        "category_frequency": float(sum(1 for c in categories if c == category_norm)),
        "category_seen_before": 1 if category_norm and category_norm in categories else 0,
        "user_txn_count": user_count,
        "merchant_category": merchant_category or "Other",
        "payment_method": payment_method or "UPI",
        "location": location or "Unknown",
        "device_type": device_type or "unknown",
    }
    return features


def features_to_frame(rows: list[dict[str, Any]]) -> pd.DataFrame:
    """Convert feature dicts to a DataFrame with canonical column order."""
    frame = pd.DataFrame(rows)
    for col in FEATURE_NAMES:
        if col not in frame.columns:
            frame[col] = 1.0 if col in HISTORY_DEFAULTS else ("Unknown" if col in CATEGORICAL_FEATURES else 0)
    return frame[FEATURE_NAMES]


def velocity_counts(history_datetimes: list[datetime], reference: datetime) -> tuple[int, int]:
    """Count transactions in the last 1 hour / 24 hours before `reference`."""
    c1h = sum(1 for dt in history_datetimes if 0 <= (reference - dt).total_seconds() <= 3600)
    c24h = sum(1 for dt in history_datetimes if 0 <= (reference - dt).total_seconds() <= 86400)
    return c1h, c24h
