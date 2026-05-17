"""
utils/pagination.py — Shared pagination helpers (BE-01)

Provides a reusable `paginate()` helper and `PaginationParams` dependency
so any new route can add pagination in 3 lines.

Usage:
    from utils.pagination import PaginationParams, paginate_response

    @router.get("/things")
    def list_things(
        pg: PaginationParams = Depends(),
        db: Session = Depends(get_db),
    ):
        q = db.query(Thing)
        return paginate_response(q, pg)
"""

from __future__ import annotations

import math
from typing import Any, Sequence, TypeVar

from fastapi import Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Query as SAQuery


class PaginationParams:
    """FastAPI dependency — inject into route with `pg: PaginationParams = Depends()`"""

    def __init__(
        self,
        page: int = Query(0, ge=0, description="1-based page number. 0 = return all (legacy mode)"),
        page_size: int = Query(50, ge=1, le=500, description="Items per page (max 500)"),
    ):
        self.page = page
        self.page_size = page_size

    @property
    def is_paginated(self) -> bool:
        return self.page > 0

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size if self.is_paginated else 0


def paginate_response(
    query: SAQuery,
    pg: PaginationParams,
    serialiser=None,
) -> Any:
    """
    Apply pagination to a SQLAlchemy query and return either:
      - A plain list (legacy, page=0)
      - A JSONResponse with X-Total-Count / X-Page / X-Total-Pages headers (page≥1)

    `serialiser` is an optional callable(row) → dict. If None, the rows are
    returned as-is (works when FastAPI's response_model handles serialisation).
    """
    total = query.count()

    if pg.is_paginated:
        rows = query.offset(pg.offset).limit(pg.page_size).all()
        items = [serialiser(r) for r in rows] if serialiser else rows
        headers = {
            "X-Total-Count": str(total),
            "X-Page": str(pg.page),
            "X-Page-Size": str(pg.page_size),
            "X-Total-Pages": str(math.ceil(total / pg.page_size) if total else 0),
            "Access-Control-Expose-Headers": (
                "X-Total-Count, X-Page, X-Page-Size, X-Total-Pages"
            ),
        }
        # JSONResponse requires serialisable content — fall back to serialiser or repr
        content = items if serialiser else [str(r) for r in items]
        return JSONResponse(content=content, headers=headers)

    # Legacy: return all rows — FastAPI response_model will serialise
    return query.all()
