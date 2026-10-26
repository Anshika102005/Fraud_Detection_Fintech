"""Model Registry promotion gates: candidate -> production.

Usage:
  python -m mlops.promote --version 12           # evaluate & promote if gates pass
  python -m mlops.promote --version 12 --dry-run # report only

Gates (configs/model.yaml -> gates) are fraud-specific:
  holdout PR-AUC >= pr_auc_min, FNR <= fnr_max, P@90% recall >= business floor.
Exit code 1 on failure -> CI blocks deployment.
"""
from __future__ import annotations

import argparse
import sys

from src.config import load_model_config


def main() -> int:
    p = argparse.ArgumentParser(description="Promotion gate for model registry")
    p.add_argument("--model-name", default=None)
    p.add_argument("--tracking-uri", default=None)
    p.add_argument("--version", required=True)
    p.add_argument("--alias", default="production", choices=["staging", "production"])
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    import mlflow
    from mlflow.tracking import MlflowClient

    from src.config import get_settings

    s = get_settings()
    name = args.model_name or s.model_registry_name
    mlflow.set_tracking_uri(args.tracking_uri or s.mlflow_tracking_uri)
    client = MlflowClient()
    mv = client.get_model_version(name, args.version)
    run = client.get_run(mv.run_id)
    m = run.data.metrics
    gates = load_model_config()["gates"]

    checks = {
        "holdout_pr_auc": (m.get("holdout_pr_auc"), ">=", gates["pr_auc_min"]),
        "holdout_fnr": (m.get("holdout_fnr"), "<=", gates["fnr_max"]),
        "holdout_precision_at_recall_90": (
            m.get("holdout_precision_at_recall_90"), ">=",
            gates["precision_at_recall90_min"]),
    }
    failures = []
    for metric, (value, op, gate) in checks.items():
        if value is None:
            failures.append(f"{metric} missing from run {mv.run_id}")
            continue
        ok = value >= gate if op == ">=" else value <= gate
        print(f"  {metric}: {value:.4f} {op} {gate:.4f} -> {'PASS' if ok else 'FAIL'}")
        if not ok:
            failures.append(f"{metric}={value:.4f} ({op} {gate})")

    if failures:
        print(f"PROMOTION REJECTED for {name} v{args.version}: {failures}")
        return 1
    if args.dry_run:
        print(f"DRY-RUN: gates passed for {name} v{args.version} (alias unchanged)")
        return 0
    client.set_registered_model_alias(name, args.alias, args.version)
    print(f"PROMOTED {name} v{args.version} -> alias '{args.alias}'")
    return 0


if __name__ == "__main__":
    sys.exit(main())
