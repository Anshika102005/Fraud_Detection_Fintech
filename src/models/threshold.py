"""Business-cost threshold optimization and risk-band policy.

Fraud is a cost-sensitive DECISION problem: the operating threshold trades
missed fraud (FN cost: chargebacks, fees, brand damage) against customer
friction (FP cost: blocked good customers, churn, analyst review capacity).
0.5 is never assumed — the threshold is optimized on validation data.
"""
from __future__ import annotations

import numpy as np
from sklearn.metrics import precision_recall_curve


def total_cost(y_true, proba, threshold: float, fn_cost: float, fp_cost: float) -> float:
    y = np.asarray(y_true).astype(int)
    pred = (np.asarray(proba) >= threshold).astype(int)
    fn = int(((y == 1) & (pred == 0)).sum())
    fp = int(((y == 0) & (pred == 1)).sum())
    return fn * fn_cost + fp * fp_cost


def optimize_threshold(y_true, proba, fn_cost: float = 100.0, fp_cost: float = 5.0,
                       grid_size: int = 500) -> dict:
    """Grid over candidate thresholds (PR-curve thresholds + linear grid),
    minimizing expected business cost per transaction."""
    y = np.asarray(y_true).astype(int)
    p = np.asarray(proba, dtype=float)
    _, _, pr_thresholds = precision_recall_curve(y, p)
    candidates = np.unique(np.concatenate([
        pr_thresholds, np.linspace(0.01, 0.99, grid_size),
    ]))
    n = len(y)
    best_t, best_cost = 0.5, float("inf")
    for t in candidates:
        cost = total_cost(y, p, float(t), fn_cost, fp_cost) / n
        if cost < best_cost:
            best_cost, best_t = cost, float(t)
    return {
        "threshold": best_t,
        "cost_per_txn": best_cost,
        "total_cost": best_cost * n,
        "fn_cost": fn_cost,
        "fp_cost": fp_cost,
    }


class RiskPolicy:
    """Maps fraud probability -> (risk_level, decision) via configurable bands."""

    def __init__(self, bands: list[dict]):
        # bands: [{"name": LOW, "max_p": 0.30, "decision": APPROVE}, ...]
        self.bands = sorted(bands, key=lambda b: b["max_p"])

    @classmethod
    def from_config(cls, policy_cfg: dict) -> RiskPolicy:
        return cls(policy_cfg["bands"])

    def evaluate(self, prob: float) -> tuple[str, str]:
        for band in self.bands:
            if prob <= band["max_p"]:
                return band["name"], band["decision"]
        last = self.bands[-1]
        return last["name"], last["decision"]

    def to_dict(self) -> list[dict]:
        return [dict(b) for b in self.bands]
