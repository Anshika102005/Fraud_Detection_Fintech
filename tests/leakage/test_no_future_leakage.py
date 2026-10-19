"""THE critical tests: no future information may ever reach a feature row."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from src.config import load_model_config
from src.features import registry as reg
from src.features.builder import build_features

FEATURES = reg.all_feature_names()


def make_frame(n: int = 7, amounts: list[float] | None = None,
               fraud_labels: list[int] | None = None) -> pd.DataFrame:
    """One customer, n sequential txns, deterministic values."""
    amounts = amounts or [100.0 * (i + 1) for i in range(n)]
    fraud_labels = fraud_labels or [0] * n
    base_ts = pd.Timestamp("2024-05-01 12:00:00")
    rows = []
    for i in range(n):
        rows.append({
            "transaction_id": f"t{i}", "customer_id": "c0", "card_id": "card0",
            "merchant_id": "m0" if i % 2 == 0 else "m1", "mcc": 5411,
            "merchant_category": "grocery", "merchant_country": "US",
            "merchant_city": "chicago", "merchant_risk_score": 0.1,
            "txn_ts": base_ts + pd.Timedelta(minutes=10 * i),
            "amount": amounts[i], "currency": "USD", "channel": "pos",
            "status": "approved", "transaction_country": "US",
            "transaction_city": "chicago",
            "latitude": 41.9, "longitude": -87.6,
            "home_latitude": 41.9, "home_longitude": -87.6,
            "device_id": "d0", "device_type": "mobile", "operating_system": "ios",
            "ip_address": "10.0.0.1", "ip_risk_score": 0.1,
            "device_age_days": 100.0, "authentication_method": "chip_pin",
            "cvv_result": "match", "pin_verified": False,
            "threeds_result": "not_applicable", "biometric_verified": False,
            "failed_auth_attempts": 0, "account_age_days": 500,
            "is_fraud": fraud_labels[i],
            "label_ts": base_ts + pd.Timedelta(days=5),
        })
    return pd.DataFrame(rows)


@pytest.fixture(scope="module")
def cfg():
    return load_model_config()


def _feat_row(df, cfg, i):
    feats = build_features(df, cfg)
    return feats.iloc[i]


def test_velocity_counts_exclude_current(cfg):
    # 7 txns 10 minutes apart: count within last hour at row i == i (for i<=6)
    feats = build_features(make_frame(7), cfg)
    counts = feats["customer_txn_count_1h"].to_numpy()
    assert np.allclose(counts, [0, 1, 2, 3, 4, 5, 6])


def test_expanding_mean_excludes_current(cfg):
    feats = build_features(make_frame(5, amounts=[100, 200, 300, 400, 500]), cfg)
    means = feats["customer_amount_mean_hist"].to_numpy()
    assert np.isnan(means[0])
    assert np.isclose(means[1], 100)
    assert np.isclose(means[4], np.mean([100, 200, 300, 400]))  # excludes 500


def test_merchant_fraud_rate_uses_past_labels_only(cfg):
    # rows 0..3 alternate merchants m0,m1,m0,m1; make row 0 (m0) fraudulent
    labels = [1, 0, 0, 0]
    feats = build_features(make_frame(4, fraud_labels=labels), cfg)
    prior, strength = 0.02, 100.0
    # row 2 is the second m0 txn: sees only row 0 (1 fraud / 1 txn)
    expected = (1 + prior * strength) / (1 + strength)
    assert np.isclose(feats["merchant_fraud_rate_hist"].iloc[2], expected)
    # row 0 is the FIRST m0 txn: no history -> pure prior
    assert np.isclose(feats["merchant_fraud_rate_hist"].iloc[0], prior)


def test_time_since_prev_and_rapid_repeat(cfg):
    feats = build_features(make_frame(3), cfg)
    assert np.isclose(feats["time_since_prev_txn_sec"].iloc[2], 600.0)  # 10 min
    assert feats["rapid_repeat_txn_flag"].iloc[2] == 0.0


def test_future_edits_do_not_change_earlier_features(cfg):
    """The strongest guard: mutate ALL rows AFTER row 2; row 2's features must
    be bit-identical (NaN == NaN counts as equal)."""
    df1 = make_frame(7, fraud_labels=[0, 0, 0, 0, 0, 0, 0])
    df2 = df1.copy()
    df2.loc[df2.index[3:], "amount"] = 99999.0          # future amounts changed
    df2.loc[df2.index[3:], "is_fraud"] = 1              # future labels changed
    df2.loc[df2.index[3:], "merchant_id"] = "mX"        # future entities changed
    df2.loc[df2.index[3:], "device_id"] = "dX"
    df2.loc[df2.index[3:], "transaction_country"] = "GB"

    f1 = build_features(df1, cfg)
    f2 = build_features(df2, cfg)
    r1, r2 = f1.iloc[2], f2.iloc[2]
    differing = []
    for col in FEATURES:
        a, b = r1[col], r2[col]
        a_nan, b_nan = (isinstance(a, float) and np.isnan(a)), \
                       (isinstance(b, float) and np.isnan(b))
        if a_nan and b_nan:
            continue
        if a_nan != b_nan or (not a_nan and not np.isclose(a, b, rtol=1e-9)):
            differing.append(col)
    assert not differing, f"future data leaked into row 2 via: {differing}"


def test_labels_arriving_later_do_not_change_earlier_rows(cfg):
    df1 = make_frame(5, fraud_labels=[0, 0, 0, 1, 1])
    df2 = make_frame(5, fraud_labels=[0, 0, 0, 0, 0])
    f1, f2 = build_features(df1, cfg), build_features(df2, cfg)
    for col in ("merchant_fraud_rate_hist", "mcc_fraud_rate_hist",
                "merchant_id_woe"):
        for i in (0, 1):
            a, b = f1[col].iloc[i], f2[col].iloc[i]
            if pd.isna(a) and pd.isna(b):
                continue
            assert np.isclose(a, b), f"label leakage into row {i}, {col}"
