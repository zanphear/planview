"""Redis-backed rate limiter middleware.

A fixed-window counter (INCR + EXPIRE) keyed by client IP, stored in Redis so the
limit is enforced consistently across multiple backend workers (ADR 0002). If
Redis is unreachable the middleware fails OPEN (allows the request) and logs a
warning; it never crashes the request path.
"""
import time

import redis.asyncio as redis
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 300):
        super().__init__(app)
        self.rpm = requests_per_minute
        self.window = 60  # seconds
        self._redis: redis.Redis | None = None

    def _client(self) -> redis.Redis:
        # Lazily created once per process; from_url does not connect eagerly.
        if self._redis is None:
            self._redis = redis.from_url(settings.redis_url, decode_responses=True)
        return self._redis

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for WebSocket and health checks
        if request.url.path in ("/health", "/ws") or request.url.path.startswith("/ws/"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        # Fixed window: bucket key rolls over every `window` seconds.
        window_id = int(time.time()) // self.window
        key = f"ratelimit:{client_ip}:{window_id}"

        try:
            r = self._client()
            count = await r.incr(key)
            if count == 1:
                # First hit in this window: set the expiry so the key self-cleans.
                await r.expire(key, self.window)
        except Exception:
            # Fail open: never let a Redis outage take down the API.
            logger.warning("rate_limit_redis_unavailable", client_ip=client_ip, exc_info=True)
            return await call_next(request)

        if count > self.rpm:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(self.window)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.rpm)
        response.headers["X-RateLimit-Remaining"] = str(max(0, self.rpm - count))
        return response
