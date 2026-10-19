"""Model service - loads the trained ML artifact set ONCE and serves predictions.

- Loads model + preprocessor + metadata from ml/artifacts at startup.
- If artifacts are missing/corrupt, trains a demo model in-process (cached)
  so the API always works. Training on real data simply overwrites artifacts.
- SHAP TreeExplainer is built lazily and cached; falls back gracefully.
"""
from __future__ import annotations

import json
import logging
import sys
import threading
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.config import settings

logger = logging.getLogger("fraudguard.model")


class ModelUnavailableError(RuntimeError):
    """Raised when no usable model artifact set exists."""


class ModelService:
    def __init__(self, artifacts_dir: str | Path | None = None) -> None:
        self.artifacts_dir = Path(artifacts_dir or settings.artifacts_dir)
        self._lock = threading.Lock()
        self.model = None
        self.preprocessor = None
        self.metadata: dict[str, Any] = {}
        self._explainer: Any = None
        self._loaded = False

    # ------------------------------------------------------------- lifecycle
    def ensure_loaded(self) -> None:
        if self._loaded:
            return
        with self._lock:
            if self._loaded:
                return
            if not self._try_load_artifacts():
                logger.warning(
                    "ML artifacts not found at %s - training demo model in-process",
                    self.artifacts_dir,
                )
                self._train_demo_artifacts()
            self._loaded = True

    def _try_load_artifacts(self) -> bool:
        try:
            import joblib

            self.model = joblib.load(self.artifacts_dir / "model.joblib")
            self.preprocessor = joblib.load(self.artifacts_dir / "preprocessor.joblib")
            meta_path = self.artifacts_dir / "model_metadata.json"
            self.metadata = json.loads(meta_path.read_text()) if meta_path.exists() else {}
            logger.info(
                "Loaded ML artifacts from %s (version=%s)",
                self.artifacts_dir,
                self.model_version,
            )
            return True
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not load ML artifacts: %s", exc)
            self.model = None
            self.preprocessor = None
            return False

    def _train_demo_artifacts(self) -> None:
        """Fallback: train the demo model in-process and persist artifacts."""
        project_root = str(self.artifacts_dir.parent.parent)
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        from ml import demo_data
        from ml.models.fraud_model import save_artifacts, train_model

        dataset = demo_data.generate_synthetic_dataset()
        model, preprocessor, _feature_names, metrics = train_model(dataset)
        save_artifacts(model, preprocessor, _feature_names, metrics, self.artifacts_dir)
        self.model = model
        self.preprocessor = preprocessor
        self.metadata = json.loads((self.artifacts_dir / "model_metadata.json").read_text())
        logger.info("Trained + saved demo model artifacts (demo metrics: %s)", metrics)

    # ------------------------------------------------------------- properties
    @property
    def model_name(self) -> str:
        return str(self.metadata.get("model_name", "fraudguard-model"))

    @property
    def model_version(self) -> str:
        return str(self.metadata.get("model_version", "0.0.0"))

    @property
    def is_demo(self) -> bool:
        return bool(self.metadata.get("is_demo", True))

    @property
    def transformed_feature_names(self) -> list[str]:
        names = self.metadata.get("transformed_feature_names")
        if not names and self.preprocessor is not None:
            try:
                names = [n.split("__", 1)[-1] for n in self.preprocessor.get_feature_names_out()]
            except Exception:  # noqa: BLE001
                names = []
        return list(names or [])

    def assert_ready(self) -> None:
        self.ensure_loaded()
        if self.model is None or self.preprocessor is None:
            raise ModelUnavailableError("Fraud detection model is unavailable")

    # ------------------------------------------------------------- prediction
    def predict_proba(self, features: pd.DataFrame) -> float:
        """Fraud probability for one engineered feature row (DataFrame, 1 row)."""
        self.assert_ready()
        from ml.features import FEATURE_NAMES

        transformed = self.preprocessor.transform(features[FEATURE_NAMES])
        return float(self.model.predict_proba(transformed)[0, 1])

    def _get_explainer(self):
        if self._explainer is None:
            try:
                import shap

                self._explainer = shap.TreeExplainer(self.model)
            except Exception as exc:  # noqa: BLE001
                logger.info("SHAP unavailable (%s) - falling back to feature importances", exc)
                self._explainer = False
        return self._explainer

    def explain(self, features: pd.DataFrame) -> list[dict[str, Any]]:
        """Top contributing features for one row, aggregated to source features.

        Returns [{feature, contribution}] sorted by |contribution| desc.
        Uses SHAP TreeExplainer; falls back to model feature_importances_.
        """
        self.assert_ready()
        from ml.features import FEATURE_NAMES

        transformed = self.preprocessor.transform(features[FEATURE_NAMES])
        names = self.transformed_feature_names
        contribs: dict[str, float] = {}
        try:
            explainer = self._get_explainer()
            if not explainer:
                raise RuntimeError("shap explainer unavailable")
            shap_values = np.asarray(explainer.shap_values(transformed))
            if shap_values.ndim == 3:  # (classes, rows, features) in some versions
                shap_values = shap_values[:, :, 1] if shap_values.shape[0] != 2 else shap_values[1]
            row_vals = shap_values[0] if shap_values.ndim > 1 else shap_values
        except Exception:  # noqa: BLE001
            importances = getattr(self.model, "feature_importances_", None)
            if importances is None:
                return []
            row_vals = np.asarray(importances, dtype=float)

        for name, val in zip(names, row_vals):
            base = name.split("__", 1)[-1]
            source = next((f for f in FEATURE_NAMES if base == f or base.startswith(f + "_")), base)
            contribs[source] = contribs.get(source, 0.0) + float(val)

        ranked = sorted(contribs.items(), key=lambda kv: abs(kv[1]), reverse=True)
        return [{"feature": f, "contribution": round(float(v), 4)} for f, v in ranked[:6]]


# Module-level singleton (loaded once per process)
model_service = ModelService()


def get_model_service() -> ModelService:
    return model_service
