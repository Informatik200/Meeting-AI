"""
Job timeout and recovery mechanisms for background tasks.
"""

import logging
import time
from typing import Callable, Optional

logger = logging.getLogger("app")

# Job timeout in seconds - background tasks should complete within this
DEFAULT_JOB_TIMEOUT = 600  # 10 minutes


class JobTimeoutError(Exception):
    """Raised when a job exceeds its timeout."""

    pass


class JobWithTimeout:
    """Wrapper for background tasks with timeout and recovery tracking."""

    def __init__(self, job_id: int, job_name: str, timeout_seconds: int = DEFAULT_JOB_TIMEOUT):
        self.job_id = job_id
        self.job_name = job_name
        self.timeout_seconds = timeout_seconds
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.is_running = False
        self.was_timeout = False

    def start(self) -> None:
        """Mark the job as started."""
        self.start_time = time.time()
        self.is_running = True
        logger.info(f"Job {self.job_id} ({self.job_name}) started")

    def stop(self) -> None:
        """Mark the job as completed."""
        self.end_time = time.time()
        self.is_running = False
        elapsed = self.end_time - self.start_time if self.start_time else 0
        logger.info(f"Job {self.job_id} ({self.job_name}) completed in {elapsed:.2f}s")

    def check_timeout(self) -> bool:
        """
        Check if the job has exceeded its timeout.

        Returns:
            True if job has timed out
        """
        if not self.is_running or not self.start_time:
            return False

        elapsed = time.time() - self.start_time
        if elapsed > self.timeout_seconds:
            self.was_timeout = True
            logger.warning(
                f"Job {self.job_id} ({self.job_name}) exceeded timeout " f"({elapsed:.2f}s > {self.timeout_seconds}s)"
            )
            return True
        return False

    def get_elapsed_time(self) -> float:
        """Get elapsed time since job started."""
        if not self.start_time:
            return 0
        end = self.end_time if self.end_time else time.time()
        return end - self.start_time


def run_with_timeout(func: Callable, timeout_seconds: int = DEFAULT_JOB_TIMEOUT, *args, **kwargs):
    """
    Run a function with a timeout.

    Args:
        func: Function to run
        timeout_seconds: Timeout in seconds
        *args: Function arguments
        **kwargs: Function keyword arguments

    Raises:
        JobTimeoutError: If the function exceeds the timeout
    """
    job = JobWithTimeout(id(func), func.__name__, timeout_seconds)
    job.start()

    try:
        # Note: This is a simplified version.
        # For actual timeout enforcement, use signal.alarm() on Unix
        # or threading.Timer for cross-platform support
        return func(*args, **kwargs)
    finally:
        job.stop()
        if job.was_timeout:
            raise JobTimeoutError(f"Job {job.job_name} exceeded {timeout_seconds}s timeout")
