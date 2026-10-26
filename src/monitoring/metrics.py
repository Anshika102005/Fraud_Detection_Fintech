"""Prometheus metrics with graceful fallback when prometheus-client is absent.

Exposed:
  predict_requests_total{model_version, decision, risk_level}
  predict_latency_seconds (histogram)
  predict_score_distribution (histogram -> doubles as score-drift early warning)
  fraud_drift_psi{feature} (set by the drift job)
  fraud_prediction_rate (real-time predicted fraud rate)
"""
from __future__ import annotations

import numpy as np

try:  # pragma: no cover - exercised only when the lib is installed
    from prometheus_client import Counter, Gauge, Histogram
    from prometheus_client import generate_latest as _generate_latest

    HAS_PROM = True
except ImportError:  # pragma: no cover
    HAS_PROM = False

if HAS_PROM:
    REQUEST_COUNT = Counter("predict_requests_total",
                            "Scored transactions", ["model_version", "decision",
                                                    "risk_level"])
    LATENCY = Histogram("predict_latency_seconds", "Scoring latency",
                        ["route"],
                        buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5))
    SCORE_DIST = Histogram("predict_score_distribution", "Fraud score distribution",
                           buckets=tuple(np.linspace(0.0, 1.0, 21).tolist()))
    DRIFT_PSI = Gauge("fraud_drift_psi", "PSI vs training reference", ["feature"])
    PREDICTED_FRAUD_RATE = Gauge("fraud_prediction_rate",
                                 "Share of BLOCK/DECLINE decisions recently")
else:  # no-op fallbacks keep the API importable without the dependency
    class _Noop:
        def __init__(self, *a, **k):
            pass

        def labels(self, *a, **k):
            return self

        def inc(self, *a, **k):
            pass

        def observe(self, *a, **k):
            pass

        def set(self, *a, **k):
            pass

        def time(self):
            import contextlib
            return contextlib.nullcontext()

    REQUEST_COUNT = LATENCY = SCORE_DIST = DRIFT_PSI = PREDICTED_FRAUD_RATE = _Noop()

    def _generate_latest():
        return b""


def observe_prediction(model_version: str, decision: str, risk_level: str,
                      score: float) -> None:
    REQUEST_COUNT.labels(model_version=model_version, decision=decision,
                         risk_level=risk_level).inc()
    SCORE_DIST.observe(float(score))
    PREDICTED_FRAUD_RATE.set(float(score))


def observe_latency(route: str, seconds: float) -> None:
    LATENCY.labels(route=route).observe(seconds)


def render_metrics() -> tuple[bytes, str]:
    return _generate_latest(), "text/plain; version=0.0.4; charset=utf-8"


def set_drift_psi(feature: str, psi: float) -> None:
    if np.isfinite(psi):
        DRIFT_PSI.labels(feature=feature).set(float(psi))
