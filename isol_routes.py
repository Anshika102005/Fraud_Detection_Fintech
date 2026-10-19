from fastapi import FastAPI, Depends, Request

async def rate_limit(request: Request):
    pass

app = FastAPI()

@app.post("/predict")
async def predict(txn, request: Request, _key: str = Depends(rate_limit)):
    return {"ok": True}


@app.post("/predict/batch")
async def predict_batch(txns, request: Request):
    return {"ok": True}
