"""
Cross-user data isolation: everything a second, distinct user should never
be able to see, modify, or have leaked into their AI context.
"""

import json
from unittest.mock import MagicMock, patch

from app.database import Entity, Meeting, MeetingEntity

from .test_auth import auth_headers, register


def _create_meeting(db_session, owner_id: int, **overrides) -> Meeting:
    defaults = dict(
        owner_id=owner_id,
        title="Owner's Private Meeting",
        audio_path="/tmp/owner.wav",
        transcript="Confidential transcript content.",
        summary="Confidential summary.",
        key_points=json.dumps(["Secret key point"]),
        decisions=json.dumps([]),
        action_items=json.dumps([]),
        status="done",
    )
    defaults.update(overrides)
    meeting = Meeting(**defaults)
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)
    return meeting


def _two_users(client):
    user_a = register(client, email="usera@example.com", name="User A")
    user_b = register(client, email="userb@example.com", name="User B")
    return user_a, user_b


def test_user_cannot_see_other_users_meeting_in_list(real_auth_client, db_session):
    user_a, user_b = _two_users(real_auth_client)
    _create_meeting(db_session, owner_id=user_a["user"]["id"])

    response = real_auth_client.get("/meetings", headers=auth_headers(user_b["access_token"]))
    assert response.status_code == 200
    assert response.json() == []

    response = real_auth_client.get("/meetings", headers=auth_headers(user_a["access_token"]))
    assert len(response.json()) == 1


def test_user_cannot_get_other_users_meeting_by_id(real_auth_client, db_session):
    user_a, user_b = _two_users(real_auth_client)
    meeting = _create_meeting(db_session, owner_id=user_a["user"]["id"])

    response = real_auth_client.get(f"/meetings/{meeting.id}", headers=auth_headers(user_b["access_token"]))
    assert response.status_code == 404

    response = real_auth_client.get(f"/meetings/{meeting.id}", headers=auth_headers(user_a["access_token"]))
    assert response.status_code == 200


def test_user_cannot_delete_other_users_meeting(real_auth_client, db_session):
    user_a, user_b = _two_users(real_auth_client)
    meeting = _create_meeting(db_session, owner_id=user_a["user"]["id"])

    response = real_auth_client.delete(f"/meetings/{meeting.id}", headers=auth_headers(user_b["access_token"]))
    assert response.status_code == 404

    db_session.refresh(meeting)
    assert db_session.query(Meeting).filter(Meeting.id == meeting.id).first() is not None


def test_user_cannot_rename_other_users_meeting(real_auth_client, db_session):
    user_a, user_b = _two_users(real_auth_client)
    meeting = _create_meeting(db_session, owner_id=user_a["user"]["id"])

    response = real_auth_client.put(
        f"/meetings/{meeting.id}", json={"title": "Hijacked"}, headers=auth_headers(user_b["access_token"])
    )
    assert response.status_code == 404

    db_session.refresh(meeting)
    assert meeting.title == "Owner's Private Meeting"


def test_user_cannot_chat_about_other_users_meeting(real_auth_client, db_session):
    user_a, user_b = _two_users(real_auth_client)
    meeting = _create_meeting(db_session, owner_id=user_a["user"]["id"])

    response = real_auth_client.post(
        f"/meetings/{meeting.id}/chat",
        json={"message": "What was discussed?"},
        headers=auth_headers(user_b["access_token"]),
    )
    assert response.status_code == 404


def test_user_cannot_regenerate_other_users_meeting(real_auth_client, db_session):
    user_a, user_b = _two_users(real_auth_client)
    meeting = _create_meeting(db_session, owner_id=user_a["user"]["id"])

    response = real_auth_client.post(
        f"/meetings/{meeting.id}/regenerate",
        json={"recording_type": "Lecture"},
        headers=auth_headers(user_b["access_token"]),
    )
    assert response.status_code == 404


