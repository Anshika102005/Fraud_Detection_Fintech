import sys
sys.path.insert(0, ".")

import src.api.routes.predict as m
print("module imported OK")
print("predict callable:", callable(m.predict))
print("predict_batch callable:", callable(m.predict_batch))
print("routes:")
for r in m.router.routes:
    print(" ", type(r).__name__, getattr(r, "path_format", None), r.name)

from fastapi.testclient import TestClient
c = TestClient(m.router)
r = c.post(
    "/predict",
    headers={"Content-Type": "application/json"},
    json={
        "transaction_id": "t1",
        "customer_id": "c1",
        "transaction_timestamp": "2026-01-01T10:00:00Z",
        "transaction_amount": 4999.0,
        "merchant_id": "m7",
    },
)
print("predict", r.status_code)
print(r.text[:300])
