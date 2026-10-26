"""Health, readiness, metrics and admin endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from src.api.auth import require_admin_key
from src.api.schemas import HealthResponse, ReadyResponse
from src.monitoring.metrics import render_metrics

router = APIRouter(tags=["ops"])


@router.get("/")
async def root() -> dict:
    """Root landing endpoint with service status and links."""
    return {
        "status": "ok",
        "service": "Fraud Detection API",
        "documentation": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "ready": "/ready"
    }


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    """Liveness: process is up (model may still be loading)."""
    settings = request.app.state.settings
    try:
        from src.api.main import get_engine
        engine = get_engine()
    except RuntimeError:
        engine = None
    return HealthResponse(
        status="ok",
        model_version=engine.model_version if engine else None,
        state_store=settings.state_store,
        prediction_log=settings.prediction_log,
    )


@router.get("/ready", response_model=ReadyResponse)
async def ready(request: Request) -> ReadyResponse:
    """Readiness: model loaded AND state store reachable. In demo (in-memory)
    mode the state store is always considered ok; with Redis, a ping is issued."""
    settings = request.app.state.settings
    try:
        from src.api.main import get_engine
        engine = get_engine()
    except RuntimeError:
        engine = None
    model_ok = engine is not None
    store_ok = True
    detail = None
    if settings.state_store == "redis":
        try:
            engine.kv._r.ping()  # noqa: SLF001 - intentional infra probe
        except Exception as exc:
            store_ok, detail = False, f"redis unreachable: {exc}"
    if not model_ok:
        detail = "model not loaded"
    return ReadyResponse(ready=bool(model_ok and store_ok), model_loaded=model_ok,
                         state_store_ok=store_ok, detail=detail)


@router.get("/metrics")
async def metrics() -> object:
    """Prometheus scrape endpoint."""
    body, content_type = render_metrics()
    from fastapi import Response
    return Response(content=body, media_type=content_type)


@router.post("/admin/reload")
async def reload_model(request: Request, _admin: str = Depends(require_admin_key)) -> dict:
    """Hot-swap the model bundle from disk/registry without restarting the pod."""
    from src.api.main import get_engine, load_engine
    try:
        current = get_engine()
        old_version = current.model_version
    except RuntimeError:
        old_version = None
    try:
        engine = load_engine(request.app.state.settings)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"reload failed: {exc}")
    return {"reloaded": True, "previous_version": old_version,
            "current_version": engine.model_version}
