"""
Standardized error codes and responses for consistent API error handling.
"""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel


class ErrorCode(str, Enum):
    """Standard error codes for API responses."""

    # Authentication errors
    AUTH_MISSING = "AUTH_MISSING"
    AUTH_INVALID = "AUTH_INVALID"
    AUTH_EXPIRED = "AUTH_EXPIRED"
    AUTH_INSUFFICIENT = "AUTH_INSUFFICIENT"

    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_MIME_TYPE = "INVALID_MIME_TYPE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    INVALID_INPUT = "INVALID_INPUT"

    # Resource errors
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"

    # Rate limiting
    RATE_LIMITED = "RATE_LIMITED"

    # Server errors
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    TIMEOUT = "TIMEOUT"

    # Application specific
    MEETING_PROCESSING_FAILED = "MEETING_PROCESSING_FAILED"
    TRANSCRIPTION_FAILED = "TRANSCRIPTION_FAILED"
    SUMMARIZATION_FAILED = "SUMMARIZATION_FAILED"
    AI_SERVICE_ERROR = "AI_SERVICE_ERROR"


class ErrorResponse(BaseModel):
    """Standardized error response structure."""

    code: ErrorCode
    message: str
    detail: Optional[str] = None
    request_id: Optional[str] = None

    class Config:
        use_enum_values = True


def create_error_response(
    code: ErrorCode,
    message: str,
    detail: Optional[str] = None,
    request_id: Optional[str] = None,
) -> dict[str, Any]:
    """
    Create a standardized error response.

    Args:
        code: Error code
        message: Human-readable error message
        detail: Optional additional detail
        request_id: Optional request ID for tracking

    Returns:
        Error response dict
    """
    return {
        "code": code.value,
        "message": message,
        "detail": detail,
        "request_id": request_id,
    }
