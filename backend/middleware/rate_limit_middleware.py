"""
Rate limiting middleware using slowapi (wraps limits library).

Usage in route handlers:
    from middleware.rate_limit_middleware import limiter

    @router.post("/login")
    @limiter.limit("5/minute")
    async def login(request: Request, ...):
        ...

The limiter is keyed on the client's IP address.
In production behind a reverse proxy, configure FORWARDED_ALLOW_IPS so the
real client IP is read from X-Forwarded-For.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])
