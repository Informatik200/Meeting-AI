import json
from unittest.mock import MagicMock, patch

from app.database import Entity, Meeting, MeetingEntity


def test_entity_extraction_and_storage(client, db_session):
    meeting = Meeting(
        title="AI Engineering Synchronization",
        audio_path="test_audio.wav",
        transcript="Alice and Bob aligned on the Kubernetes migration. Alice will lead it.",
        summary="A summary",
        key_points=json.dumps([]),
        decisions=json.dumps([]),
        action_items=json.dumps([]),
        status="done",
    )
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)

    with patch("app.services.memory.get_gemini_client") as mock_get_client:
        mock_client = MagicMock()
        mock_response = MagicMock()
        # Mock Gemini structured JSON response
        mock_response.text = json.dumps(
            [
                {"name": "Alice", "category": "people", "context": "Alice discussed leading the Kubernetes migration."},
                {"name": "Bob", "category": "people", "context": "Bob aligned on the migration project."},
                {"name": "Kubernetes", "category": "technologies", "context": "Focus technology for cloud migration."},
            ]
        )
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        from app.services.memory import extract_and_store_entities

        extract_and_store_entities(meeting, db_session)

        # Assert entities were created
        entities = db_session.query(Entity).all()
        assert len(entities) == 3
        entity_names = {e.name for e in entities}
        assert "Alice" in entity_names
        assert "Kubernetes" in entity_names

        # Assert links were created
        links = db_session.query(MeetingEntity).filter_by(meeting_id=meeting.id).all()
        assert len(links) == 3
        assert any(
            link.entity.name == "Kubernetes" and link.context == "Focus technology for cloud migration."
            for link in links
        )


def test_related_meetings_recommendations(client, db_session, test_user):
    # Insert two meetings
    m1 = Meeting(
        owner_id=test_user.id,
        title="M1",
        audio_path="a.wav",
        transcript="X",
        summary="Y",
        key_points="[]",
        decisions="[]",
        action_items="[]",
        status="done",
    )
    m2 = Meeting(
        owner_id=test_user.id,
        title="M2",
        audio_path="b.wav",
        transcript="X",
        summary="Y",
        key_points="[]",
        decisions="[]",
        action_items="[]",
        status="done",
    )
    db_session.add_all([m1, m2])
    db_session.commit()

    # Create shared entity
    ent = Entity(name="Docker", category="technologies", owner_id=test_user.id)
    db_session.add(ent)
    db_session.commit()

    # Link both to entity
    link1 = MeetingEntity(meeting_id=m1.id, entity_id=ent.id, context="Mentions Docker")
    link2 = MeetingEntity(meeting_id=m2.id, entity_id=ent.id, context="Mentions Docker")
    db_session.add_all([link1, link2])
    db_session.commit()

    from app.services.memory import get_meeting_entities_and_related

    meta = get_meeting_entities_and_related(m1.id, test_user.id, db_session)

    assert len(meta["technologies"]) == 1
    assert meta["technologies"][0]["name"] == "Docker"
    assert len(meta["related_meetings"]) == 1
    assert meta["related_meetings"][0]["title"] == "M2"
    assert meta["related_meetings"][0]["shared_count"] == 1


def test_global_chat_route(client, db_session, test_user):
    m = Meeting(
        owner_id=test_user.id,
        title="Knowledge Base Meeting",
        audio_path="a.wav",
        transcript="We finalized using Kubernetes.",
        summary="Finalized using Kubernetes.",
        key_points="[]",
        decisions="[]",
        action_items="[]",
        status="done",
    )
    db_session.add(m)
    db_session.commit()

    with patch("app.services.memory.get_gemini_client") as mock_get_client:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "In the database context, Kubernetes was finalized."
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        response = client.post("/meetings/global/chat", json={"message": "What decisions were made about Kubernetes?"})
        assert response.status_code == 200
        assert response.json()["response"] == "In the database context, Kubernetes was finalized."


def test_metadata_not_found(client):
    response = client.get("/meetings/99999/metadata")
    assert response.status_code == 404
    assert response.json()["detail"] == "Meeting not found"
