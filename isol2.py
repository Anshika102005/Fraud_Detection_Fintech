from fastapi import FastAPI, Depends, HTTPException, Request

router = FastAPI(tags=["scoring"])


async def rate_limit(request: Request):
    pass


async def require_api_key(request: Request):
    return "x"


class TransactionRequest:
    pass


class BatchRequest:
    pass


class PredictionResponse:
    pass


@router.post(
    "/predict",
    response_model=PredictionResponse,
    dependencies=[Depends(rate_limit)],
)
async def predict(txn: TransactionRequest, request: Request) -> PredictionResponse:
    return PredictionResponse(
        transaction_id=None,
        customer_id=None,
        fraud_probability=0.0,
        risk_level="LOW",
        decision="APPROVE",
        model_version="mock",
        top_risk_factors=[],
        threshold=0.0,
        latency_ms=0.0,
        cached=False,
    )


@router.post(
    "/predict/batch",
    response_model=BatchRequest,
    dependencies=[Depends(rate_limit)],
)
async def predict_batch(batch: BatchRequest, request: Request) -> BatchRequest:
    return batch
