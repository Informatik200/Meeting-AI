import json
import logging
import mimetypes
import os
import uuid
from typing import Optional

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import auth
from app.auth import get_current_user, get_current_user_optional
from app.config import settings
from app.database import Meeting, User, get_db, init_db
from app.logging_config import configure_logging
from app.rate_limit import rate_limiter
from app.services.ai_summary import summarize_transcript
from app.services.pipeline import process_meeting

configure_logging(settings.log_level)
logger = logging.getLogger("app")

app = FastAPI(title="Meeting AI Assistant")

# Allowed origins come from CORS_ORIGINS (comma-separated), defaulting to local
# dev. Set it to the real frontend domain(s) in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.upload_dir, exist_ok=True)

REFRESH_COOKIE_NAME = "refresh_token"

# Shared per-IP rate limit buckets: one for uploads, one for all AI-backed
# endpoints (chat, global chat, regenerate) so usage can't be spread across
# routes to dodge the limit.
_upload_rate_limit = rate_limiter(settings.rate_limit_upload_per_minute)
_ai_rate_limit = rate_limiter(settings.rate_limit_ai_per_minute)


@app.on_event("startup")
def on_startup():
    os.makedirs(settings.upload_dir, exist_ok=True)
    init_db()


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    checks = {"database": False, "ai_service_configured": bool(settings.gemini_api_key)}

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        logger.error("Health check: database unreachable", exc_info=True)

    if not checks["database"]:
        return JSONResponse(status_code=503, content={"status": "unhealthy", "checks": checks})

    status = "ok" if checks["ai_service_configured"] else "degraded"
    return {"status": status, "checks": checks}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class UserOut(BaseModel):
    id: int
    email: str
    name: Optional[str]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
        # Scoped to /auth so this cookie isn't sent on every ordinary API
        # call - only the endpoints that actually need it.
        path="/auth",
    )


def _issue_tokens(user: User, response: Response, db: Session) -> TokenResponse:
    access_token = auth.create_access_token(user.id)
    refresh_token = auth.issue_refresh_token(db, user.id)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token, user=UserOut(id=user.id, email=user.email, name=user.name))


@app.post("/auth/register", response_model=TokenResponse)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if "@" not in email or len(body.password) < 8:
        raise HTTPException(400, "A valid email and a password of at least 8 characters are required.")

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "An account with this email already exists.")

    user = User(email=email, hashed_password=auth.hash_password(body.password), name=body.name)
    db.add(user)
    db.commit()
    db.refresh(user)

    return _issue_tokens(user, response, db)


@app.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.hashed_password or not auth.verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password.")
    return _issue_tokens(user, response, db)


@app.post("/auth/google", response_model=TokenResponse)
def google_auth(body: GoogleAuthRequest, response: Response, db: Session = Depends(get_db)):
    claims = auth.verify_google_id_token(body.id_token)
    google_id = claims["sub"]
    email = claims["email"].strip().lower()

    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        # Link to an existing email/password account with the same email,
        # otherwise this is a brand new user.
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.google_id = google_id
        else:
            user = User(email=email, google_id=google_id, name=claims.get("name"))
            db.add(user)
        db.commit()
        db.refresh(user)

    return _issue_tokens(user, response, db)


