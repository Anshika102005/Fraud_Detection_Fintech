"""Prediction endpoints: POST /predict and POST /predict/batch."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from src.api.auth import rate_limit, require_api_key
from src.api.schemas import BatchRequest, BatchResponse, PredictionResponse, TransactionRequest

router = APIRouter(tags=["scoring"])


@router.post("/predict", response_model=PredictionResponse,
             dependencies=[Depends(rate_limit), Depends(require_api_key)])
async def predict(txn: TransactionRequest, request: Request) -> PredictionResponse:
    from src.api.main import get_engine

    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="model not loaded yet")
    idem = request.headers.get("X-Idempotency-Key")
    try:
        result = engine.score(txn.to_engine_dict(), idempotency_key=idem)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"scoring failed: {exc}")
    return result


@router.post("/predict/batch", response_model=BatchResponse,
             dependencies=[Depends(rate_limit)])
async def predict_batch(batch: BatchRequest, request: Request,
                        _key: str = Depends(require_api_key)) -> BatchResponse:
    from src.api.main import get_engine

    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="model not loaded yet")
    settings = request.app.state.settings
    if len(batch.transactions) > settings.max_batch_size:
        raise HTTPException(status_code=413,
                            detail=f"batch too large (max {settings.max_batch_size})")
    results = engine.score_batch([t.to_engine_dict() for t in batch.transactions])
    return BatchResponse(count=len(results), results=results)
