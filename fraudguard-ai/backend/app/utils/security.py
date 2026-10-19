"""Security utilities: dependency-free HS256 JWT + password-style hashing helpers.

We intentionally implement a minimal, well-specified HS256 JWT signer/verifier
(hmac + base64url) to avoid extra dependencies in this environment. The
`jwt`-shaped API (encode/decode) mirrors python-jose, which is listed in
requirements.txt as a drop-in production replacement.

Never log tokens or secrets.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
import uuid
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, UserRole

# --------------------------------------------------------------------------- JWT

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(
    subject: str | int,
    role: str,
    email: str,
    expires_minutes: int | None = None,
) -> str:
    """Create a signed HS256 access token. `subject` is the local user id."""
    now = int(time.time())
    payload = {
        "sub": str(subject),
        "role": role,
        "email": email,
        "iat": now,
        "exp": now + int(
            (expires_minutes or settings.jwt_access_token_expire_minutes) * 60
        ),
        "jti": uuid.uuid4().hex,
        "iss": "fraudguard-ai",
    }
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = (
        _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
        + "."
        + _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    )
    signature = hmac.new(
        settings.jwt_secret_key.encode(), signing_input.encode(), hashlib.sha256
    ).digest()
    return signing_input + "." + _b64url_encode(signature)


def decode_token(token: str) -> dict[str, Any]:
    """Verify signature + expiry and return claims. Raises HTTPException on failure."""
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(
            settings.jwt_secret_key.encode(), signing_input.encode(), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(expected_sig, _b64url_decode(sig_b64)):
            raise ValueError("bad signature")
        header = json.loads(_b64url_decode(header_b64))
        if header.get("alg") != "HS256":
            raise ValueError("unsupported alg")
        payload: dict[str, Any] = json.loads(_b64url_decode(payload_b64))
        if payload.get("iss") != "fraudguard-ai":
            raise ValueError("bad issuer")
        exp = int(payload.get("exp", 0))
        if exp < int(time.time()):
            raise ValueError("token expired")
        return payload
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - any malformed token is a 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        ) from exc


# ------------------------------------------------------------------ hashing utils

def hash_identifier(value: str | None) -> str | None:
    """Deterministically salt-hash device/IP identifiers (never store raw)."""
    if not value:
        return None
    salt = settings.jwt_secret_key.encode()[:16]
    return hashlib.sha256(salt + value.strip().lower().encode()).hexdigest()


# ------------------------------------------------------------------ dependencies

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from the Bearer token.

    The user_id / role ALWAYS come from the server-side session token,
    never from request bodies or query parameters.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    claims = decode_token(credentials.credentials)
    user_id = int(claims.get("sub", 0))
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    return user


def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    return user


def require_roles(*allowed: UserRole):
    """Role-based authorization dependency factory."""

    def checker(user: User = Depends(get_current_user)) -> User:
        allowed_values = {r.value for r in allowed}
        if user.role not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return checker


# Convenience dependencies
get_admin_user = require_roles(UserRole.ADMIN)
get_analyst_user = require_roles(UserRole.ANALYST, UserRole.ADMIN)
