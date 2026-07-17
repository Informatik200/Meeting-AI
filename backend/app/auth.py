"""
Authentication core: password hashing, JWT access/media tokens, DB-backed
refresh tokens (hashed, rotatable, revocable), Google ID token verification,
and the get_current_user dependency used to protect every meeting endpoint.
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.config import settings
from app.database import RefreshToken, User, get_db

logger = logging.getLogger("app")

ALGORITHM = "HS256"
REFRESH_TOKEN_BYTES = 48

_bearer_scheme = HTTPBearer(auto_error=False)
_google_request = google_requests.Request()

# Generated once per process if JWT_SECRET_KEY isn't configured, so local dev
# works without setup. Tokens issued with it don't survive a restart - set
# JWT_SECRET_KEY explicitly in production.
_fallback_secret: Optional[str] = None


def _get_jwt_secret() -> str:
    global _fallback_secret
    if settings.jwt_secret_key:
        return settings.jwt_secret_key
    if _fallback_secret is None:
        _fallback_secret = secrets.token_hex(32)
        logger.warning(
            "JWT_SECRET_KEY is not configured - using an ephemeral per-process secret. "
            "All issued tokens will be invalidated on restart. Set JWT_SECRET_KEY in production."
        )
    return _fallback_secret


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


# ---------------------------------------------------------------------------
# Access / media JWTs (stateless, short-lived)
# ---------------------------------------------------------------------------


def _create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "type": token_type, "iat": now, "exp": now + expires_delta}
    return jwt.encode(payload, _get_jwt_secret(), algorithm=ALGORITHM)


def create_access_token(user_id: int) -> str:
    return _create_token(str(user_id), "access", timedelta(minutes=settings.jwt_access_token_expire_minutes))


def create_media_token(meeting_id: int) -> str:
    return _create_token(str(meeting_id), "media", timedelta(minutes=settings.media_token_expire_minutes))


def decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[ALGORITHM])
    except jwt.PyJWTError as e:
        raise HTTPException(401, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"}) from e
    if payload.get("type") != expected_type:
        raise HTTPException(401, "Invalid token type", headers={"WWW-Authenticate": "Bearer"})
    return payload


def verify_media_token(token: str, meeting_id: int) -> bool:
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return False
    return payload.get("type") == "media" and payload.get("sub") == str(meeting_id)


# ---------------------------------------------------------------------------
# Refresh tokens (opaque, DB-backed, hashed at rest, rotatable/revocable)
# ---------------------------------------------------------------------------


def _hash_refresh_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _as_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def issue_refresh_token(db: Session, user_id: int) -> str:
    raw_token = secrets.token_urlsafe(REFRESH_TOKEN_BYTES)
    record = RefreshToken(
        user_id=user_id,
        token_hash=_hash_refresh_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    db.add(record)
    db.commit()
    return raw_token


def rotate_refresh_token(db: Session, raw_token: str) -> Optional[tuple[str, User]]:
    """Validates and revokes the given refresh token, issuing a new one.

    Returns (new_raw_token, user), or None if the token is missing, expired,
    or already revoked (e.g. reused after logout, or after a prior refresh -
    each refresh token is single-use).
    """
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == _hash_refresh_token(raw_token)).first()

    now = datetime.now(timezone.utc)
    if not record or record.revoked_at is not None or _as_utc(record.expires_at) < now:
        return None

    record.revoked_at = now
    db.commit()

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        return None

    return issue_refresh_token(db, user.id), user


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == _hash_refresh_token(raw_token)).first()
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(timezone.utc)
        db.commit()


# ---------------------------------------------------------------------------
# Google Sign-In
# ---------------------------------------------------------------------------


def verify_google_id_token(token: str) -> dict:
    if not settings.google_client_id:
        raise HTTPException(400, "Google sign-in is not configured on this server.")
    try:
        claims = google_id_token.verify_oauth2_token(token, _google_request, settings.google_client_id)
    except ValueError as e:
        raise HTTPException(401, "Invalid Google sign-in token.") from e
    if not claims.get("email_verified", False):
        raise HTTPException(401, "Google account email is not verified.")
    return claims


# ---------------------------------------------------------------------------
# Request-scoped current-user dependency
# ---------------------------------------------------------------------------


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(401, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})

    payload = decode_token(credentials.credentials, expected_type="access")
    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError, TypeError) as e:
        raise HTTPException(401, "Invalid authentication credentials", headers={"WWW-Authenticate": "Bearer"}) from e

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "Invalid authentication credentials", headers={"WWW-Authenticate": "Bearer"})
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Like get_current_user, but returns None instead of raising when no/invalid
    credentials are present. Used by endpoints that also accept a media token
    (audio, PDF) as an alternative auth path for requests that can't carry an
    Authorization header, such as <audio src> or <a href> downloads."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None
