"""
The meeting processing pipeline: transcribe -> classify -> summarize -> extract entities.

Runs today as a FastAPI BackgroundTask (single process, in-memory). The entry
point below takes only a meeting_id - not a live ORM object or the request's
DB session - and opens its own session, specifically so it can be handed to a
real task queue (Celery/RQ) later with no changes to this function: swap the
`background_tasks.add_task(process_meeting, meeting.id)` call in main.py for
`queue.enqueue(process_meeting, meeting.id)` and this keeps working, since it
was never relying on anything tied to the original request's lifecycle.
"""

import json
import logging

from app.database import Meeting, SessionLocal
from app.services.ai_summary import summarize_transcript
from app.services.classification import classify_transcript
from app.services.memory import extract_and_store_entities
from app.services.transcription import transcribe_audio

logger = logging.getLogger("app")


def process_meeting(meeting_id: int) -> None:
    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error("process_meeting called for missing meeting_id=%s", meeting_id)
            return

        try:
            _run_pipeline(meeting, db)
        except Exception:
            meeting.status = "failed"
            db.commit()
            logger.error("Meeting processing failed for meeting_id=%s", meeting_id, exc_info=True)
    finally:
        db.close()


def _run_pipeline(meeting: Meeting, db) -> None:
    # Step 1: speech -> text
    transcript = transcribe_audio(meeting.audio_path)
    meeting.transcript = transcript
    meeting.status = "summarizing"
    db.commit()

    # Step 1.5: classify transcript
    try:
        class_res = classify_transcript(transcript)
        meeting.recording_type = class_res.get("recording_type", "Unknown")
        meeting.confidence = class_res.get("confidence", 100)
    except Exception:
        logger.warning("Classification failed for meeting_id=%s, falling back to Unknown", meeting.id, exc_info=True)
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
    try:
        extract_and_store_entities(meeting, db)
    except Exception:
        logger.error("Entity extraction failed for meeting_id=%s", meeting.id, exc_info=True)
