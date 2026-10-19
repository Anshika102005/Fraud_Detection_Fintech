"""Retraining triggers: measurable conditions, not arbitrary schedules.

Fires when (a) data drift breaches PSI thresholds, or (b) label-backed
performance (from backfilled chargebacks) degrades beyond the promotion gates.
Every retrain still has to pass the promotion gates before going live.
"""
from __future__ import annotations


def evaluate_retrain_triggers(drift_report: dict,
                              current_metrics: dict | None = None,
                              gates: dict | None = None) -> tuple[bool, list[str]]:
    triggers: list[str] = []
    summary = drift_report.get("summary", {})
    if summary.get("page"):
        triggers.append(f"PSI>0.50 on features: {sorted(summary['page'])}")
    if len(summary.get("investigate", [])) >= 2:
        triggers.append(f"PSI>0.25 on {len(summary['investigate'])} features: "
                        f"{sorted(summary['investigate'])}")
import numpy as np


def _finite(x) -> bool:
    try:
        return bool(np.isfinite(x))
    except (TypeError, ValueError):
        return False


def evaluate_retrain_triggers(drift_report: dict,
                              current_metrics: dict | None = None,
                              gates: dict | None = None) -> tuple[bool, list[str]]:
    triggers: list[str] = []
    summary = drift_report.get("summary", {})
    if summary.get("page"):
        triggers.append(f"PSI>0.50 on features: {sorted(summary['page'])}")
    if len(summary.get("investigate", [])) >= 2:
        triggers.append(f"PSI>0.25 on {len(summary['investigate'])} features: "
                        f"{sorted(summary['investigate'])}")
    if current_metrics and gates:
        pr = current_metrics.get("pr_auc")
        if pr is not None and gates.get("pr_auc_min") is not None and pr < gates["pr_auc_min"]:
            triggers.append(f"PR-AUC {pr:.3f} < gate {gates['pr_auc_min']}")
        fnr = current_metrics.get("fnr")
        if fnr is not None and gates.get("fnr_max") is not None and fnr > gates["fnr_max"]:
            triggers.append(f"FNR {fnr:.3f} > gate {gates['fnr_max']}")
        p90 = current_metrics.get("precision_at_recall_90")
        if (p90 is not None and _finite(p90)
                and gates.get("precision_at_recall90_min") is not None
                and p90 < gates["precision_at_recall90_min"]):
            triggers.append(f"P@90%R {p90:.3f} < gate {gates['precision_at_recall90_min']}")
    return bool(triggers), triggers

