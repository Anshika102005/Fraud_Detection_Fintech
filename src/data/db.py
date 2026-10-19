"""SQLAlchemy engine helpers (Postgres in production; used by migration + logging)."""
from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


@lru_cache
def get_engine(database_url: str) -> Engine:
    """Create a cached engine. Pooling via pool_pre_ping for dropped connections."""
    return create_engine(database_url, pool_pre_ping=True, pool_size=5, max_overflow=10,
                         future=True)


def apply_sql_file(engine: Engine, path: str) -> None:
    """Execute a .sql file as one or more statements (idempotent DDL assumed)."""
    with open(path, "r", encoding="utf-8") as f:
        sql = f.read()
    with engine.begin() as conn:
        conn.execute(text(sql))
