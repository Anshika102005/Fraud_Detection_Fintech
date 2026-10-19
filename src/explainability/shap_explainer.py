"""SHAP explainability: global importance + local transaction explanations."""
from __future__ import annotations

import numpy as np
import pandas as pd


def _shap_values(model, model_type: str, X: pd.DataFrame) -> np.ndarray:
    import shap
    explainer = shap.TreeExplainer(model)
    sv = explainer.shap_values(X)
    if isinstance(sv, list):  # some wrappers return per-class lists
        sv = sv[-1]
    if sv.ndim == 3:  # (n, features, classes) -> fraud class
        sv = sv[:, :, -1]
    return np.asarray(sv)


def compute_global_importance(model, model_type: str, X_sample: pd.DataFrame,
                              top_n: int = 25) -> list[dict]:
    sv = _shap_values(model, model_type, X_sample)
    mean_abs = np.abs(sv).mean(axis=0)
    order = np.argsort(-mean_abs)[:top_n]
    return [{"feature": X_sample.columns[i], "mean_abs_shap": float(mean_abs[i])}
            for i in order]


def local_shap(model, model_type: str, x_row: pd.DataFrame) -> np.ndarray:
    """SHAP values for a single transaction (1-row DataFrame)."""
    return _shap_values(model, model_type, x_row)[0]
