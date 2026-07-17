"""
Regression coverage for GET /meetings/{id}/audio's HTTP Range support.

Without Range requests, <audio> elements report an empty seekable range
([0, 0]) until the entire file has downloaded, so seeking immediately after
opening a recording silently resets currentTime to 0 instead of moving to
the clicked position. starlette.responses.FileResponse (0.38.6, as pinned)
does not implement Range requests at all, so this endpoint builds partial
responses itself rather than relying on it.
"""

import json

from app.database import Meeting

AUDIO_BYTES = b"RIFF" + bytes(range(256)) * 40  # 1028 bytes, deterministic content


def _create_meeting_with_audio(db_session, owner_id: int, tmp_path) -> Meeting:
    audio_path = tmp_path / "test_audio.wav"
    audio_path.write_bytes(AUDIO_BYTES)

    meeting = Meeting(
        owner_id=owner_id,
        title="Audio Range Test",
        audio_path=str(audio_path),
        transcript="Test transcript.",
        summary="Test summary.",
        key_points=json.dumps([]),
        decisions=json.dumps([]),
        action_items=json.dumps([]),
        status="done",
    )
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)
    return meeting


def test_audio_full_response_advertises_range_support(client, db_session, test_user, tmp_path):
    meeting = _create_meeting_with_audio(db_session, test_user.id, tmp_path)

    response = client.get(f"/meetings/{meeting.id}/audio")

    assert response.status_code == 200
    assert response.headers["accept-ranges"] == "bytes"
    assert response.content == AUDIO_BYTES


def test_audio_range_request_returns_partial_content(client, db_session, test_user, tmp_path):
    meeting = _create_meeting_with_audio(db_session, test_user.id, tmp_path)

    response = client.get(f"/meetings/{meeting.id}/audio", headers={"Range": "bytes=0-9"})

    assert response.status_code == 206
    assert response.headers["accept-ranges"] == "bytes"
    assert response.headers["content-range"] == f"bytes 0-9/{len(AUDIO_BYTES)}"
    assert response.headers["content-length"] == "10"
    assert response.content == AUDIO_BYTES[0:10]


def test_audio_range_request_middle_of_file(client, db_session, test_user, tmp_path):
    meeting = _create_meeting_with_audio(db_session, test_user.id, tmp_path)

    response = client.get(f"/meetings/{meeting.id}/audio", headers={"Range": "bytes=100-149"})

    assert response.status_code == 206
    assert response.headers["content-range"] == f"bytes 100-149/{len(AUDIO_BYTES)}"
    assert response.content == AUDIO_BYTES[100:150]


def test_audio_range_request_open_ended(client, db_session, test_user, tmp_path):
    meeting = _create_meeting_with_audio(db_session, test_user.id, tmp_path)
    start = len(AUDIO_BYTES) - 20

    response = client.get(f"/meetings/{meeting.id}/audio", headers={"Range": f"bytes={start}-"})

    assert response.status_code == 206
    assert response.headers["content-range"] == f"bytes {start}-{len(AUDIO_BYTES) - 1}/{len(AUDIO_BYTES)}"
    assert response.content == AUDIO_BYTES[start:]


def test_audio_range_request_out_of_bounds_returns_416(client, db_session, test_user, tmp_path):
    meeting = _create_meeting_with_audio(db_session, test_user.id, tmp_path)

    response = client.get(f"/meetings/{meeting.id}/audio", headers={"Range": f"bytes={len(AUDIO_BYTES) + 100}-"})

    assert response.status_code == 416
    assert response.headers["content-range"] == f"bytes */{len(AUDIO_BYTES)}"


def test_audio_malformed_range_header_falls_back_to_full_file(client, db_session, test_user, tmp_path):
    meeting = _create_meeting_with_audio(db_session, test_user.id, tmp_path)

    response = client.get(f"/meetings/{meeting.id}/audio", headers={"Range": "bytes=not-a-number"})

    assert response.status_code == 206
    assert response.content == AUDIO_BYTES
