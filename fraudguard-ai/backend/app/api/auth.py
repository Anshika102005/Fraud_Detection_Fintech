"""Auth endpoints: POST /api/auth/google, GET /api/auth/me, POST /api/auth/logout."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import GoogleAuthRequest, TokenResponse, UserOut
from app.services import auth_service
from app.utils.security import get_current_user

logger = logging.getLogger("fraudguard.api.auth")
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=TokenResponse)
def auth_google(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Exchange a Google ID token for a FraudGuard application session."""
    try:
        user, token = auth_service.authenticate_with_google(db, payload.id_token)
    except auth_service.AuthenticationError as exc:
        logger.warning("Google auth rejected: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.error("Google auth failed unexpectedly: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed. Please try again.",
        ) from exc
    return TokenResponse(
        access_token=token,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def auth_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def auth_logout(current_user: User = Depends(get_current_user)):
    """Stateless JWT logout: the client discards the token.

    (Token revocation via a denylist can be added when persistent sessions
    are required.)
    """
    logger.info("Logout requested by user_id=%s", current_user.id)
    return {"detail": "Logged out. Discard the access token on the client."}
