import json
from unittest.mock import MagicMock, patch

from app.database import Meeting


def test_classification_and_summary_success(client, db_session):
    # Setup mock responses for classification and summarization
    with (
        patch("app.services.classification._get_client") as mock_get_client,
        patch("app.services.ai_summary._get_client") as mock_get_summary_client,
        patch("app.main.transcribe_audio") as mock_transcribe,
    ):
        # Audio file mock
        mock_transcribe.return_value = "Good morning class, today we will learn about algorithms."

        # Classification client setup
        mock_client = MagicMock()
        mock_class_response = MagicMock()
        mock_class_response.text = '{"recording_type": "Lecture", "confidence": 75, "reason": "Teaching Algorithms."}'
        mock_client.models.generate_content.return_value = mock_class_response
        mock_get_client.return_value = mock_client

        # Summarization client setup
        mock_sum_client = MagicMock()
        mock_sum_response = MagicMock()
        mock_sum_response.text = json.dumps(
            {
                "title": "Algorithms Lecture Intro",
                "summary": "This is a lecture introduction explaining algorithms.",
                "key_points": ["Algorithms definition", "Computational complexity"],
                "decisions": [],
                "action_items": [],
            }
        )
        mock_sum_client.models.generate_content.return_value = mock_sum_response
        mock_get_summary_client.return_value = mock_sum_client

        # Call upload endpoint
        data = {"file": ("test.wav", b"fake audio content", "audio/wav")}
        response = client.post("/meetings/upload", files=data)

        assert response.status_code == 200
        result = response.json()
        assert result["recording_type"] == "Lecture"
        assert result["confidence"] == 75
        assert result["title"] == "Algorithms Lecture Intro"


def test_classification_unknown_fallback(client, db_session):
    with (
        patch("app.services.classification._get_client") as mock_get_client,
        patch("app.services.ai_summary._get_client") as mock_get_summary_client,
        patch("app.main.transcribe_audio") as mock_transcribe,
    ):
        mock_transcribe.return_value = "Hello."

        # Mock class returns invalid JSON string (Gemini failure)
        mock_client = MagicMock()
        mock_class_response = MagicMock()
        mock_class_response.text = "INVALID_RESPONSE"
        mock_client.models.generate_content.return_value = mock_class_response
        mock_get_client.return_value = mock_client

        # Summarization client setup
        mock_sum_client = MagicMock()
        mock_sum_response = MagicMock()
        mock_sum_response.text = json.dumps(
            {"title": "Short hello", "summary": "Greeting.", "key_points": [], "decisions": [], "action_items": []}
        )
        mock_sum_client.models.generate_content.return_value = mock_sum_response
        mock_get_summary_client.return_value = mock_sum_client

        # Call upload endpoint
        data = {"file": ("test.wav", b"fake audio content", "audio/wav")}
        response = client.post("/meetings/upload", files=data)

        assert response.status_code == 200
        result = response.json()
        # Should fallback to Unknown, 100
        assert result["recording_type"] == "Unknown"
        assert result["confidence"] == 100


def test_manual_override_regenerate(client, db_session):
    # Insert meeting into DB
    meeting = Meeting(
        title="Original Title",
        audio_path="dummy.wav",
        transcript="We need to finalize the product release date.",
        summary="A summary",
        key_points=json.dumps([]),
        decisions=json.dumps([]),
        action_items=json.dumps([]),
        recording_type="Lecture",  # originally misclassified
        confidence=60,
        status="done",
    )
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)

    with patch("app.services.ai_summary._get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_sum_response = MagicMock()
        mock_sum_response.text = json.dumps(
            {
                "title": "Product Launch Meeting",
                "summary": "Discussed the release schedule and timeline.",
                "key_points": ["Finalize release date"],
                "decisions": ["Release date set to next week"],
                "action_items": [],
            }
        )
        mock_client.models.generate_content.return_value = mock_sum_response
        mock_get_client.return_value = mock_client

        # Call override regenerate endpoint
        response = client.post(f"/meetings/{meeting.id}/regenerate", json={"recording_type": "Business Meeting"})
        assert response.status_code == 200
        result = response.json()
        assert result["recording_type"] == "Business Meeting"
        assert result["confidence"] == 100  # Manual override sets confidence to 100
        assert result["title"] == "Product Launch Meeting"

        # Verify the database values were updated
        db_session.refresh(meeting)
        assert meeting.recording_type == "Business Meeting"
        assert meeting.confidence == 100


def test_regenerate_not_found(client):
    response = client.post("/meetings/99999/regenerate", json={"recording_type": "Lecture"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Meeting not found"


def test_regenerate_invalid_type(client, db_session):
    meeting = Meeting(
        title="Title",
        audio_path="dummy.wav",
        transcript="Some transcript.",
        summary="Summary",
        key_points=json.dumps([]),
        decisions=json.dumps([]),
        action_items=json.dumps([]),
        recording_type="Unknown",
        confidence=100,
        status="done",
    )
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)

    response = client.post(f"/meetings/{meeting.id}/regenerate", json={"recording_type": "InvalidCategoryName"})
    assert response.status_code == 400
    assert "Invalid recording type" in response.json()["detail"]
