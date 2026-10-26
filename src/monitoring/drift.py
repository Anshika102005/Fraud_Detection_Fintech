"""Data-drift detection: PSI, KS, Jensen-Shannon + drift reports.

The reference distribution comes from the model bundle (training-time quantile
bins). Because bins are TRAINING quantiles, the expected per-bin frequency is
uniform — PSI compares the live window against that uniform expectation.
Thresholds (blueprint §9): PSI > 0.25 investigate, PSI > 0.5 page.
"""
from __future__ import annotations

from datetime import UTC, datetime

import numpy as np
import pandas as pd
from scipy import stats as sps


def psi_from_edges(edges: list[float], actual: np.ndarray,
                   expected_prop: np.ndarray | None = None) -> float:
    a = actual[np.isfinite(actual)]
    if len(a) < 50 or len(edges) < 3:
        return float("nan")
    e = np.asarray(edges, float).copy()
    e[0], e[-1] = -np.inf, np.inf
    bins = np.histogram(a, e)[0] / len(a)
    pe = np.clip(expected_prop if expected_prop is not None
                 else np.full(len(bins), 1.0 / len(bins)), 1e-6, None)
    pa = np.clip(bins, 1e-6, None)
    return float(np.sum((pa - pe) * np.log(pa / pe)))


def ks_statistic(expected: np.ndarray, actual: np.ndarray) -> float:
    e = expected[np.isfinite(expected)]
    a = actual[np.isfinite(actual)]
    if len(e) < 50 or len(a) < 50:
        return float("nan")
    return float(sps.ks_2samp(e, a).statistic)


def jensen_shannon(expected: np.ndarray, actual: np.ndarray, bins: int = 20) -> float:
    e = expected[np.isfinite(expected)]
    a = actual[np.isfinite(actual)]
    if len(e) < 50 or len(a) < 50:
        return float("nan")
    lo, hi = min(e.min(), a.min()), max(e.max(), a.max())
    if hi == lo:
        return 0.0
    pe = np.histogram(e, bins=bins, range=(lo, hi))[0] / len(e)
    pa = np.histogram(a, bins=bins, range=(lo, hi))[0] / len(a)
    return _jsd(pe, pa)


def _jsd(p: np.ndarray, q: np.ndarray) -> float:
    m = 0.5 * (p + q)
    return float(0.5 * sps.entropy(p + 1e-12, m + 1e-12, base=2)
                 + 0.5 * sps.entropy(q + 1e-12, m + 1e-12, base=2))


def categorical_psi(expected_counts: dict, actual_counts: dict) -> float:
    """PSI over categorical proportions with Laplace smoothing."""
    keys = set(expected_counts) | set(actual_counts)
    if not keys:
        return float("nan")
    n_e = max(1, sum(expected_counts.values()))
    n_a = max(1, sum(actual_counts.values()))
    pe = np.array([(expected_counts.get(k, 0) + 1) / (n_e + len(keys)) for k in keys])
    pa = np.array([(actual_counts.get(k, 0) + 1) / (n_a + len(keys)) for k in keys])
    pe, pa = np.clip(pe, 1e-6, None), np.clip(pa, 1e-6, None)
    return float(np.sum((pa - pe) * np.log(pa / pe)))


class DriftMonitor:
    """Compares a live window of scored transactions against training reference."""

    INVESTIGATE, PAGE = 0.25, 0.50

    def __init__(self, reference_stats: dict):
        self.reference = reference_stats

    def report(self, current: pd.DataFrame,
               features: list[str] | None = None) -> dict:
        features = features or list(self.reference.keys())
        out, page, investigate = {}, [], []
        for feat in features:
            ref = self.reference.get(feat)
            if ref is None or feat not in current.columns:
                continue
            vals = current[feat].astype(float).to_numpy()
            score = psi_from_edges(ref["quantiles"], vals)
            shift = 0.0
            m = np.nanmean(vals) if np.isfinite(vals).any() else np.nan
            if np.isfinite(m) and ref["std"]:
                shift = float((m - ref["mean"]) / ref["std"])
            status = "ok"
            if np.isfinite(score):
                if score > self.PAGE:
                    status = "page"
                    page.append(feat)
                elif score > self.INVESTIGATE:
                    status = "investigate"
                    investigate.append(feat)
            out[feat] = {"psi": None if not np.isfinite(score) else round(score, 4),
                         "mean_shift_std": None if not np.isfinite(shift) else round(shift, 3),
                         "status": status}
        return {
            "generated_at": datetime.now(UTC).isoformat(),
            "window_rows": int(len(current)),
            "features": out,
            "summary": {"page": page, "investigate": investigate,
                        "ok": len(out) - len(page) - len(investigate)},
            "verdict": "RETRAIN" if page else ("INVESTIGATE" if investigate else "OK"),
        }

if __name__ == "__main__":  # pragma: no cover
    import argparse
    import json
    from pathlib import Path

    import joblib
    import pandas as pd

    from src.config import get_settings

    p = argparse.ArgumentParser(description="Run drift report over prediction logs")
    p.add_argument("--log", default=str(get_settings().prediction_log_path))
    p.add_argument("--bundle", default="artifacts/model_bundle.joblib")
    p.add_argument("--out", default="reports/drift_report.json")
    p.add_argument("--limit", type=int, default=20000)
    args = p.parse_args()

    bundle = joblib.load(args.bundle)
    logs = []
    with open(args.log, encoding="utf-8") as f:
        for line in f.readlines()[-args.limit:]:
            try:
                logs.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    if not logs:
        raise SystemExit("no prediction logs found; score some transactions first")
    feats = pd.DataFrame([rec.get("features", {}) for rec in logs])
    report = DriftMonitor(bundle["reference_stats"]).report(feats)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(json.dumps(report["summary"], indent=2))
    print(f"verdict: {report['verdict']} -> {args.out}")

