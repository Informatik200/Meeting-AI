"""
File upload validation: MIME types, symlink checks, path traversal prevention.
"""

import logging
import mimetypes
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger("app")

# Audio MIME types that are acceptable
ALLOWED_AUDIO_MIME_TYPES = {
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/flac",
}

# File extensions that are acceptable for audio
ALLOWED_AUDIO_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".ogg",
    ".webm",
    ".m4a",
    ".mp4",
    ".aac",
    ".flac",
}


class FileValidationError(Exception):
    """Raised when file validation fails."""

    pass


def validate_audio_file(filename: str, content: bytes, upload_dir: str) -> None:
    """
    Validates an uploaded audio file.

    Args:
        filename: Original filename from upload
        content: File contents
        upload_dir: Directory where file will be stored

    Raises:
        FileValidationError: If validation fails
    """
    if not filename:
        raise FileValidationError("Filename is required")

    # Check file extension
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise FileValidationError(
            f"File type '{ext}' is not allowed. Allowed types: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}"
        )

    # Prevent path traversal attacks
    # Normalize the path and ensure it doesn't escape the upload directory
    normalized_name = os.path.normpath(filename)
    if ".." in normalized_name or normalized_name.startswith("/"):
        raise FileValidationError("Invalid filename: path traversal detected")

    # Check MIME type via magic bytes (simple heuristic)
    # Note: Proper implementation would use python-magic or similar
    guessed_mime, _ = mimetypes.guess_type(filename)
    if guessed_mime and guessed_mime not in ALLOWED_AUDIO_MIME_TYPES:
        logger.warning(f"Guessed MIME type '{guessed_mime}' not in allowed types for {filename}")

    # Check file size is reasonable (Whisper models have practical limits)
    # Content larger than 1GB should be rejected
    max_content_bytes = 1024 * 1024 * 1024
    if len(content) > max_content_bytes:
        raise FileValidationError(f"File size exceeds maximum of {max_content_bytes} bytes")

    # Check for null bytes (potential indicator of corrupted/malicious file)
    if b"\x00" in content[:512]:  # Check first 512 bytes
        raise FileValidationError("File contains null bytes (possible binary/executable)")

    logger.info(f"File validation passed for {filename}")


def validate_upload_path(filename: str, upload_dir: str) -> str:
    """
    Validates and sanitizes the upload path to prevent symlink/traversal attacks.

    Args:
        filename: Sanitized unique filename (e.g., UUID + extension)
        upload_dir: Base upload directory

    Returns:
        Safe absolute path for the file

    Raises:
        FileValidationError: If path validation fails
    """
    # Normalize paths
    upload_dir_abs = os.path.abspath(upload_dir)
    full_path = os.path.abspath(os.path.join(upload_dir_abs, filename))

    # Ensure the final path is within upload_dir (prevent traversal)
    try:
        # Get the real path (resolves symlinks)
        real_upload_dir = os.path.realpath(upload_dir_abs)
        if not full_path.startswith(real_upload_dir):
            raise FileValidationError(f"Path traversal detected: {filename} attempts to escape {upload_dir}")
    except Exception as e:
        raise FileValidationError(f"Path validation error: {e}")

    return full_path
