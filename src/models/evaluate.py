"""Fraud-specific evaluation suite.

Primary metric: PR-AUC (average precision) — ROC-AUC is misleading under extreme
class imbalance (a 99%-accuracy all-negative model has perfect ROC-AUC). We also
report the operating-point metrics a fraud team actually runs on: precision at
fixed recall (analyst capacity), fraud capture in top-K% (review queue design),
and confusion-matrix counts that feed the business cost model.
"""
from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
)


def precision_at_recall(y_true, proba, target_recall: float) -> float:
    """Max precision achievable at >= target_recall (NaN if unreachable)."""
    precision, recall, _ = precision_recall_curve(y_true, proba)
    mask = recall >= target_recall
    return float(precision[mask].max()) if mask.any() else float("nan")


def precision_at_k(y_true, proba, k: float) -> float:
    """Precision within the top k fraction of scored transactions."""
    n = max(1, int(np.ceil(k * len(y_true))))
    idx = np.argsort(-proba)[:n]
    return float(np.asarray(y_true)[idx].mean())


def recall_at_k(y_true, proba, k: float) -> float:
    """Fraction of all frauds captured within the top k fraction of scores."""
    y = np.asarray(y_true)
    n = max(1, int(np.ceil(k * len(y))))
    idx = np.argsort(-proba)[:n]
    return float(y[idx].sum() / max(1, y.sum()))


def ks_statistic(y_true, proba) -> float:
    """Two-sample KS between fraud and legit score distributions."""
    p = np.asarray(proba)
    y = np.asarray(y_true)
    if y.sum() == 0 or y.sum() == len(y):
        return float("nan")
    a, b = np.sort(p[y == 1]), np.sort(p[y == 0])
    all_v = np.sort(np.concatenate([a, b]))
    cdf_a = np.searchsorted(a, all_v, side="right") / len(a)
    cdf_b = np.searchsorted(b, all_v, side="right") / len(b)
    return float(np.max(np.abs(cdf_a - cdf_b)))


def evaluate_fraud(y_true, proba, threshold: float | None = None) -> dict:
    y = np.asarray(y_true).astype(int)
    p = np.asarray(proba, dtype=float)
    pred = (p >= (threshold if threshold is not None else 0.5)).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()

    def _safe(n: float, d: float) -> float:
        return float(n / d) if d else float("nan")

    return {
        "roc_auc": float(roc_auc_score(y, p)) if y.sum() and (1 - y.sum()) else float("nan"),
        "pr_auc": float(average_precision_score(y, p)) if y.sum() else float("nan"),
        "precision": _safe(tp, tp + fp),
        "recall": _safe(tp, tp + fn),
        "f1": _safe(2 * tp, 2 * tp + fp + fn),
        "fpr": _safe(fp, fp + tn),
        "fnr": _safe(fn, fn + tp),
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "precision_at_recall_70": precision_at_recall(y, p, 0.70),
        "precision_at_recall_80": precision_at_recall(y, p, 0.80),
        "precision_at_recall_90": precision_at_recall(y, p, 0.90),
        "precision_at_k_1pct": precision_at_k(y, p, 0.01),
        "recall_at_k_1pct": recall_at_k(y, p, 0.01),
        "precision_at_k_5pct": precision_at_k(y, p, 0.05),
        "recall_at_k_5pct": recall_at_k(y, p, 0.05),
        "precision_at_k_10pct": precision_at_k(y, p, 0.10),
        "recall_at_k_10pct": recall_at_k(y, p, 0.10),
        "frauds_captured_top_1pct": recall_at_k(y, p, 0.01),
        "frauds_captured_top_5pct": recall_at_k(y, p, 0.05),
        "frauds_captured_top_10pct": recall_at_k(y, p, 0.10),
        "ks_statistic": ks_statistic(y, p),
    }