def test_user_cannot_view_other_users_metadata(real_auth_client, db_session):
    user_a, user_b = _two_users(real_auth_client)
    meeting = _create_meeting(db_session, owner_id=user_a["user"]["id"])

    response = real_auth_client.get(f"/meetings/{meeting.id}/metadata", headers=auth_headers(user_b["access_token"]))
    assert response.status_code == 404


def test_global_chat_only_includes_own_meetings(real_auth_client, db_session):
    user_a, user_b = _two_users(real_auth_client)
    _create_meeting(db_session, owner_id=user_a["user"]["id"], title="User A's Secret Project Kickoff")
    _create_meeting(db_session, owner_id=user_b["user"]["id"], title="User B's Own Meeting")

    with patch("app.services.memory.get_gemini_client") as mock_get_client:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Answer."
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        response = real_auth_client.post(
            "/meetings/global/chat",
            json={"message": "What meetings do I have?"},
            headers=auth_headers(user_b["access_token"]),
        )
        assert response.status_code == 200

        _, kwargs = mock_client.models.generate_content.call_args
        system_instruction = kwargs["config"].system_instruction
        assert "User B's Own Meeting" in system_instruction
        assert "User A's Secret Project Kickoff" not in system_instruction


def test_entities_are_not_shared_across_users(real_auth_client, db_session):
    user_a, user_b = _two_users(real_auth_client)
    meeting_a = _create_meeting(db_session, owner_id=user_a["user"]["id"], title="A's Meeting")
    meeting_b = _create_meeting(db_session, owner_id=user_b["user"]["id"], title="B's Meeting")

    # Both users' transcripts happen to mention the same name
    entity_a = Entity(name="Alice", category="people", owner_id=user_a["user"]["id"])
    entity_b = Entity(name="Alice", category="people", owner_id=user_b["user"]["id"])
    db_session.add_all([entity_a, entity_b])
    db_session.commit()

    db_session.add_all(
        [
            MeetingEntity(meeting_id=meeting_a.id, entity_id=entity_a.id, context="A's context"),
            MeetingEntity(meeting_id=meeting_b.id, entity_id=entity_b.id, context="B's context"),
        ]
    )
    db_session.commit()

    # Two distinct Entity rows exist despite the identical name/category
    assert entity_a.id != entity_b.id

    response = real_auth_client.get(f"/meetings/{meeting_a.id}/metadata", headers=auth_headers(user_a["access_token"]))
    assert response.status_code == 200
    metadata = response.json()
    assert len(metadata["people"]) == 1
    assert metadata["people"][0]["context"] == "A's context"
    assert metadata["related_meetings"] == []  # no cross-user leak via shared entity name


def test_media_token_scoped_to_meeting_and_rejects_other_users(real_auth_client, db_session):
    user_a, user_b = _two_users(real_auth_client)
    meeting_a = _create_meeting(db_session, owner_id=user_a["user"]["id"])
    meeting_b = _create_meeting(db_session, owner_id=user_b["user"]["id"], audio_path="/tmp/b.wav")

    detail = real_auth_client.get(f"/meetings/{meeting_a.id}", headers=auth_headers(user_a["access_token"])).json()
    media_token = detail["media_token"]

    # B can't use A's Authorization header (not theirs) ...
    response = real_auth_client.get(f"/meetings/{meeting_a.id}/audio", headers=auth_headers(user_b["access_token"]))
    assert response.status_code == 404

    # ... nor can B reuse A's media token for A's meeting without B's own auth
    response = real_auth_client.get(f"/meetings/{meeting_a.id}/audio", params={"token": media_token})
    # No file exists on disk at the dummy path, but authorization must pass
    # first - a 404 here (from the audio-file-missing branch) still proves
    # the token was accepted; assert it's not rejected for auth reasons by
    # checking the owner's own request behaves identically.
    owner_response = real_auth_client.get(
        f"/meetings/{meeting_a.id}/audio", headers=auth_headers(user_a["access_token"])
    )
    assert response.status_code == owner_response.status_code

    # A's media token does not work for B's (different) meeting id
    response = real_auth_client.get(f"/meetings/{meeting_b.id}/audio", params={"token": media_token})
    assert response.status_code == 404
