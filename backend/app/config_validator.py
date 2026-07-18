"""
Environment variable validation - runs on application startup.
Ensures all required production settings are configured.
"""

import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger("app")


class ConfigError(Exception):
    """Raised when configuration is invalid."""

    pass


def validate_config() -> None:
    """
    Validates all critical configuration on startup.
    Raises ConfigError if any required setting is missing or invalid.
    """
    errors: list[str] = []

    # Database URL is required
    if not settings.database_url:
        errors.append("DATABASE_URL is required")
    elif not settings.database_url.startswith(("sqlite://", "postgresql://", "postgres://")):
        errors.append(
            f"DATABASE_URL has unsupported protocol. Expected sqlite://, postgresql://, or postgres://. Got: {settings.database_url.split('://')[0] if '://' in settings.database_url else 'unknown'}"
        )

    # Gemini API key required for production
    if not settings.gemini_api_key:
        logger.warning(
            "GEMINI_API_KEY is not configured. AI features will be unavailable. "
            "Set GEMINI_API_KEY in .env to enable summarization."
        )

    # JWT secret should be explicitly set in production (not using fallback)
    if not settings.jwt_secret_key:
        logger.warning(
            "JWT_SECRET_KEY is not explicitly configured. A random per-process secret will be used. "
            "Set JWT_SECRET_KEY in .env for production so tokens survive redeploys."
        )

    # Validate upload directory is writable
    import os

    os.makedirs(settings.upload_dir, exist_ok=True)
    try:
        test_file = os.path.join(settings.upload_dir, ".write_test")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
    except Exception as e:
        errors.append(f"UPLOAD_DIR '{settings.upload_dir}' is not writable: {e}")

    # Validate CORS origins
    if not settings.cors_origins:
        errors.append("CORS_ORIGINS is required")
    try:
        origins = settings.cors_origins_list
        if not origins:
            errors.append("CORS_ORIGINS must contain at least one origin")
    except Exception as e:
        errors.append(f"CORS_ORIGINS is invalid: {e}")

    # Validate pagination settings
    if settings.default_page_size <= 0:
        errors.append("DEFAULT_PAGE_SIZE must be greater than 0")
    if settings.max_page_size <= settings.default_page_size:
        errors.append("MAX_PAGE_SIZE must be greater than DEFAULT_PAGE_SIZE")

    # Validate rate limits
    if settings.rate_limit_upload_per_minute <= 0:
        errors.append("RATE_LIMIT_UPLOAD_PER_MINUTE must be greater than 0")
    if settings.rate_limit_ai_per_minute <= 0:
        errors.append("RATE_LIMIT_AI_PER_MINUTE must be greater than 0")

    # Validate JWT settings
    if settings.jwt_access_token_expire_minutes <= 0:
        errors.append("JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be greater than 0")
    if settings.jwt_refresh_token_expire_days <= 0:
        errors.append("JWT_REFRESH_TOKEN_EXPIRE_DAYS must be greater than 0")

    # Validate upload size
    if settings.max_upload_mb <= 0:
        errors.append("MAX_UPLOAD_MB must be greater than 0")

    if errors:
        error_message = "Configuration validation failed:\n  - " + "\n  - ".join(errors)
        logger.error(error_message)
        raise ConfigError(error_message)

    logger.info("Configuration validation passed")
