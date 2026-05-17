"""
utils/cache.py — OPT-02: API Response Caching

Provides a lightweight Redis-backed cache decorator for FastAPI route handlers.
Falls back to a no-op (passthrough) cache when Redis is unavailable — the app
continues to function correctly without caching.

Usage in a route:
    from utils.cache import cache_response

    @router.get("/rates/current")
    @cache_response(ttl=300)          # cache for 5 minutes
    def get_current_rates(db=..., payload=...):
        ...

The cache key is built from:
  - The function name
  - store_id from the JWT payload (for store isolation)
  - Any query params passed as **kwargs

Redis connection is lazy — loaded once on first use from REDIS_URL env var.
"""

import functools
import hashlib
import json
import logging
import os
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

_redis_client = None
_redis_available: Optional[bool] = None

# ── Redis connection ──────────────────────────────────────────────────────────

def _get_redis():
    global _redis_client, _redis_available
    if _redis_available is False:
        return None
    if _redis_client is not None:
        return _redis_client
    try:
        import redis
        url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        _redis_client = redis.from_url(url, socket_timeout=1, socket_connect_timeout=1)
        _redis_client.ping()
        _redis_available = True
        logger.info("Redis cache connected: %s", url)
        return _redis_client
    except Exception as exc:
        _redis_available = False
        logger.warning("Redis not available (%s) — caching disabled, using passthrough", exc)
        return None


# ── Cache helpers ─────────────────────────────────────────────────────────────

def _make_key(fn_name: str, store_id: Any, **kwargs) -> str:
    raw = f"{fn_name}:store={store_id}:{json.dumps(kwargs, sort_keys=True, default=str)}"
    return "jm:" + hashlib.md5(raw.encode()).hexdigest()


def cache_get(key: str) -> Optional[Any]:
    r = _get_redis()
    if not r:
        return None
    try:
        val = r.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


def cache_set(key: str, value: Any, ttl: int = 60) -> None:
    r = _get_redis()
    if not r:
        return
    try:
        r.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        pass


def cache_invalidate(pattern: str) -> int:
    """Delete all keys matching a pattern (e.g. 'jm:*store=5*'). Returns count deleted."""
    r = _get_redis()
    if not r:
        return 0
    try:
        keys = r.keys(pattern)
        if keys:
            return r.delete(*keys)
        return 0
    except Exception:
        return 0


def cache_invalidate_store(store_id: int) -> None:
    """Invalidate all cached responses for a specific store."""
    cache_invalidate(f"jm:*store={store_id}*")


# ── Decorator ────────────────────────────────────────────────────────────────

def cache_response(ttl: int = 60, key_suffix: str = ""):
    """
    Decorator that caches the return value of a FastAPI route handler in Redis.

    Args:
        ttl:        Cache TTL in seconds (default: 60)
        key_suffix: Optional extra string to disambiguate cache keys

    The decorated function MUST have `payload: dict` in its signature
    (standard dependency injection pattern used throughout this app).
    The store_id is extracted from payload to isolate cache per store.

    Example:
        @router.get("/dashboard")
        @cache_response(ttl=120)
        def get_dashboard(db=Depends(get_db), payload=Depends(require_staff)):
            ...
    """
    def decorator(fn: Callable):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            payload = kwargs.get("payload") or {}
            store_id = payload.get("store_id", "global")

            # Build cache key from function name + store + any primitive kwargs
            cacheable_kwargs = {
                k: v for k, v in kwargs.items()
                if k not in ("db", "payload") and isinstance(v, (str, int, float, bool, type(None)))
            }
            key = _make_key(fn.__name__ + key_suffix, store_id, **cacheable_kwargs)

            # Try to serve from cache
            cached = cache_get(key)
            if cached is not None:
                logger.debug("Cache HIT: %s", key)
                return cached

            # Call the actual function
            result = fn(*args, **kwargs)

            # Store in cache (only serialisable results)
            try:
                cache_set(key, result, ttl)
                logger.debug("Cache SET: %s (ttl=%ds)", key, ttl)
            except Exception:
                pass  # non-serialisable (e.g. StreamingResponse) — skip cache

            return result
        return wrapper
    return decorator
