"""Offline point-in-time feature builder.

Orchestrates temporal -> velocity -> behavioral -> historical encodings.
Run on a raw transactions frame; returns one row per transaction with exactly
`registry.all_feature_names()` model columns (asserted).

LEAKAGE GUARANTEES (see tests/leakage):
  - expanding stats: shift(1) within (customer, time)  -> excludes current row
  - rolling windows: closed='left'                     -> (t-w, t) open at t
  - trailing distinct: strict '<' sweep                -> excludes current row
  - merchant/MCC fraud rates: past labels only (expanding sum, shift(1))
  - historical WOE: expanding per-key, shift(1)
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from src.features import registry as reg
from src.features.behavioral import add_behavioral_features
from src.features.encoders import HistoricalEncoder
from src.features.temporal import add_temporal_features
from src.features.velocity import TS, add_velocity_features

ENCODER_COLS = ["merchant_id", "mcc", "merchant_category", "channel",
                "device_type", "transaction_country"]


def sort_transactions(df: pd.DataFrame, history_key: str) -> pd.DataFrame:
    """Canonical ordering for feature computation: (customer, time, id)."""
    out = df.copy().reset_index(drop=True)
    out[TS] = pd.to_datetime(out[TS])
    if out[TS].dt.tz is not None:
        out[TS] = out[TS].dt.tz_localize(None)
    return out.sort_values([history_key, TS, "transaction_id"],
                           kind="mergesort").reset_index(drop=True)


def build_features(df: pd.DataFrame, cfg: dict,
                   label_col: str = reg.LABEL) -> pd.DataFrame:
    key = cfg["data"]["history_key"]
    out = sort_transactions(df, key)
    out["log_amount"] = np.log(out["amount"].clip(lower=1e-3))

    add_temporal_features(out)
    add_velocity_features(out, key, cfg["velocity_windows_minutes"],
                          cfg["distinct_windows_minutes"])
    add_behavioral_features(out, key, cfg.get("merchant_smoothing", {}))

    if label_col in out.columns:
        # Prior = configured global fraud-rate constant (merchant_smoothing) —
        # NOT data-derived, so no row's encoding depends on future labels.
        for col in ENCODER_COLS:
            for kind in ("woe", "freq"):
                enc = HistoricalEncoder(
                    col,
                    prior_rate=float(cfg.get("merchant_smoothing", {})
                                     .get("prior_rate", 0.02)),
                    strength=float(cfg.get("woe_smoothing", 50)),
                    kind=kind)
                encoded = enc.fit_transform(out, label_col, ts_col=TS)
                out[encoded.columns[0]] = encoded[encoded.columns[0]].astype(float)
    else:
        # scoring path without labels: encodings are supplied online by the
        # serving plane; placeholders keep the column contract intact
        for col in ENCODER_COLS:
            out[f"{col}_woe"] = 0.0
            out[f"{col}_freq"] = 0.0

    missing = [f for f in reg.all_feature_names() if f not in out.columns]
    if missing:
        raise RuntimeError(f"feature builder missing columns: {missing}")
    return out.copy()  # defragment after ~110 column inserts


def build_dataset(df: pd.DataFrame, cfg: dict) -> tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    """Returns (X, y, full_frame_with_metadata)."""
    feats = build_features(df, cfg)
    X = feats[reg.all_feature_names()].astype(float)
    y = feats[reg.LABEL].astype(int)
    return X, y, feats
