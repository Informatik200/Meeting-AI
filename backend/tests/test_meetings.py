import io

from app.database import Meeting


def test_list_meetings_empty(client):
    response = client.get("/meetings")
    assert response.status_code == 200
    assert response.json() == []
    assert response.headers["X-Total-Count"] == "0"


def test_list_meetings_pagination(client, db_session):
    for i in range(5):
        db_session.add(Meeting(title=f"Meeting {i}", audio_path=f"/tmp/{i}.wav", status="done"))
    db_session.commit()

    response = client.get("/meetings", params={"limit": 2, "offset": 0})
    assert response.status_code == 200
    assert response.headers["X-Total-Count"] == "5"
    assert len(response.json()) == 2

    response = client.get("/meetings", params={"limit": 2, "offset": 4})
    assert response.status_code == 200
    assert len(response.json()) == 1

    # No params: defaults still return everything within the default page size
    response = client.get("/meetings")
    assert len(response.json()) == 5


def test_upload_meeting_validation_error(client):
    # Reject empty filename - results in 422 because starlette form parsing treats it as standard field rather than file field
    response = client.post("/meetings/upload", files={"file": ("", io.BytesIO(b"dummy data"), "audio/wav")})
    assert response.status_code == 422

    # Reject unsupported extensions
    response = client.post("/meetings/upload", files={"file": ("test.txt", io.BytesIO(b"dummy data"), "text/plain")})
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_upload_meeting_success(client, mock_gemini, mock_whisper):
    # A tiny fake WAV file header (44 bytes) to simulate an audio upload
    fake_audio = io.BytesIO(
        b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    )

    response = client.post("/meetings/upload", files={"file": ("test.wav", fake_audio, "audio/wav")})

    assert response.status_code == 200
    data = response.json()

    # Assert JSON response shape
    expected_keys = {
        "id",
        "title",
        "status",
        "transcript",
        "summary",
        "key_points",
        "decisions",
        "action_items",
        "created_at",
    }
    assert expected_keys.issubset(data.keys())

    assert data["title"] == "Test Meeting Title"
    assert data["status"] == "done"
    assert data["transcript"] == "This is a mock transcript of the recorded audio file."
    assert data["summary"] == "This is a mock summary of the meeting, discussing various test cases."
    assert data["key_points"] == ["Point one discussed", "Point two decided"]
    assert data["decisions"] == ["Decided to add tests"]
    assert data["action_items"] == [{"task": "Write test cases", "owner": "Developer", "due": "Today"}]

    # Now verify retrieving via list endpoint
    list_response = client.get("/meetings")
    assert list_response.status_code == 200
    meetings = list_response.json()
    assert len(meetings) == 1
    assert meetings[0]["id"] == data["id"]

    # Verify retrieving via detail endpoint
    detail_response = client.get(f"/meetings/{data['id']}")
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == data["id"]


def test_get_meeting_not_found(client):
    response = client.get("/meetings/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Meeting not found"


def test_upload_meeting_processing_failure(client, mock_gemini, mock_whisper):
    # Mock gemini generating invalid response format or raising exception to test failure state transitions
    mock_gemini.models.generate_content.side_effect = Exception("Gemini API error")

    fake_audio = io.BytesIO(
        b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    )

    response = client.post("/meetings/upload", files={"file": ("test.wav", fake_audio, "audio/wav")})

    assert response.status_code == 500
    assert "Processing failed" in response.json()["detail"]


def test_upload_meeting_rejects_oversized_file(client):
    from app.config import settings

    original_max = settings.max_upload_mb
    settings.max_upload_mb = 0  # anything above 0 bytes now exceeds the cap
    try:
        oversized_audio = io.BytesIO(b"RIFF" + b"\x00" * 2000)
        response = client.post("/meetings/upload", files={"file": ("big.wav", oversized_audio, "audio/wav")})
        assert response.status_code == 413
        assert "upload limit" in response.json()["detail"]
    finally:
        settings.max_upload_mb = original_max
