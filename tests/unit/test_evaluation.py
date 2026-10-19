"""Fraud-specific evaluation metrics: correctness of operating-point metrics."""
from __future__ import annotations

import numpy as np

from src.models.evaluate import evaluate_fraud, precision_at_k, recall_at_k


def test_perfect_ranking_metrics():
    y = np.array([0, 0, 0, 0, 1, 1, 1, 1])
    p = np.array([0.1, 0.2, 0.3, 0.4, 0.7, 0.8, 0.9, 0.95])
    m = evaluate_fraud(y, p, threshold=0.5)
    assert m["roc_auc"] == 1.0
    assert m["pr_auc"] == 1.0
    assert m["fnr"] == 0.0
    assert m["fpr"] == 0.0
    assert m["confusion"]["tp"] == 4


def test_recall_at_k_captures_top_ranked():
    y = np.array([1, 0, 1, 0, 0, 1, 0, 0, 0, 0])
    p = np.array([0.9, 0.85, 0.8, 0.1, 0.1, 0.7, 0.1, 0.1, 0.1, 0.1])
    # top 30% = 3 rows -> frauds at positions 1,3,6 -> 2 captured of 3
    assert np.isclose(recall_at_k(y, p, 0.3), 2 / 3)
    # top 10% = 1 row -> 1 fraud / 3
    assert np.isclose(recall_at_k(y, p, 0.1), 1 / 3)
    assert np.isclose(precision_at_k(y, p, 0.1), 1.0)


def test_ks_statistic_detects_separation():
    y = np.array([0] * 50 + [1] * 50)
    p = np.r_[np.linspace(0.0, 0.4, 50), np.linspace(0.6, 1.0, 50)]
    m = evaluate_fraud(y, p, threshold=0.5)
    assert m["ks_statistic"] == 1.0


def test_precision_at_recall_floor_is_achievable_precision():
    y = np.array([0, 0, 0, 1])
    p = np.array([0.9, 0.8, 0.7, 0.1])
    from src.models.evaluate import precision_at_recall
    # recall 1.0 is reachable at the lowest threshold -> precision there is 0.25
    assert np.isclose(precision_at_recall(y, p, 0.9), 0.25)
