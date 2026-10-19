"""API-key authentication + in-process token-bucket rate limiting.

The fraud API is itself an attack target (score probing / model extraction):
every request must present a key, and per-key request rates are capped.
"""
from __future__ import annotations

import time

from fastapi import HTTPException, Request, status

from src.config import Settings


async def require_api_key(request: Request) -> str:
    settings: Settings = request.app.state.settings
    key = request.headers.get("X-API-Key", "")
    if not key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-API-Key header")
    if key not in settings.api_key_set:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid API key")
    return key


async def require_admin_key(request: Request) -> str:
    settings: Settings = request.app.state.settings
    key = request.headers.get("X-API-Key", "")
    if not key or key != settings.admin_api_key:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin privileges required")
    return key


class TokenBucketLimiter:
    """Per-key token bucket; 429 when the bucket is empty."""

    def __init__(self, per_minute: int):
        self.rate = per_minute / 60.0
        self.capacity = float(per_minute)
        self._buckets: dict[str, tuple[float, float]] = {}
        self._lock = None  # GIL-sufficient for CPython dict ops here

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        tokens, last = self._buckets.get(key, (self.capacity, now))
        tokens = min(self.capacity, tokens + (now - last) * self.rate)
        if tokens < 1.0:
            self._buckets[key] = (tokens, now)
            return False
        self._buckets[key] = (tokens - 1.0, now)
        return True


async def rate_limit(request: Request) -> None:
    limiter: TokenBucketLimiter = request.app.state.limiter
    key = request.headers.get("X-API-Key", request.client.host if request.client else "anon")
    if not limiter.allow(key):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Rate limit exceeded")
