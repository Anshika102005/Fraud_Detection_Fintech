"""Temporal / cyclical features (pure per-row; no leakage surface)."""
from __future__ import annotations

import numpy as np
import pandas as pd

NIGHT_START, NIGHT_END = 23, 6
BUSINESS_START, BUSINESS_END = 9, 18


def add_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    ts = df["txn_ts"]
    hour = ts.dt.hour
    dow = ts.dt.dayofweek

    df["transaction_hour"] = hour
    df["transaction_dow"] = dow
    df["transaction_month"] = ts.dt.month
    df["is_weekend"] = (dow >= 5).astype(int)
    df["is_night"] = ((hour >= NIGHT_START) | (hour < NIGHT_END)).astype(int)
    df["is_business_hour"] = ((hour >= BUSINESS_START) & (hour < BUSINESS_END)
                              & (dow < 5)).astype(int)
    df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24)
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7)
    return df


def circular_hour_diff(a: float, b: float) -> float:
    """Absolute circular distance between two hours in [0, 12]."""
    return abs(((a - b + 12) % 24) - 12)
