"""Analyst-only endpoints — role enforced on the backend, not just the UI.

Every route here requires an authenticated session whose account role is
'analyst' (see src.api.routes.auth.require_role). A customer token receives
403 even if they hand-craft the request.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from src.api.routes.auth import require_role
from src.api.users import UserStore, public_user

router = APIRouter(
    prefix="/api/v1/analyst",
    tags=["analyst"],
    dependencies=[Depends(require_role("analyst"))],
)


def _store(request: Request) -> UserStore:
    return request.app.state.user_store


@router.get("/users")
def list_users(request: Request) -> dict:
    """Registered accounts (safe fields only) for the analyst Users page."""
    users = _store(request).list_users()
    return {"users": users, "total": len(users)}


@router.get("/users/{user_id}")
def get_user_detail(user_id: str, request: Request) -> dict:
    """Account detail for one registered user. 404 for unknown ids."""
    row = _store(request).get_user(user_id)
    if row is None:
        raise HTTPException(404, f"User {user_id} not found")
    return {"user": public_user(row), "accountIsolated": True}
