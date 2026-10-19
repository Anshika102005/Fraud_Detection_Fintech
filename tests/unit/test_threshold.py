"""Business-cost threshold optimization: 0.5 is never assumed."""
from __future__ import annotations

import numpy as np

from src.models.threshold import optimize_threshold, total_cost


def _scenario():
    rng = np.random.default_rng(0)
    fraud = rng.normal(0.9, 0.03, 100).clip(0, 1)     # frauds score high
    legit = rng.normal(0.4, 0.08, 1000).clip(0, 1)    # legit mass below
    y = np.r_[np.ones(100, int), np.zeros(1000, int)]
    p = np.r_[fraud, legit]
    return y, p


def test_expensive_fn_drives_threshold_below_fraud_mass():
    y, p = _scenario()
    res = optimize_threshold(y, p, fn_cost=100.0, fp_cost=5.0)
    # FN cost >> FP cost -> accept some FPs, catch nearly all frauds
    assert 0.40 <= res["threshold"] <= 0.90
    assert res["cost_per_txn"] <= total_cost(y, p, 0.9, 100, 5) / len(y)


def test_expensive_fp_drives_threshold_above_fraud_mass():
    y, p = _scenario()
    res = optimize_threshold(y, p, fn_cost=10.0, fp_cost=100.0)
    # FP cost >> FN cost -> threshold sits above the legitimate mass:
    # zero false positives tolerated at the optimum, and never below 0.5.
    pred = (p >= res["threshold"]).astype(int)
    fp = int(((y == 0) & (pred == 1)).sum())
    assert res["threshold"] > 0.5
    assert fp == 0


def test_optimal_beats_default_half():
    y, p = _scenario()
    res = optimize_threshold(y, p, fn_cost=100.0, fp_cost=5.0)
    c_star = total_cost(y, p, res["threshold"], 100, 5)
    c_half = total_cost(y, p, 0.5, 100, 5)
    assert c_star <= c_half


def test_total_cost_math():
    y = np.array([1, 1, 0, 0, 0])
    p = np.array([0.2, 0.9, 0.8, 0.1, 0.3])
    # threshold 0.5: FN=1 (0.2), FP=1 (0.8) -> 1*100 + 1*5 = 105
    assert total_cost(y, p, 0.5, fn_cost=100, fp_cost=5) == 105
