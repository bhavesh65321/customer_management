"""
Auth & Request Logging Middleware
==================================
Logs every request as a structured JSON line including:
  - timestamp, method, path, status_code, duration_ms
  - user_id, role, store_id (extracted from JWT when present)

Logs are written to:
  - stdout (always)
  - logs/requests.log (rotating, 10 MB × 5 files)
"""

import json
import logging
import logging.handlers
import os
import time
from pathlib import Path
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from utils.auth_utils import verify_token

# ---------------------------------------------------------------------------
# Logger setup
# ---------------------------------------------------------------------------

_LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
_LOG_DIR.mkdir(parents=True, exist_ok=True)

_logger = logging.getLogger("request_log")
_logger.setLevel(logging.INFO)
_logger.propagate = False  # don't double-log to root

if not _logger.handlers:
    # Console handler
    _ch = logging.StreamHandler()
    _ch.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(_ch)

    # Rotating file handler — 10 MB × 5 backups
    _fh = logging.handlers.RotatingFileHandler(
        _LOG_DIR / "requests.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    _fh.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(_fh)


# ---------------------------------------------------------------------------
# Paths that are public (no token expected — skip auth warning)
# ---------------------------------------------------------------------------

_PUBLIC_PREFIXES = (
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/owner-register",
    "/api/auth/verify-2fa",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/customer/register",
    "/api/auth/companies",
    "/uploads/",
    "/",
)


def _extract_token_info(request: Request) -> dict:
    """Try to pull user context from Authorization header without failing."""
    info: dict = {"user_id": None, "role": None, "store_id": None}
    auth_header: Optional[str] = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return info
    token = auth_header.split(" ", 1)[1]
    payload = verify_token(token)
    if payload:
        info["user_id"] = payload.get("user_id")
        info["role"] = payload.get("role")
        info["store_id"] = payload.get("store_id")
    return info


# ---------------------------------------------------------------------------
# Middleware class
# ---------------------------------------------------------------------------

class AuthLoggingMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware that:
      1. Logs each request/response as a JSON line.
      2. Does NOT enforce auth — that stays in FastAPI dependencies.
         This middleware only observes and logs.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()

        token_info = _extract_token_info(request)

        response: Response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        log_entry = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "user_id": token_info["user_id"],
            "role": token_info["role"],
            "store_id": token_info["store_id"],
            "ip": (request.client.host if request.client else None),
        }

        _logger.info(json.dumps(log_entry))
        return response
