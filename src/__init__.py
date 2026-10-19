"""Real-time credit card fraud detection system.

Package layout (see PROJECT_BLUEPRINT.md for the architectural contract):
    src.data       - synthetic data generation, validation, DB migration
    src.features   - leakage-safe offline/online feature engineering
    src.models     - training, tuning (Optuna), evaluation, thresholds, registry
    src.explainability - SHAP global/local explanations
    src.serving    - scoring engine + state stores (Redis / in-memory)
    src.api        - FastAPI real-time inference service
    src.monitoring - Prometheus metrics, drift detection, retraining triggers
"""
