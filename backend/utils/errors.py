"""
utils/errors.py
---------------
Standard error handling for the Customer Management API.

All API errors are returned in a consistent envelope:

    {
        "success": false,
        "error": {
            "code":    "NOT_FOUND",          # machine-readable slug
            "message": "User not found",      # human-readable
            "details": null                   # extra context (list or dict) or null
        },
        "path":      "/api/admin/users/99",  # request path
        "timestamp": "2026-05-03T06:40:00Z"
    }

Usage in routes (optional — plain HTTPException still works):
    from utils.errors import NotFoundError, ForbiddenError, ValidationError
    raise NotFoundError("Customer not found")
"""

from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Standard error codes
# ---------------------------------------------------------------------------
class ErrorCode:
    # 4xx
    BAD_REQUEST        = "BAD_REQUEST"          # 400
    UNAUTHORIZED       = "UNAUTHORIZED"          # 401
    FORBIDDEN          = "FORBIDDEN"             # 403
    NOT_FOUND          = "NOT_FOUND"             # 404
    CONFLICT           = "CONFLICT"              # 409
    UNPROCESSABLE      = "UNPROCESSABLE_ENTITY"  # 422
    TOO_MANY_REQUESTS  = "TOO_MANY_REQUESTS"     # 429
    # 5xx
    INTERNAL_ERROR     = "INTERNAL_SERVER_ERROR" # 500
    SERVICE_UNAVAILABLE= "SERVICE_UNAVAILABLE"   # 503

    # Map HTTP status → default code
    _STATUS_MAP: dict[int, str] = {
        400: BAD_REQUEST,
        401: UNAUTHORIZED,
        403: FORBIDDEN,
        404: NOT_FOUND,
        409: CONFLICT,
        422: UNPROCESSABLE,
        429: TOO_MANY_REQUESTS,
        500: INTERNAL_ERROR,
        503: SERVICE_UNAVAILABLE,
    }

    @classmethod
    def from_status(cls, status: int) -> str:
        return cls._STATUS_MAP.get(status, f"HTTP_{status}")


# ---------------------------------------------------------------------------
# Custom exception classes (optional convenience — routes can still use plain
# HTTPException and the global handler will normalise the response shape)
# ---------------------------------------------------------------------------

class AppError(HTTPException):
    """Base for all typed application errors."""
    status_code: int = 500
    default_code: str = ErrorCode.INTERNAL_ERROR

    def __init__(
        self,
        message: str = "An unexpected error occurred",
        *,
        code: Optional[str] = None,
        details: Any = None,
    ):
        super().__init__(status_code=self.__class__.status_code, detail=message)
        self.error_code = code or self.__class__.default_code
        self.details = details


class NotFoundError(AppError):
    status_code = 404
    default_code = ErrorCode.NOT_FOUND
    def __init__(self, message: str = "Resource not found", *, details: Any = None):
        super().__init__(message, details=details)


class ForbiddenError(AppError):
    status_code = 403
    default_code = ErrorCode.FORBIDDEN
    def __init__(self, message: str = "Access denied", *, details: Any = None):
        super().__init__(message, details=details)


class UnauthorizedError(AppError):
    status_code = 401
    default_code = ErrorCode.UNAUTHORIZED
    def __init__(self, message: str = "Authentication required", *, details: Any = None):
        super().__init__(message, details=details)


class BadRequestError(AppError):
    status_code = 400
    default_code = ErrorCode.BAD_REQUEST
    def __init__(self, message: str = "Bad request", *, details: Any = None):
        super().__init__(message, details=details)


class ConflictError(AppError):
    status_code = 409
    default_code = ErrorCode.CONFLICT
    def __init__(self, message: str = "Resource conflict", *, details: Any = None):
        super().__init__(message, details=details)


class ValidationError(AppError):
    status_code = 422
    default_code = ErrorCode.UNPROCESSABLE
    def __init__(self, message: str = "Validation failed", *, details: Any = None):
        super().__init__(message, details=details)


# ---------------------------------------------------------------------------
# Convenience shortcut — mirrors Django's get_object_or_404
# ---------------------------------------------------------------------------

def get_or_404(obj: Any, detail: str = "Resource not found") -> Any:
    """Raise NotFoundError if obj is None/falsy, otherwise return it.

    Usage::
        item = get_or_404(db.query(StockItem).filter(...).first(), "Item not found")
    """
    if not obj:
        raise NotFoundError(detail)
    return obj


# ---------------------------------------------------------------------------
# Helper — build the standard error response body
# ---------------------------------------------------------------------------

def make_error_body(
    *,
    code: str,
    message: str,
    path: str,
    details: Any = None,
) -> dict:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details,
        },
        "path": path,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
