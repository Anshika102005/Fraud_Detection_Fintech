"""Scratch: verify pandas window semantics we depend on for leakage-safe features."""
"""Scratch: minimal multi-key groupby.rolling ordering + closed semantics probe."""
import pandas as pd

df = pd.DataFrame({
    "c": ["c1", "c1", "c1", "c2", "c2"],
    "m": ["m1", "m1", "m1", "m1", "m1"],
    "ts": pd.to_datetime([
        "2024-01-01", "2024-01-05", "2024-01-09",
        "2024-01-02", "2024-01-06",
    ]),
    "v": [1.0, 1.0, 1.0, 1.0, 1.0],
})
tmp = df.sort_values(["c", "m", "ts"], kind="mergesort")
print("tmp order:\n", tmp)

res = tmp.groupby(["c", "m"], sort=False).rolling("129600min", on="ts",
                                                  closed="left")["v"].count()
print("\nresult index:\n", res.index.tolist())
print("result values:", res.to_numpy().tolist())
print("expected (past-only count): [0, 1, 2, 0, 1]")

# also: does sort=True change ordering?
res2 = tmp.groupby(["c", "m"], sort=True).rolling("129600min", on="ts",
                                                  closed="left")["v"].count()
print("\nsort=True values:", res2.to_numpy().tolist(), "index:", res2.index.tolist())




