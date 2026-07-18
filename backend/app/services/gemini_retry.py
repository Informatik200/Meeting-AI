"""
Gemini API calls with exponential backoff retry logic.
Handles transient failures gracefully.
"""

import logging
import time
from typing import Any, Callable, TypeVar

import google.api_core.exceptions

logger = logging.getLogger("app")

T = TypeVar("T")

# Retry configuration
INITIAL_WAIT_SECONDS = 1
MAX_WAIT_SECONDS = 32
MAX_RETRIES = 5
BACKOFF_MULTIPLIER = 2.0


class GeminiRetryError(Exception):
    """Raised when Gemini API calls fail after all retries."""

    pass


def should_retry(error: Exception) -> bool:
    """
    Determines if an error is transient and should trigger a retry.

    Args:
        error: The exception that occurred

    Returns:
        True if the error is transient and retry should occur
    """
    # Transient Google API errors
    if isinstance(error, google.api_core.exceptions.TooManyRequests):
        return True
    if isinstance(error, google.api_core.exceptions.ServiceUnavailable):
        return True
    if isinstance(error, google.api_core.exceptions.InternalServerError):
        return True
    if isinstance(error, google.api_core.exceptions.DeadlineExceeded):
        return True

    # Network-related errors
    if isinstance(error, (TimeoutError, ConnectionError, OSError)):
        return True

    # Do not retry on client errors (400-level)
    if isinstance(error, google.api_core.exceptions.BadRequest):
        return False
    if isinstance(error, google.api_core.exceptions.Unauthenticated):
        return False
    if isinstance(error, google.api_core.exceptions.PermissionDenied):
        return False
    if isinstance(error, google.api_core.exceptions.NotFound):
        return False

    return False


def retry_with_backoff(func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """
    Execute a function with exponential backoff retry logic.

    Args:
        func: Callable to execute
        *args: Positional arguments for func
        **kwargs: Keyword arguments for func

    Returns:
        Result of the function call

    Raises:
        GeminiRetryError: If all retries are exhausted
    """
    last_error: Exception | None = None
    wait_time = INITIAL_WAIT_SECONDS

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.debug(f"Attempt {attempt}/{MAX_RETRIES} for {func.__name__}")
            return func(*args, **kwargs)
        except Exception as e:
            last_error = e

            if not should_retry(e):
                logger.error(f"Non-retryable error in {func.__name__}: {e}")
                raise

            if attempt < MAX_RETRIES:
                logger.warning(
                    f"Attempt {attempt} failed (retryable), waiting {wait_time}s before retry: {e}"
                )
                time.sleep(wait_time)
                wait_time = min(wait_time * BACKOFF_MULTIPLIER, MAX_WAIT_SECONDS)
            else:
                logger.error(f"All {MAX_RETRIES} attempts failed for {func.__name__}")

    # Should not reach here, but raise if we do
    raise GeminiRetryError(
        f"Failed after {MAX_RETRIES} retries for {func.__name__}"
    ) from last_error
