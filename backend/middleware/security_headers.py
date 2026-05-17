"""
Security headers middleware (SEC-05).

Adds standard HTTP security headers to every response to protect against
common web attacks: clickjacking, MIME sniffing, XSS, referrer leakage.

Registered in main.py via app.add_middleware(SecurityHeadersMiddleware).
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add OWASP-recommended security headers to every HTTP response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent MIME-type sniffing attacks
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Block the page from being displayed in an iframe (clickjacking)
        response.headers["X-Frame-Options"] = "DENY"

        # Legacy XSS filter for older browsers (modern browsers use CSP)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Control how much referrer info is sent with requests
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Disable dangerous browser features not needed by this app
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=()"
        )

        # HSTS: only sent over HTTPS — forces browsers to use HTTPS for 1 year
        # (Only effective when deployed with HTTPS; harmless over HTTP)
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        return response