@app.post("/auth/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(401, "No refresh token provided.")

    result = auth.rotate_refresh_token(db, raw_token)
    if not result:
        response.delete_cookie(REFRESH_COOKIE_NAME, path="/auth")
        raise HTTPException(401, "Refresh token is invalid or expired. Please log in again.")

    new_refresh_token, user = result
    _set_refresh_cookie(response, new_refresh_token)
    access_token = auth.create_access_token(user.id)
    return TokenResponse(access_token=access_token, user=UserOut(id=user.id, email=user.email, name=user.name))


@app.post("/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        auth.revoke_refresh_token(db, raw_token)
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/auth")
    return {"status": "success"}


@app.get("/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut(id=current_user.id, email=current_user.email, name=current_user.name)


# ---------------------------------------------------------------------------
# Meetings
# ---------------------------------------------------------------------------


def _authorize_media_access(
    meeting: Optional[Meeting], meeting_id: int, current_user: Optional[User], token: Optional[str]
) -> Meeting:
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    owned_by_header_auth = current_user is not None and meeting.owner_id == current_user.id
    owned_by_media_token = token is not None and auth.verify_media_token(token, meeting_id)
    if not (owned_by_header_auth or owned_by_media_token):
        raise HTTPException(404, "Meeting not found")
    return meeting


@app.post("/meetings/upload", dependencies=[Depends(_upload_rate_limit)])
async def upload_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accepts an audio file, saves it, and schedules transcription + summarization
    as a background task. Returns immediately with status="transcribing" - the
    request does not wait for the pipeline to finish. Poll GET /meetings/{id}
    (or GET /meetings) to observe status transition to "done" or "failed".
    """
    allowed_extensions = {".mp3", ".wav", ".m4a", ".webm", ".ogg", ".mp4"}
    if not file.filename:
        raise HTTPException(400, "An audio filename is required")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    # Save the uploaded file to disk with a unique name so filenames never collide.
    # Stream it in chunks and enforce the size cap as we go, rather than trusting
    # a possibly-absent/incorrect Content-Length header.
    max_upload_bytes = settings.max_upload_mb * 1024 * 1024
    unique_name = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(settings.upload_dir, unique_name)
    total_bytes = 0
    size_exceeded = False
    try:
        with open(save_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > max_upload_bytes:
                    size_exceeded = True
                    break
                f.write(chunk)
    finally:
        await file.close()

    if size_exceeded:
        os.remove(save_path)
        raise HTTPException(413, f"Audio file exceeds the {settings.max_upload_mb}MB upload limit.")

    meeting = Meeting(owner_id=current_user.id, audio_path=save_path, status="transcribing")
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    background_tasks.add_task(process_meeting, meeting.id)

    return _meeting_to_dict(meeting)


@app.get("/meetings")
def list_meetings(
    response: Response,
    limit: int = Query(default=None, ge=1, le=settings.max_page_size),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    effective_limit = limit or settings.default_page_size
    base_query = db.query(Meeting).filter(Meeting.owner_id == current_user.id)
    total = base_query.count()
    meetings = base_query.order_by(Meeting.created_at.desc()).offset(offset).limit(effective_limit).all()
    response.headers["X-Total-Count"] = str(total)
    return [_meeting_to_dict(m) for m in meetings]


@app.get("/meetings/{meeting_id}")
def get_meeting(meeting_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    return _meeting_to_dict(meeting)


def _serve_audio_file(request: Request, file_path: str) -> Response:
    """
    Serves a local audio file with HTTP Range request support.

    starlette.responses.FileResponse (as pinned - 0.38.6) doesn't implement
    Range requests at all: it always streams the entire file and never sends
    Accept-Ranges, regardless of a Range header on the request. Without that,
    <audio> elements can't reliably seek - browsers report the seekable time
    range as [0, 0] until the whole file has downloaded, so seeking before
    that silently resets currentTime to 0. The StaticFiles mount this
    endpoint replaced (for auth) supported Range requests natively, so this
    is a regression relative to that, not a pre-existing limitation.
    """
    file_size = os.path.getsize(file_path)
    media_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"

    range_header = request.headers.get("range")
    if range_header:
        try:
            range_spec = range_header.strip().removeprefix("bytes=")
            start_str, _, end_str = range_spec.partition("-")
            start = int(start_str) if start_str else 0
            end = min(int(end_str), file_size - 1) if end_str else file_size - 1
        except ValueError:
            start, end = 0, file_size - 1

        if start > end or start >= file_size:
            return Response(status_code=416, headers={"Content-Range": f"bytes */{file_size}"})

        with open(file_path, "rb") as f:
            f.seek(start)
            chunk = f.read(end - start + 1)

        return Response(
            content=chunk,
            status_code=206,
            media_type=media_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(len(chunk)),
            },
        )

    return FileResponse(file_path, media_type=media_type, headers={"Accept-Ranges": "bytes"})


@app.get("/meetings/{meeting_id}/audio")
def get_meeting_audio(
    request: Request,
    meeting_id: int,
    token: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Serves a meeting's audio file. <audio src> can't carry an Authorization
    header, so this also accepts a short-lived per-meeting `token` (see
    _meeting_to_dict's media_token) as an alternative to header-based auth.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    meeting = _authorize_media_access(meeting, meeting_id, current_user, token)

    if not meeting.audio_path or not os.path.exists(meeting.audio_path):
        raise HTTPException(404, "Audio file not found")

    return _serve_audio_file(request, meeting.audio_path)


@app.get("/meetings/{meeting_id}/pdf")
def get_meeting_pdf(
    meeting_id: int,
    lang: str = "en",
    token: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    meeting = _authorize_media_access(meeting, meeting_id, current_user, token)

    from app.services.pdf_generator import generate_pdf

    meeting_dict = _meeting_to_dict(meeting)
    pdf_bytes = generate_pdf(meeting_dict, lang=lang)

    headers = {"Content-Disposition": f"attachment; filename=meeting-{meeting_id}.pdf"}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


class GlobalChatRequest(BaseModel):
    message: str


@app.post("/meetings/global/chat", dependencies=[Depends(_ai_rate_limit)])
def global_chat(
    request: GlobalChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    from app.services.memory import answer_global_chat

    try:
        answer = answer_global_chat(request.message, current_user.id, db)
        return {"response": answer}
    except Exception:
        logger.error("Global chat failed", exc_info=True)
        raise HTTPException(500, "Could not process the chat request. Please try again.")


class ChatRequest(BaseModel):
    message: str


@app.post("/meetings/{meeting_id}/chat", dependencies=[Depends(_ai_rate_limit)])
def chat_about_meeting(
    meeting_id: int,
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    if not meeting.transcript:
        raise HTTPException(400, "Meeting transcript is empty or not available yet")

    from app.services.ai_summary import answer_meeting_chat

    try:
        answer = answer_meeting_chat(request.message, meeting.transcript)
        return {"response": answer}
    except Exception:
        logger.error("Chat processing failed for meeting_id=%s", meeting_id, exc_info=True)
        raise HTTPException(500, "Could not process the chat request. Please try again.")


@app.get("/meetings/{meeting_id}/metadata")
def get_meeting_metadata(
    meeting_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    from app.services.memory import get_meeting_entities_and_related

    try:
        metadata = get_meeting_entities_and_related(meeting_id, current_user.id, db)
        return metadata
    except Exception:
        logger.error("Failed to retrieve metadata for meeting_id=%s", meeting_id, exc_info=True)
        raise HTTPException(500, "Could not retrieve recording metadata. Please try again.")


class RegenerateRequest(BaseModel):
    recording_type: str


@app.post("/meetings/{meeting_id}/regenerate", dependencies=[Depends(_ai_rate_limit)])
def regenerate_meeting_analysis(
    meeting_id: int,
    request: RegenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    if not meeting.transcript:
        raise HTTPException(400, "Meeting transcript is empty or not available yet")

    valid_types = {"Business Meeting", "Lecture", "Interview", "Personal Notes", "Podcast / Discussion", "Unknown"}
    if request.recording_type not in valid_types:
        raise HTTPException(400, f"Invalid recording type: {request.recording_type}")

    meeting.recording_type = request.recording_type
    meeting.confidence = 100  # Manual override is 100% confident
    db.commit()

    try:
        ai_result = summarize_transcript(meeting.transcript, recording_type=request.recording_type)

        meeting.title = ai_result.get("title", "Untitled Meeting")
        meeting.summary = ai_result.get("summary", "")
        meeting.key_points = json.dumps(ai_result.get("key_points", []))
        meeting.decisions = json.dumps(ai_result.get("decisions", []))
        meeting.action_items = json.dumps(ai_result.get("action_items", []))
        meeting.status = "done"
        db.commit()
    except Exception:
        meeting.status = "failed"
        db.commit()
        logger.error("Regeneration failed for meeting_id=%s", meeting_id, exc_info=True)
        raise HTTPException(500, "Regeneration failed. Please try again.")

    return _meeting_to_dict(meeting)


class RenameRequest(BaseModel):
    title: str


@app.put("/meetings/{meeting_id}")
def rename_meeting(
    meeting_id: int,
    request: RenameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    meeting.title = request.title
    db.commit()
    return _meeting_to_dict(meeting)


@app.delete("/meetings/{meeting_id}")
def delete_meeting(meeting_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    db.delete(meeting)
    db.commit()
    return {"status": "success"}


def _meeting_to_dict(meeting: Meeting) -> dict:
    return {
        "id": meeting.id,
        "title": meeting.title,
        "status": meeting.status,
        "recording_type": meeting.recording_type or "Unknown",
        "confidence": meeting.confidence if meeting.confidence is not None else 100,
        "audio_filename": os.path.basename(meeting.audio_path) if meeting.audio_path else None,
        "media_token": auth.create_media_token(meeting.id),
        "transcript": meeting.transcript,
        "summary": meeting.summary,
        "key_points": json.loads(meeting.key_points) if meeting.key_points else [],
        "decisions": json.loads(meeting.decisions) if meeting.decisions else [],
        "action_items": json.loads(meeting.action_items) if meeting.action_items else [],
        "created_at": meeting.created_at.isoformat() if meeting.created_at else None,
    }
