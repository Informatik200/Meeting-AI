import json
from unittest.mock import MagicMock, patch

from app.database import Meeting


def test_chat_success(client, db_session):
    meeting = Meeting(
        title="Chat Test Meeting",
        audio_path="dummy.wav",
        transcript="The project deadline is set for next Monday at 5 PM.",
        summary="A summary",
        key_points=json.dumps([]),
        decisions=json.dumps([]),
        action_items=json.dumps([]),
        status="done",
    )
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)

    with patch("app.services.ai_summary._get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "The project deadline is next Monday at 5 PM."
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        response = client.post(f"/meetings/{meeting.id}/chat", json={"message": "When is the project deadline?"})
        assert response.status_code == 200
        assert response.json()["response"] == "The project deadline is next Monday at 5 PM."

        # Verify the Gemini call occurred
        mock_client.models.generate_content.assert_called_once()
        args, kwargs = mock_client.models.generate_content.call_args
        assert "When is the project deadline?" in kwargs["contents"]
        assert "The project deadline is set for next Monday at 5 PM." in kwargs["contents"]


def test_chat_no_transcript(client, db_session):
    meeting = Meeting(
        title="Chat Test No Transcript",
        audio_path="dummy.wav",
        transcript=None,
        summary=None,
        key_points=json.dumps([]),
        decisions=json.dumps([]),
        action_items=json.dumps([]),
        status="transcribing",
    )
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)

    response = client.post(f"/meetings/{meeting.id}/chat", json={"message": "What was discussed?"})
    assert response.status_code == 400
    assert "transcript is empty" in response.json()["detail"]


def test_chat_not_found(client):
    response = client.post("/meetings/99999/chat", json={"message": "Hello?"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Meeting not found"
