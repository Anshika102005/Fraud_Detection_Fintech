"""CI gate: assert the freshly trained model meets promotion gates.

python scripts/check_metrics.py --metrics artifacts/metrics.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

GATES = {
    "pr_auc": (">=", 0.50),
    "fnr": ("<=", 0.60),
}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--metrics", default="artifacts/metrics.json")
    args = p.parse_args()
    path = Path(args.metrics)
    if not path.exists():
        print(f"FAIL: metrics file missing: {path}")
        return 1
    data = json.loads(path.read_text(encoding="utf-8"))
    holdout = data.get("holdout", {})
    failures = []
    for metric, (op, gate) in GATES.items():
        value = holdout.get(metric)
        if value is None:
            failures.append(f"{metric} missing")
            continue
        ok = value >= gate if op == ">=" else value <= gate
        print(f"  {metric}: {value:.4f} {op} {gate:.4f} -> {'PASS' if ok else 'FAIL'}")
        if not ok:
            failures.append(metric)
    if failures:
        print(f"MODEL GATE FAILED: {failures}")
        return 1
    print("MODEL GATE PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
