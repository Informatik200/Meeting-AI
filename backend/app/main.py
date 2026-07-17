import json
import logging
import os
import uuid

from fastapi import Depends, FastAPI, File, HTTPException, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Meeting, get_db, init_db
from app.logging_config import configure_logging
from app.rate_limit import rate_limiter
from app.services.ai_summary import summarize_transcript
from app.services.transcription import transcribe_audio

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

# Ensure uploads directory exists before mounting StaticFiles
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/audio", StaticFiles(directory=settings.upload_dir), name="audio")

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


@app.post("/meetings/upload", dependencies=[Depends(_upload_rate_limit)])
async def upload_meeting(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Accepts an audio file, transcribes it, summarizes it, and saves everything.

    NOTE: this runs synchronously for simplicity in Phase 1 - the request will
    block until transcription + summarization finish (can take 10-60s+ depending
    on audio length and your machine). In Phase 2, move this to a background
    task/queue (e.g. Celery or FastAPI BackgroundTasks) so upload returns instantly
    and the frontend polls or gets notified when it's done.
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

    meeting = Meeting(audio_path=save_path, status="transcribing")
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    try:
        # Step 1: speech -> text
        transcript = transcribe_audio(save_path)
        meeting.transcript = transcript
        meeting.status = "summarizing"
        db.commit()

        # Step 1.5: classify transcript
        from app.services.classification import classify_transcript

        try:
            class_res = classify_transcript(transcript)
            meeting.recording_type = class_res.get("recording_type", "Unknown")
            meeting.confidence = class_res.get("confidence", 100)
        except Exception:
            logger.warning(
                "Classification failed for meeting_id=%s, falling back to Unknown", meeting.id, exc_info=True
            )
            meeting.recording_type = "Unknown"
            meeting.confidence = 100
        db.commit()

        # Step 2: text -> structured summary
        ai_result = summarize_transcript(transcript, recording_type=meeting.recording_type)

        meeting.title = ai_result.get("title", "Untitled Meeting")
        meeting.summary = ai_result.get("summary", "")
        meeting.key_points = json.dumps(ai_result.get("key_points", []))
        meeting.decisions = json.dumps(ai_result.get("decisions", []))
        meeting.action_items = json.dumps(ai_result.get("action_items", []))
        meeting.status = "done"
        db.commit()

        # Step 3: extract entities for memory graph
        from app.services.memory import extract_and_store_entities

        try:
            extract_and_store_entities(meeting, db)
        except Exception:
            logger.error("Entity extraction failed for meeting_id=%s", meeting.id, exc_info=True)

    except Exception:
        meeting.status = "failed"
        db.commit()
        logger.error("Meeting processing failed for meeting_id=%s", meeting.id, exc_info=True)
        raise HTTPException(500, "Processing failed. Please try again or contact support if this continues.")

    return _meeting_to_dict(meeting)


@app.get("/meetings")
def list_meetings(
    response: Response,
    limit: int = Query(default=None, ge=1, le=settings.max_page_size),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    effective_limit = limit or settings.default_page_size
    total = db.query(Meeting).count()
    meetings = db.query(Meeting).order_by(Meeting.created_at.desc()).offset(offset).limit(effective_limit).all()
    response.headers["X-Total-Count"] = str(total)
    return [_meeting_to_dict(m) for m in meetings]


@app.get("/meetings/{meeting_id}")
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    return _meeting_to_dict(meeting)


@app.get("/meetings/{meeting_id}/pdf")
def get_meeting_pdf(meeting_id: int, lang: str = "en", db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    from app.services.pdf_generator import generate_pdf

    meeting_dict = _meeting_to_dict(meeting)
    pdf_bytes = generate_pdf(meeting_dict, lang=lang)

    headers = {"Content-Disposition": f"attachment; filename=meeting-{meeting_id}.pdf"}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


class GlobalChatRequest(BaseModel):
    message: str


@app.post("/meetings/global/chat", dependencies=[Depends(_ai_rate_limit)])
def global_chat(request: GlobalChatRequest, db: Session = Depends(get_db)):
    from app.services.memory import answer_global_chat

    try:
        answer = answer_global_chat(request.message, db)
        return {"response": answer}
    except Exception:
        logger.error("Global chat failed", exc_info=True)
        raise HTTPException(500, "Could not process the chat request. Please try again.")


class ChatRequest(BaseModel):
    message: str


@app.post("/meetings/{meeting_id}/chat", dependencies=[Depends(_ai_rate_limit)])
def chat_about_meeting(meeting_id: int, request: ChatRequest, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
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
def get_meeting_metadata(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    from app.services.memory import get_meeting_entities_and_related

    try:
        metadata = get_meeting_entities_and_related(meeting_id, db)
        return metadata
    except Exception:
        logger.error("Failed to retrieve metadata for meeting_id=%s", meeting_id, exc_info=True)
        raise HTTPException(500, "Could not retrieve recording metadata. Please try again.")


class RegenerateRequest(BaseModel):
    recording_type: str


@app.post("/meetings/{meeting_id}/regenerate", dependencies=[Depends(_ai_rate_limit)])
def regenerate_meeting_analysis(meeting_id: int, request: RegenerateRequest, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
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
def rename_meeting(meeting_id: int, request: RenameRequest, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    meeting.title = request.title
    db.commit()
    return _meeting_to_dict(meeting)


@app.delete("/meetings/{meeting_id}")
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
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
        "transcript": meeting.transcript,
        "summary": meeting.summary,
        "key_points": json.loads(meeting.key_points) if meeting.key_points else [],
        "decisions": json.loads(meeting.decisions) if meeting.decisions else [],
        "action_items": json.loads(meeting.action_items) if meeting.action_items else [],
        "created_at": meeting.created_at.isoformat() if meeting.created_at else None,
    }
