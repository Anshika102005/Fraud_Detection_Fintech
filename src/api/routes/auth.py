"""Session/Bearer auth for the FraudGuard web app.

Endpoints (all under /api/v1/auth):
  POST /login     - validate credentials, start server-side session
  POST /logout    - revoke current session
  GET  /me        - current authenticated user (validates the session)
  POST /register  - self-service customer signup (role is forced to 'customer')

Role enforcement helpers (`require_user`, `require_role`) are exported for the
analyst router. Identity always comes from the server-side session — never
from the request body, and never from a hardcoded default user.
"""
from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field

from src.api.users import UserStore, public_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


def _store(request: Request) -> UserStore:
    return request.app.state.user_store


def _token_from(creds: HTTPAuthorizationCredentials | None) -> str:
    return creds.credentials if creds else ""


async def require_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    """Resolve the authenticated user row from the Bearer session token."""
    user = _store(request).get_session_user(_token_from(creds))
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Not authenticated. Please sign in again.",
        )
    return user


def require_role(role: str):
    """Dependency factory: authenticated user must have the given role."""

    async def _guard(request: Request, user=Depends(require_user)):
        if user["role"] != role:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"{role.capitalize()} privileges required.",
            )
        return user

    return _guard


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    identifier: str = Field(default="", max_length=254)
    password: str = Field(default="", max_length=128)


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class SessionResponse(BaseModel):
    token: str
    user: dict


@router.post("/login", response_model=SessionResponse)
def login(body: LoginRequest, request: Request) -> SessionResponse:
    identifier = body.identifier.strip()
    # Identical message + no early return for unknown users: don't leak which
    # half of the credentials was wrong, and keep timing uniform.
    invalid = HTTPException(
        status.HTTP_401_UNAUTHORIZED, "Invalid email or password."
    )
    if not identifier or not body.password:
        raise invalid

    store = _store(request)
    user = store.find_user_by_identifier(identifier)
    from src.api.users import verify_password

    # Always run a verification step so unknown-user timing matches.
    if user is None:
        verify_password(body.password, "pbkdf2_sha256$1$00$00")
        raise invalid
    if not verify_password(body.password, user["password_hash"]):
        raise invalid

    settings = request.app.state.settings
    token = store.create_session(user["id"], settings.session_ttl_hours)
    store.touch_login(user["id"])
    return SessionResponse(token=token, user=public_user(store.get_user(user["id"])))


@router.post("/logout")
def logout(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    token = _token_from(creds)
    if token:
        _store(request).delete_session(token)
    return {"success": True}


@router.get("/me", response_model=SessionResponse)
def me(user=Depends(require_user)) -> SessionResponse:
    # /me never returns a token — the client keeps the one it already has.
    return SessionResponse(token="", user=public_user(user))


@router.post("/register", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, request: Request) -> SessionResponse:
    store = _store(request)
    email = body.email.strip().lower()
    username = email.split("@", 1)[0][:40]
    user = store.create_user(
        user_id=f"USR-{secrets.token_hex(4).upper()}",
        username=username,
        email=email,
        password=body.password,
        role="customer",  # self-registration can never mint an analyst
        name=body.name.strip(),
    )
    if user is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "An account with this email already exists.",
        )
    settings = request.app.state.settings
    token = store.create_session(user["id"], settings.session_ttl_hours)
    store.touch_login(user["id"])
    return SessionResponse(token=token, user=user)
