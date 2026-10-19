"""Training-serving consistency: online computer must mirror the offline builder.

This is the test that kills training-serving skew: the same transaction
sequence is (a) run through the offline point-in-time builder and (b) replayed
one-transaction-at-a-time through the ONLINE feature computer (with labels
backfilled row-by-row, exactly like the production batch refresh). The feature
vectors must agree row-by-row.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from src.config import load_model_config
from src.features import registry as reg
from src.features.builder import build_features
from src.features.online import InMemoryKV, OnlineFeatureComputer

FEATURES = reg.all_feature_names()
# Features whose online value legitimately depends on batch-maintained state
# that the test replays exactly (no exceptions today); kept for documentation.
TOLERANCE_FEATURES: dict[str, float] = {}


def _replay_online(df: pd.DataFrame, encoder_cfg: dict, cfg: dict) -> pd.DataFrame:
    """Replay transactions in GLOBAL chronological order — exactly how the
    production API receives traffic (per-customer state is order-independent,
    but global merchant/device/IP counters are not)."""
    kv = InMemoryKV()
    comp = OnlineFeatureComputer(kv, encoder_cfg=encoder_cfg,
                                 woe_smoothing=cfg["woe_smoothing"],
                                 merchant_smoothing=cfg["merchant_smoothing"])
    rows = []
    for rec in df.to_dict("records"):
        feats = comp.compute(rec)          # computes from PAST state, then commits
        comp.record_label(rec)             # label feedback (batch-refresh analogue)
        rows.append(feats)
    return pd.DataFrame(rows, index=df["transaction_id"].to_numpy())


def test_online_matches_offline_row_by_row():
    from src.data.generate_synthetic import generate

    cfg = load_model_config()
    df = generate(n_customers=12, n_merchants=15, days=10, fraud_rate=0.05, seed=3)
    df_chrono = df.sort_values("txn_ts", kind="mergesort").reset_index(drop=True)
    offline = build_features(df_chrono, cfg).set_index("transaction_id")
    encoder_cfg = {
        name: {"global_prior": enc.global_prior, "prior_rate": enc.prior_rate,
               "strength": enc.strength, "kind": enc.kind}
        for name, enc in getattr(offline, "attrs", {}).get("encoders", {}).items()
    }
    online = _replay_online(df_chrono, encoder_cfg, cfg).loc[offline.index]

    bad: list[str] = []
    for col in FEATURES:
        a = offline[col].astype(float).to_numpy()
        b = online[col].astype(float).to_numpy()
        both_nan = np.isnan(a) & np.isnan(b)
        close = np.where(np.isnan(a) | np.isnan(b), False,
                         np.isclose(a, b, rtol=1e-6, atol=1e-6))
        mismatch = int((~(close | both_nan)).sum())
        if mismatch > 0:
            bad.append(f"{col}: {mismatch}/{len(a)} rows differ "
                       f"(max |diff| {np.nanmax(np.abs(a - b)):.4g})")
    assert not bad, "training-serving skew detected:\n" + "\n".join(bad[:12])
