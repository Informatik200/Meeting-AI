from datetime import datetime, timezone

from app.database import Meeting


def test_meeting_model_creation(db_session):
    # Test creation and defaults
    meeting = Meeting(
        audio_path="/path/to/test.mp3",
    )
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)

    assert meeting.id is not None
    assert meeting.title == "Untitled Meeting"
    assert meeting.audio_path == "/path/to/test.mp3"
    assert meeting.status == "uploaded"
    assert meeting.transcript is None
    assert meeting.summary is None
    assert meeting.key_points is None
    assert meeting.decisions is None
    assert meeting.action_items is None
    assert isinstance(meeting.created_at, datetime)
    # Check timezone is near UTC
    assert meeting.created_at.tzinfo is None or meeting.created_at.tzinfo == timezone.utc


def test_meeting_update(db_session):
    meeting = Meeting(
        audio_path="/path/to/test.mp3",
    )
    db_session.add(meeting)
    db_session.commit()

    meeting.title = "Updated Title"
    meeting.status = "done"
    meeting.summary = "A nice meeting summary"
    db_session.commit()
    db_session.refresh(meeting)

    assert meeting.title == "Updated Title"
    assert meeting.status == "done"
    assert meeting.summary == "A nice meeting summary"
