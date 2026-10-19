from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request
from fastapi.testclient import TestClient
from typing import List

router = APIRouter(tags=["scoring"])


async def rate_limit(request: Request):
    pass


async def require_api_key(request: Request):
    return "x"


class TransactionRequest:
    pass


class PredictionResponse:
    pass


class BatchRequest:
    pass


# predict: default-value dependency returning None
@router.post(
    "/predict",
    response_model=PredictionResponse,
    dependencies=[Depends(rate_limit)],
)
async def predict(txn: TransactionRequest, request: Request) -> PredictionResponse:
    return PredictionResponse()


# predict_batch: default-value dependency returning str
@router.post(
    "/predict/batch",
    response_model=BatchRequest,
    dependencies=[Depends(require_api_key)],
)
async def predict_batch(batch: BatchRequest, request: Request) -> BatchRequest:
    return batch


app = FastAPI()
app.include_router(router)
app.include_router(router)  # register twice (test duplicate)


if __name__ == "__main__":
    c = TestClient(app)
    print("predict:", c.post("/predict", headers={"Content-Type": "application/json"}, json={}).status_code)
    print("batch:", c.post("/predict/batch", headers={"Content-Type": "application/json"}, json={}).status_code)
    print("routes on app:")
    for r in app.router.routes:
        print(" ", type(r).__name__, getattr(r, "path_format", None), r.name)
