"""FastAPI fraud-risk prediction API.

Start with:  uvicorn api:app --port 8000
Docs at:     http://127.0.0.1:8000/docs
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from fraud_detection import config
from fraud_detection.risk import RiskScorer

app = FastAPI(title="Fraud Detection API", version="1.0.0")


class PredictRequest(BaseModel):
    features: dict[str, Any]


class PredictResponse(BaseModel):
    fraud_probability: float
    risk_level: str
    prediction: str
    top_risk_factors: list[dict[str, Any]]


scorer: RiskScorer | None = None
raw_features: list[str] = []


@app.on_event("startup")
def load_artifacts():
    global scorer, raw_features
    try:
        scorer = RiskScorer(None, None, [], [])
        raw_features = json.loads(Path(config.FEATURES_PATH).read_text())["features_raw"]
    except FileNotFoundError:
        print("[api] Artifacts missing — run `python -m fraud_detection.train` first.")


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": scorer is not None}


@app.get("/features")
def get_features():
    return {"features_raw": raw_features}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if scorer is None:
        raise HTTPException(503, "Model not loaded. Train it first.")
    row = {f: req.features.get(f) for f in raw_features}
    df = pd.DataFrame([row])
    try:
        return scorer.score(df)
    except Exception as exc:
        raise HTTPException(400, f"Scoring failed: {exc}") from exc


@app.post("/predict/example")
def predict_example(kind: str = "risky"):
    """Demo endpoint with a prefilled risky/safe example row."""
    path = Path(config.ARTIFACTS_DIR) / "examples.json"
    if not path.exists():
        raise HTTPException(404, "No examples saved (created during training).")
    examples = json.loads(path.read_text())
    if kind not in examples:
        raise HTTPException(404, f"Unknown example '{kind}'")
    df = pd.DataFrame([{f: examples[kind].get(f) for f in raw_features}])
    return scorer.score(df)
