"""Model loading (artifact file or MLflow registry alias) + app factory."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

import joblib

from fastapi.middleware.cors import CORSMiddleware

from src.api.auth import TokenBucketLimiter
from src.api.middleware import RequestContextMiddleware
from src.api.records import RecordStore
from src.api.routes.analyst import router as analyst_router
from src.api.routes.auth import router as auth_router
from src.api.routes.health import router as health_router
from src.api.routes.predict import router as predict_router
from src.api.routes.records import router as records_router
from src.api.users import UserStore
from src.config import Settings, get_settings
from src.logging_conf import setup_logging
from src.serving.scorer import ScoringEngine

logger = logging.getLogger("fraud.api")


# Module-level serving engine. The FastAPI `app.state` object does not survive
# the middleware stack (and TestClient wrapping) reliably in this codebase, so
# routes read the engine from this shared singleton instead of
# `request.app.state.engine` (which raises AttributeError: no attribute 'engine').
_engine: ScoringEngine | None = None


def get_engine() -> ScoringEngine:
    if _engine is None:
        raise RuntimeError("Serving engine not loaded")
    return _engine


def load_engine(settings: Settings) -> ScoringEngine:
    """Load the serving bundle: local artifact first, else MLflow registry alias.

    The engine is stored in a module-level singleton so every route can read it
    without depending on `app.state`, which does not survive the middleware
    stack reliably.
    """
    global _engine
    artifact = Path(settings.artifact_path)
    if artifact.exists():
        bundle = joblib.load(artifact)
        logger.info("bundle loaded", extra={"source": str(artifact)})
        _engine = ScoringEngine(bundle, settings)
        return _engine
    if settings.mlflow_enabled:
        import mlflow
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        from mlflow.tracking import MlflowClient
        client = MlflowClient()
        try:
            mv = client.get_model_version_by_alias(
                settings.model_registry_name, settings.model_alias
            )
            local = mlflow.artifacts.download_artifacts(
                run_id=mv.run_id, artifact_path="model_bundle.joblib")
            bundle = joblib.load(local)
            logger.info("bundle loaded from registry",
                        extra={"version": mv.version, "alias": settings.model_alias})
            return ScoringEngine(bundle, settings)
        except Exception as exc:
            logger.error("registry load failed", extra={"error": str(exc)})
    raise RuntimeError(f"No model bundle at {artifact} and registry unavailable")


@asynccontextmanager
async def lifespan(app):
    settings: Settings = app.state.settings
    # User accounts + sessions live in their own SQLite file so the auth plane
    # works even when the model bundle is unavailable. Transactions, fraud
    # alerts, and analyst cases share that database, scoped per account.
    store = UserStore(settings.auth_db_path)
    store.init_db()
    app.state.user_store = store
    records = RecordStore(settings.auth_db_path)
    records.init_db()
    app.state.record_store = records
    global _engine
    try:
        _engine = load_engine(settings)
        app.state.ready = True
    except Exception as exc:
        logger.error("startup: model unavailable, serving /ready=false",
                     extra={"error": str(exc)})
        _engine = None
        app.state.ready = False
    yield


def create_app(settings: Settings | None = None) -> "FastAPI":
    from fastapi import FastAPI

    settings = settings or get_settings()
    setup_logging(settings.log_level)
    app = FastAPI(title="Fraud Detection API", version="1.0.0",
                  description="Real-time credit-card transaction fraud scoring",
                  lifespan=lifespan)
    app.state.settings = settings
    app.state.limiter = TokenBucketLimiter(settings.rate_limit_per_minute)
    app.add_middleware(RequestContextMiddleware)
    # The Vite dev server (:3000) calls the API cross-origin with a Bearer token.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(predict_router)
    app.include_router(auth_router)
    app.include_router(records_router)
    app.include_router(analyst_router)
    return app


app = create_app()
