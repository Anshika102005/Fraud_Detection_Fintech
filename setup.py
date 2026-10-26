# =============================================================================
# Fraud Detection Fintech — Setup Script
# Usage:
#   1. Copy .env.example → .env  (edit .env with your values)
#   2. python setup.py install       (create venv + install requirements)
#   3. python setup.py db-up         (start Postgres + Redis + MLflow via Docker)
#   4. python setup.py migrate       (create PostgreSQL schema)
#   5. python setup.py seed          (generate synthetic dataset)
#   6. python setup.py train         (train the model → model_bundle.joblib)
#   7. python setup.py api           (start the FastAPI server on :8000)
#   8. python setup.py test          (run the full test suite)
#   9. python setup.py compose-up    (start full stack: api, postgres, redis, mlflow, trainer, prometheus, grafana)
# =============================================================================

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV = ROOT / ".venv"
REQ = ROOT / "requirements.txt"
ENV_TEMPLATE = ROOT / ".env.example"
ENV_FILE = ROOT / ".env"


def run(cmd, desc=None):
    if desc:
        print(f"\n{'='*60}\n  {desc}\n{'='*60}")
    result = subprocess.run(cmd, cwd=ROOT, shell=True)
    if result.returncode != 0:
        print(f"\n  ❌ FAILED: {' '.join(cmd)}\n")
        sys.exit(result.returncode)
    return result


def activate_venv():
    """Return the path to the Python executable in the virtualenv."""
    py = VENV / "Scripts" / "python"
    if not py.exists():
        run(f"{sys.executable} -m venv {VENV}", "Creating virtual environment...")
    return str(py)


def main():
    parser = argparse.ArgumentParser(description="Fraud Detection Fintech setup")
    sub = parser.add_subparsers(dest="command", required=True)

    p_install = sub.add_parser("install", help="Create venv and install requirements")
    p_install.set_defaults(func=lambda a: run(f"{activate_venv()} -m pip install --upgrade pip", "Upgrading pip"), )

    sub.add_parser("db-up", help="Start Postgres + Redis + MLflow via Docker")
    sub.add_parser("migrate", help="Create PostgreSQL schema")
    sub.add_parser("seed", help="Generate synthetic dataset (2000 cards, 90 days)")
    sub.add_parser("train", help="Train the model → artifacts/model_bundle.joblib")
    sub.add_parser("api", help="Start the FastAPI server on :8000")
    sub.add_parser("test", help="Run the full test suite (35 tests)")
    sub.add_parser("compose-up", help="Start full Docker Compose stack")
    sub.add_parser("compose-down", help="Tear down the Docker Compose stack")

    args = parser.parse_args()

    # Load .env if it exists
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

    if args.command == "install":
        run(f"{activate_venv()} -m pip install --upgrade pip", "Installing requirements...")
        run(f"{activate_venv()} -m pip install -r {REQ}", "Installing dependencies...")
        print("\n✅ Setup complete. Run 'python setup.py <command>' to start.")
    else:
        run("@{}\n{}".format(
            "SET PYTHONPATH=." if os.name == "nt" else "export PYTHONPATH=.",
            "echo"
        ), "Running command...")
        # Pass through arguments to the appropriate Make target
        run(f"make {args.command}")


if __name__ == "__main__":
    main()
