"""
Minimal in-memory fixed-window rate limiter, keyed per client IP.

Deliberately dependency-free and single-process: this app runs as one
worker today. If Phase 2 moves to multiple workers/processes behind a
queue, swap the bucket store here for a Redis-backed one without
changing any call site - every route already depends on this via
`Depends(rate_limiter(...))`.
"""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from app.config import settings


def rate_limiter(max_requests: int, window_seconds: int = 60):
    buckets: dict[str, deque] = defaultdict(deque)

    def dependency(request: Request) -> None:
        if not settings.rate_limit_enabled:
            return

        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        bucket = buckets[key]

        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()

        if len(bucket) >= max_requests:
            raise HTTPException(429, "Too many requests. Please slow down and try again shortly.")

        bucket.append(now)

    return dependency
