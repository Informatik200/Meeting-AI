import time

import pytest
from fastapi import HTTPException

from app.config import settings
from app.rate_limit import rate_limiter


class FakeClient:
    host = "1.2.3.4"


class FakeRequest:
    client = FakeClient()


def test_rate_limiter_blocks_after_limit_and_resets_after_window():
    original_enabled = settings.rate_limit_enabled
    settings.rate_limit_enabled = True
    try:
        dependency = rate_limiter(max_requests=3, window_seconds=1)
        request = FakeRequest()

        # First 3 requests within the window are allowed
        for _ in range(3):
            dependency(request)

        # 4th request within the same window is rejected
        with pytest.raises(HTTPException) as exc_info:
            dependency(request)
        assert exc_info.value.status_code == 429

        # After the window elapses, requests are allowed again
        time.sleep(1.1)
        dependency(request)
    finally:
        settings.rate_limit_enabled = original_enabled


def test_rate_limiter_noop_when_disabled():
    original_enabled = settings.rate_limit_enabled
    settings.rate_limit_enabled = False
    try:
        dependency = rate_limiter(max_requests=1, window_seconds=60)
        request = FakeRequest()
        # Exceeds max_requests, but limiter is disabled so nothing should raise
        for _ in range(5):
            dependency(request)
    finally:
        settings.rate_limit_enabled = original_enabled


def test_rate_limiter_keys_by_client_ip_independently():
    dependency = rate_limiter(max_requests=1, window_seconds=60)

    class ClientA(FakeRequest):
        client = type("C", (), {"host": "1.1.1.1"})()

    class ClientB(FakeRequest):
        client = type("C", (), {"host": "2.2.2.2"})()

    original_enabled = settings.rate_limit_enabled
    settings.rate_limit_enabled = True
    try:
        dependency(ClientA())
        dependency(ClientB())  # different IP, independent bucket, should not raise
        with pytest.raises(HTTPException):
            dependency(ClientA())
    finally:
        settings.rate_limit_enabled = original_enabled
