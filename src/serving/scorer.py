"""Scoring engine: model bundle -> real-time fraud decision + explanation.

Single artifact in, single decision out:
  request -> online features (training-serving consistent) -> model -> threshold
          -> risk policy -> SHAP top factors -> prediction log + metrics
"""
from __future__ import annotations

import hashlib
import time

import numpy as np
import pandas as pd

from src.config import Settings
from src.explainability.risk_factors import top_risk_factors
from src.features.online import OnlineFeatureComputer
from src.models.threshold import RiskPolicy
from src.monitoring.metrics import observe_prediction
from src.serving.stores import IdempotencyCache, PredictionLogger, make_kv


class ScoringEngine:
    def __init__(self, bundle: dict, settings: Settings):
        self.bundle = bundle
        self.settings = settings
        self.model = bundle["model"]
        self.model_type = bundle["model_type"]
        self.feature_names: list[str] = bundle["feature_names"]
        self.threshold = float(bundle["threshold"])
        self.policy = RiskPolicy(bundle["risk_policy"])
        self.model_version = self._version(bundle)
        self.kv = make_kv(settings)
        self.computer = OnlineFeatureComputer(
            self.kv,
            encoder_cfg=bundle.get("encoder_cfg"),
            woe_smoothing=bundle.get("woe_smoothing", 50.0),
            merchant_smoothing=bundle.get("merchant_smoothing"),
            max_events=settings.state_max_events,
        )
        self.idempotency = IdempotencyCache(self.kv, settings.idempotency_ttl_seconds)
        self.logger = PredictionLogger(settings)
        self._explainer = None
        try:
            import shap
            self._explainer = shap.TreeExplainer(self.model)
        except Exception:
            self._explainer = None  # degrade: no explanations, still serve

    @staticmethod
    def _version(bundle: dict) -> str:
        raw = (f"{bundle['model_type']}-{bundle['metadata']['trained_at']}-"
               f"{bundle['threshold']}")
        return f"{bundle['model_type']}-{hashlib.md5(raw.encode()).hexdigest()[:8]}"

    def score(self, txn: dict, idempotency_key: str | None = None) -> dict:
        if idempotency_key:
            cached = self.idempotency.get(idempotency_key)
            if cached is not None:
                return {**cached, "cached": True}
        t0 = time.perf_counter()
        feats = self.computer.compute(txn)
        x = np.array([[feats.get(f, np.nan) for f in self.feature_names]], dtype=float)
        prob = float(self.model.predict_proba(x)[0, 1])
        level, decision = self.policy.evaluate(prob)
        factors = []
        if self._explainer is not None:
            sv = self._explainer.shap_values(
                pd.DataFrame(x, columns=self.feature_names))
            if isinstance(sv, list):
                sv = sv[-1]
            if isinstance(sv, np.ndarray) and sv.ndim == 3:
                sv = sv[:, :, -1]
            factors = top_risk_factors(np.asarray(sv)[0], self.feature_names,
                                       k=5)
        latency_ms = (time.perf_counter() - t0) * 1000
        response = {
            "transaction_id": txn.get("transaction_id"),
            "customer_id": txn.get("customer_id"),
            "fraud_probability": round(prob, 4),
            "risk_level": level,
            "decision": decision,
            "model_version": self.model_version,
            "top_risk_factors": factors,
            "threshold": self.threshold,
            "latency_ms": round(latency_ms, 2),
            "cached": False,
        }
        self.logger.log({**response, "features": {k: (None if (isinstance(v, float) and v != v)
                                                      else v)
                                                   for k, v in feats.items()}})
        observe_prediction(self.model_version, decision, level, prob)
        if idempotency_key:
            self.idempotency.put(idempotency_key, response)
        return response

    def score_batch(self, txns: list[dict]) -> list[dict]:
        results = []
        for i, txn in enumerate(txns):
            try:
                results.append(self.score(txn))
            except Exception as exc:  # one bad row must not fail the batch
                results.append({"error": f"row {i}: {exc}", "decision": "ERROR"})
        return results
