"""Apply SQL migrations in order: `python -m src.data.migrate`."""
from __future__ import annotations

import argparse
from pathlib import Path

from src.config import get_settings
from src.data.db import apply_sql_file, get_engine

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser(description="Run SQL migrations")
    parser.add_argument("--database-url", default=None)
    args = parser.parse_args()

    url = args.database_url or get_settings().database_url
    if not url:
        raise SystemExit("DATABASE_URL not set. Start the compose stack or pass --database-url.")
    engine = get_engine(url)
    migrations = sorted((ROOT / "sql" / "migrations").glob("*.sql"))
    for m in migrations:
        print(f"applying {m.name} ...")
        apply_sql_file(engine, str(m))
    print(f"done: {len(migrations)} migrations applied.")


if __name__ == "__main__":
    main()
