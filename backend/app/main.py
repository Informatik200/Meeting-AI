import json
import os
import shutil
import uuid

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Meeting, get_db, init_db
from app.services.ai_summary import summarize_transcript
from app.services.transcription import transcribe_audio

app = FastAPI(title="Meeting AI Assistant")

# Allow the Next.js frontend (localhost:3000) to call this API during development.
# Tighten this to your real frontend domain before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/audio", StaticFiles(directory=settings.upload_dir), name="audio")



@app.on_event("startup")
def on_startup():
    os.makedirs(settings.upload_dir, exist_ok=True)
    init_db()


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/meetings/upload")
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

    # Save the uploaded file to disk with a unique name so filenames never collide
    unique_name = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(settings.upload_dir, unique_name)
    try:
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    finally:
        await file.close()

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
        except Exception as e:
            print(f"Entity extraction failed: {str(e)}")

    except Exception as e:
        meeting.status = "failed"
        db.commit()
        raise HTTPException(500, f"Processing failed: {str(e)}")

    return _meeting_to_dict(meeting)


@app.get("/meetings")
def list_meetings(db: Session = Depends(get_db)):
    meetings = db.query(Meeting).order_by(Meeting.created_at.desc()).all()
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

    from fastapi.responses import Response

    from app.services.pdf_generator import generate_pdf

    meeting_dict = _meeting_to_dict(meeting)
    pdf_bytes = generate_pdf(meeting_dict, lang=lang)

    headers = {"Content-Disposition": f"attachment; filename=meeting-{meeting_id}.pdf"}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


class GlobalChatRequest(BaseModel):
    message: str


@app.post("/meetings/global/chat")
def global_chat(request: GlobalChatRequest, db: Session = Depends(get_db)):
    from app.services.memory import answer_global_chat

    try:
        answer = answer_global_chat(request.message, db)
        return {"response": answer}
    except Exception as e:
        raise HTTPException(500, f"Global chat failed: {str(e)}")


class ChatRequest(BaseModel):
    message: str


@app.post("/meetings/{meeting_id}/chat")
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
    except Exception as e:
        raise HTTPException(500, f"Chat processing failed: {str(e)}")


@app.get("/meetings/{meeting_id}/metadata")
def get_meeting_metadata(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    from app.services.memory import get_meeting_entities_and_related

    try:
        metadata = get_meeting_entities_and_related(meeting_id, db)
        return metadata
    except Exception as e:
        raise HTTPException(500, f"Failed to retrieve metadata: {str(e)}")


class RegenerateRequest(BaseModel):
    recording_type: str


@app.post("/meetings/{meeting_id}/regenerate")
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
        from app.services.ai_summary import summarize_transcript

        ai_result = summarize_transcript(meeting.transcript, recording_type=request.recording_type)

        meeting.title = ai_result.get("title", "Untitled Meeting")
        meeting.summary = ai_result.get("summary", "")
        meeting.key_points = json.dumps(ai_result.get("key_points", []))
        meeting.decisions = json.dumps(ai_result.get("decisions", []))
        meeting.action_items = json.dumps(ai_result.get("action_items", []))
        meeting.status = "done"
        db.commit()
    except Exception as e:
        meeting.status = "failed"
        db.commit()
        raise HTTPException(500, f"Regeneration failed: {str(e)}")

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
