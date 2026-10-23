"""Provision a fraud-analyst account (no default users exist in the system).

Customers self-register through the web app; analyst accounts are created
explicitly by an administrator:

    python scripts/create_analyst.py --email analyst@example.com --name "Priya Nair"
    # password is prompted (or supplied via --password / FRAUDGUARD_ANALYST_PASSWORD)

The script never contains credentials itself and refuses duplicate emails.
"""
from __future__ import annotations

import argparse
import getpass
import os
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.api.users import UserStore  # noqa: E402
from src.config import get_settings  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Create a fraud-analyst account.")
    p.add_argument("--email", required=True, help="Analyst login email")
    p.add_argument("--name", default=None, help="Display name (defaults to email local part)")
    p.add_argument(
        "--password",
        default=None,
        help="Password (omit to be prompted; FRAUDGUARD_ANALYST_PASSWORD also works)",
    )
    p.add_argument("--db", default=None, help="Override auth database path")
    args = p.parse_args()

    password = args.password or os.environ.get("FRAUDGUARD_ANALYST_PASSWORD")
    if not password:
        password = getpass.getpass("Analyst password (min 8 chars): ")
    if len(password) < 8:
        print("ERROR: password must be at least 8 characters.", file=sys.stderr)
        return 1

    email = args.email.strip().lower()
    if "@" not in email:
        print("ERROR: invalid email address.", file=sys.stderr)
        return 1
    username = email.split("@", 1)[0][:40]
    name = (args.name or username).strip()

    settings = get_settings()
    store = UserStore(args.db or settings.auth_db_path)
    store.init_db()

    user = store.create_user(
        user_id=f"USR-{secrets.token_hex(4).upper()}",
        username=username,
        email=email,
        password=password,
        role="analyst",
        name=name,
    )
    if user is None:
        print(f"ERROR: an account with email or username '{email}' already exists.",
              file=sys.stderr)
        return 1

    print(f"Analyst account created: {email} (id={user['id']}, name={user['name']!r})")
    print("Sign in via the Analyst Login form in the FraudGuard AI web app.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
