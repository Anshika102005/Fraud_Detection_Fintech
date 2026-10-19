"""Authentication service: Google ID token verification + app session issuance.

Flow:
  Google ID Token -> backend validates with Google -> extract `sub`
  -> find/create user -> issue FraudGuard JWT session -> return user info.

- The Google `sub` claim is the STABLE identity key (email is NOT used as key).
- Never logs tokens, secrets, or credentials.
"""
from __future__ import annotations

import base64
import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User, UserRole
from app.utils.security import create_access_token

logger = logging.getLogger("fraudguard.auth")

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


class AuthenticationError(Exception):
    """Raised for any invalid credential - mapped to HTTP 401 by the API layer."""

    def __init__(self, message: str = "Invalid authentication credentials") -> None:
        super().__init__(message)


def verify_google_id_token(id_token: str) -> dict[str, Any]:
    """Validate a Google ID token and return its claims.

    Production tokens are verified via Google's tokeninfo endpoint (over HTTPS).
    Audience must match GOOGLE_CLIENT_ID when it is configured.

    Dev/test fallback: tokens shaped `dev.<base64-urlsafe-json>` are accepted
    ONLY when settings.allow_dev_google_tokens is enabled AND the app is not
    running in production. This keeps tests runnable without live Google.
    """
    if not id_token or not id_token.strip():
        raise AuthenticationError("Missing Google ID token")

    token = id_token.strip()
    if token.startswith("dev."):
        if settings.environment == "production" or not settings.allow_dev_google_tokens:
            raise AuthenticationError("Dev tokens are disabled")
        try:
            payload_b64 = token[4:]
            claims = json.loads(base64.urlsafe_b64decode(payload_b64 + "=" * (-len(payload_b64) % 4)))
        except Exception as exc:  # noqa: BLE001
            raise AuthenticationError("Malformed dev token") from exc
        if not claims.get("sub"):
            raise AuthenticationError("Dev token missing `sub`")
        logger.info("Dev Google token accepted for sub=%s (dev mode)", claims.get("sub"))
        return claims

    try:
        response = httpx.get(
            GOOGLE_TOKENINFO_URL,
            params={"id_token": token},
            timeout=8.0,
        )
        if response.status_code != 200:
            raise AuthenticationError("Google token validation failed")
        claims = response.json()
    except httpx.HTTPError as exc:
        logger.error("Google tokeninfo request failed: %s", exc)
        raise AuthenticationError("Could not validate Google token") from exc

    error = claims.get("error_description")
    if error:
        raise AuthenticationError(f"Google token rejected: {error}")

    if settings.google_client_id and claims.get("aud") != settings.google_client_id:
        raise AuthenticationError("Google token audience mismatch")

    if str(claims.get("email_verified", "true")).lower() in {"false", "0"}:
        raise AuthenticationError("Google account email is not verified")

    if not claims.get("sub"):
        raise AuthenticationError("Google token missing `sub` claim")

    logger.info("Google token validated for sub=%s", claims.get("sub"))
    return claims


def get_or_create_user(db: Session, claims: dict[str, Any]) -> User:
    """Find user by Google `sub` (stable key); create on first login."""
    google_sub = str(claims["sub"])
    email = str(claims.get("email") or f"{google_sub}@users.fraudguard.local")

    user = db.query(User).filter(User.google_sub == google_sub).first()
    if user is None:
        # Email exists under a different google_sub (account migration case):
        # create a NEW user bound to the new google_sub; never merge silently.
        user = User(
            google_sub=google_sub,
            email=email,
            name=str(claims.get("name") or email.split("@")[0]),
            profile_picture=claims.get("picture"),
            role=UserRole.CUSTOMER.value,
            last_login=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        logger.info("New user created id=%s google_sub=%s", user.id, google_sub)
    else:
        user.name = str(claims.get("name") or user.name)
        user.profile_picture = claims.get("picture") or user.profile_picture
        user.last_login = datetime.now(timezone.utc)
        db.flush()
    db.commit()
    db.refresh(user)
    return user


def authenticate_with_google(db: Session, id_token: str) -> tuple[User, str]:
    """Complete Google auth flow: verify -> get/create user -> issue session JWT."""
    claims = verify_google_id_token(id_token)
    user = get_or_create_user(db, claims)
    access_token = create_access_token(subject=user.id, role=user.role, email=user.email)
    logger.info("Session issued for user_id=%s", user.id)
    return user, access_token
