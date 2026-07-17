from unittest.mock import patch

from app.database import Meeting
from app.services.pipeline import process_meeting


def test_process_meeting_missing_id_is_a_noop(db_session):
    # Should not raise even if the meeting no longer exists (e.g. deleted
    # before the background task got a chance to run).
    process_meeting(999999)


def test_process_meeting_success(db_session, mock_gemini, mock_whisper):
    meeting = Meeting(audio_path="/tmp/test.wav", status="transcribing")
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)

    process_meeting(meeting.id)

    db_session.refresh(meeting)
    assert meeting.status == "done"
    assert meeting.transcript == "This is a mock transcript of the recorded audio file."
    assert meeting.title == "Test Meeting Title"
    assert meeting.summary == "This is a mock summary of the meeting, discussing various test cases."


def test_process_meeting_marks_failed_on_exception(db_session, mock_whisper):
    meeting = Meeting(audio_path="/tmp/test.wav", status="transcribing")
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)

    with patch("app.services.pipeline.summarize_transcript", side_effect=Exception("boom")):
        process_meeting(meeting.id)

    db_session.refresh(meeting)
    assert meeting.status == "failed"
