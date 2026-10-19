"""Shared fixtures: tiny trained bundle + config for fast, isolated tests."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from src.config import load_model_config, load_risk_policy
from src.data.generate_synthetic import generate
from src.features.builder import build_dataset
from src.models.threshold import RiskPolicy


@pytest.fixture(scope="session")
def cfg() -> dict:
    return load_model_config()


@pytest.fixture(scope="session")
def policy() -> RiskPolicy:
    return RiskPolicy.from_config(load_risk_policy())


@pytest.fixture(scope="session")
def mini_df() -> pd.DataFrame:
    return generate(n_customers=30, n_merchants=25, days=21, fraud_rate=0.04, seed=11)


@pytest.fixture(scope="session")
def mini_trained(mini_df, cfg, policy) -> dict:
    """Tiny end-to-end model bundle (LightGBM) for API/serving tests."""
    from src.models.train import final_holdout_indices, fit_final

    X, y, feats = build_dataset(mini_df, cfg)
    hold = final_holdout_indices(feats, 0.25)
    tr = np.setdiff1d(np.arange(len(y)), hold)
    spw = scale_pos_weight_local(y.iloc[tr].to_numpy())
    params = {**cfg["lightgbm"]["base"], "n_estimators": 60}
    model = fit_final(X, y, feats, tr, "lightgbm", params, spw)
    proba = model.predict_proba(X.iloc[hold])[:, 1]
    if not np.isfinite(proba).all():
        pytest.skip("tiny model produced degenerate probabilities")
    return {
        "model": model,
        "model_type": "lightgbm",
        "feature_names": list(X.columns),
        "threshold": 0.30,
        "risk_policy": policy.to_dict(),
        "cost_model": cfg["cost_model"],
        "metrics": {"holdout": {}},
        "params": {},
        "reference_stats": {},
        "global_importance": [],
        "encoder_cfg": {
            name: {"global_prior": enc.global_prior, "prior_rate": enc.prior_rate,
                   "strength": enc.strength, "kind": enc.kind}
            for name, enc in getattr(feats, "attrs", {}).get("encoders", {}).items()
        },
        "merchant_smoothing": cfg["merchant_smoothing"],
        "woe_smoothing": cfg["woe_smoothing"],
        "metadata": {"trained_at": "2025-01-01T00:00:00+00:00", "n_rows": int(len(y)),
                     "fraud_rate": float(y.mean()),
                     "data_start": str(feats["txn_ts"].min()),
                     "data_end": str(feats["txn_ts"].max())},
    }


def scale_pos_weight_local(y: np.ndarray, cap: float = 30.0) -> float:
    pos = max(1, int(y.sum()))
    return float(min((len(y) - pos) / pos, cap))
