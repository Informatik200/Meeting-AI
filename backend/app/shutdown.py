"""
Graceful shutdown handling with signal management.
Ensures proper cleanup on termination.
"""

import asyncio
import logging
import signal
import sys
from typing import Any, Callable

logger = logging.getLogger("app")


class GracefulShutdown:
    """Manages graceful shutdown with configurable timeout."""

    def __init__(self, timeout_seconds: int = 30):
        self.timeout_seconds = timeout_seconds
        self._shutdown_event: asyncio.Event | None = None
        self._handlers: list[Callable[[], Any]] = []

    def add_handler(self, handler: Callable[[], Any]) -> None:
        """Register a cleanup handler to run on shutdown."""
        self._handlers.append(handler)

    def _handle_signal(self, signum: int, frame: Any) -> None:
        """Signal handler for SIGTERM and SIGINT."""
        signal_name = signal.Signals(signum).name
        logger.info(f"Received {signal_name}, initiating graceful shutdown")
        if self._shutdown_event:
            self._shutdown_event.set()

    async def setup_signal_handlers(self) -> None:
        """Setup signal handlers for graceful shutdown."""
        self._shutdown_event = asyncio.Event()
        loop = asyncio.get_event_loop()

        # Register handlers for SIGTERM and SIGINT
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, self._handle_signal, sig, None)

        logger.info("Graceful shutdown handlers registered")

    async def wait_for_shutdown(self) -> None:
        """Wait for shutdown signal."""
        if self._shutdown_event:
            await self._shutdown_event.wait()

    async def run_cleanup(self) -> None:
        """Run all registered cleanup handlers."""
        logger.info(f"Running {len(self._handlers)} cleanup handler(s)")
        try:
            for handler in self._handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await asyncio.wait_for(handler(), timeout=5)
                    else:
                        handler()
                except asyncio.TimeoutError:
                    logger.error("Cleanup handler timed out")
                except Exception as e:
                    logger.error(f"Error in cleanup handler: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Error during cleanup: {e}", exc_info=True)


_shutdown = GracefulShutdown()


def get_shutdown_manager() -> GracefulShutdown:
    """Get the global shutdown manager instance."""
    return _shutdown
