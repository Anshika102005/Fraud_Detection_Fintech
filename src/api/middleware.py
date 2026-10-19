"""Request middleware: structured logging, request-id propagation, latency metrics."""
from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware

from src.monitoring.metrics import observe_latency

logger = logging.getLogger("fraud.api")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        t0 = time.perf_counter()
        response = await call_next(request)
        latency = time.perf_counter() - t0
        response.headers["X-Request-ID"] = request_id
        observe_latency(request.url.path, latency)
        logger.info(
            "request",
            extra={"request_id": request_id, "path": request.url.path,
                   "method": request.method, "status_code": response.status_code,
                   "latency_ms": round(latency * 1000, 2)},
        )
        return response
