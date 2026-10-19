"""User account + session store (SQLite) with PBKDF2 password hashing.

Demo accounts (customer Anshika, analyst Vikram) are seeded on first startup
for LOCAL DEVELOPMENT ONLY. Passwords are stored only as PBKDF2-SHA256 hashes;
they are never logged, returned, or exposed to the frontend.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

PBKDF2_ITERATIONS = 390_000

# Demo profiles keep the exact identities the frontend already ships with so
# the existing demo experience is preserved — but credentials now live (hashed)
# in the backend database instead of the JS bundle.
DEMO_USERS: list[dict[str, Any]] = [
    {
        "id": "USR-8801",
        "username": "anshika",
        "email": "anshika.sharma@example.com",
        "password": "Anshika@123",
        "name": "Anshika Sharma",
        "role": "customer",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        "title": "Customer (Personal Protection)",
        "city": "Bengaluru, India",
        "created_at": "2025-11-14",
        "phone_masked": "+91 98\u2022\u2022\u2022\u2022 1204",
    },
    {
        "id": "USR-8890",
        "username": "vikram",
        "email": "vikram@fraudguard.ai",
        "password": "Vikram@123",
        "name": "Vikram",
        "role": "analyst",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        "title": "Analyst (Fraud Intelligence)",
        "city": "Mumbai, India",
        "created_at": "2024-03-10",
        "phone_masked": "+91 97\u2022\u2022\u2022\u2022 4419",
    },
]


def hash_password(password: str, *, iterations: int = PBKDF2_ITERATIONS) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_hex, hash_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iters)
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except (ValueError, AttributeError):
        return False


def public_user(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    """Safe user projection — never includes the password hash."""
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
        "avatar": row["avatar"],
        "title": row["title"],
        "city": row["city"],
        "phoneMasked": row["phone_masked"],
        "createdAt": row["created_at"],
        "lastLogin": row["last_login"],
    }


class UserStore:
    """Thin SQLite-backed user + session store."""

    def __init__(self, db_path: Path | str):
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('customer', 'analyst')),
                    name TEXT NOT NULL,
                    avatar TEXT,
                    title TEXT,
                    city TEXT,
                    phone_masked TEXT,
                    created_at TEXT NOT NULL,
                    last_login TEXT
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                );
                """
            )
        self._seed_demo_users()
        self.purge_expired_sessions()

    def _seed_demo_users(self) -> None:
        with self._connect() as conn:
            for demo in DEMO_USERS:
                existing = conn.execute(
                    "SELECT id FROM users WHERE email = ? OR username = ?",
                    (demo["email"], demo["username"]),
                ).fetchone()
                if existing:
                    continue
                conn.execute(
                    """
                    INSERT INTO users (id, username, email, password_hash, role, name,
                                       avatar, title, city, phone_masked, created_at, last_login)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                    """,
                    (
                        demo["id"], demo["username"], demo["email"],
                        hash_password(demo["password"]), demo["role"], demo["name"],
                        demo["avatar"], demo["title"], demo["city"],
                        demo["phone_masked"], demo["created_at"],
                    ),
                )

    # --- users -------------------------------------------------------------

    def find_user_by_identifier(self, identifier: str) -> sqlite3.Row | None:
        key = identifier.strip().lower()
        if not key:
            return None
        with self._connect() as conn:
            return conn.execute(
                "SELECT * FROM users WHERE lower(email) = ? OR lower(username) = ?",
                (key, key),
            ).fetchone()

    def get_user(self, user_id: str) -> sqlite3.Row | None:
        with self._connect() as conn:
            return conn.execute(
                "SELECT * FROM users WHERE id = ?", (user_id,)
            ).fetchone()

    def create_user(
        self, *, user_id: str, username: str, email: str, password: str,
        role: str = "customer", name: str | None = None, city: str | None = None,
    ) -> dict[str, Any] | None:
        """Create a user. Returns the public user, or None when email/username taken."""
        if self.find_user_by_identifier(email) or self.find_user_by_identifier(username):
            return None
        now = datetime.now(timezone.utc)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO users (id, username, email, password_hash, role, name,
                                   avatar, title, city, phone_masked, created_at, last_login)
                VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, NULL)
                """,
                (
                    user_id, username, email, hash_password(password), role,
                    name or username, "Registered Account", city,
                    now.strftime("%Y-%m-%d"),
                ),
            )
        return public_user(self.get_user(user_id))  # type: ignore[arg-type]

    def touch_login(self, user_id: str) -> None:
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        with self._connect() as conn:
            conn.execute(
                "UPDATE users SET last_login = ? WHERE id = ?", (stamp, user_id)
            )

    def list_users(self) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM users ORDER BY created_at, id"
            ).fetchall()
        return [public_user(r) for r in rows]

    # --- sessions ----------------------------------------------------------

    def create_session(self, user_id: str, ttl_hours: int) -> str:
        token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) "
                "VALUES (?, ?, ?, ?)",
                (
                    hashlib.sha256(token.encode("utf-8")).hexdigest(),
                    user_id, now.isoformat(),
                    (now + timedelta(hours=ttl_hours)).isoformat(),
                ),
            )
        return token

    def get_session_user(self, token: str) -> sqlite3.Row | None:
        if not token:
            return None
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            return conn.execute(
                """
                SELECT u.* FROM sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.token_hash = ? AND s.expires_at > ?
                """,
                (token_hash, now),
            ).fetchone()

    def delete_session(self, token: str) -> None:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with self._connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))

    def purge_expired_sessions(self) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
