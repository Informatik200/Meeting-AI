import json

from app.database import Meeting


def test_export_pdf_success(client, db_session):
    # Insert a meeting directly into the DB containing German characters
    meeting = Meeting(
        title="German Test Ü Umlaut ß",
        audio_path="dummy.wav",
        transcript="Dies ist ein Transkript mit ä, ö, ü, und ß.",
        summary="Zusammenfassung mit Umlauten: äöüß.",
        key_points=json.dumps(["Wichtiger Punkt Ä", "Zweiter Punkt Ö"]),
        decisions=json.dumps(["Entscheidung getroffen"]),
        action_items=json.dumps([{"task": "Aufgabe erledigen", "owner": "Müller", "due": "Morgen"}]),
        status="done",
    )
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)

    # Request the PDF endpoint in German
    response = client.get(f"/meetings/{meeting.id}/pdf?lang=de")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert f"attachment; filename=meeting-{meeting.id}.pdf" in response.headers["content-disposition"]

    # Verify PDF file signature (starts with %PDF)
    pdf_content = response.content
    assert pdf_content.startswith(b"%PDF")


def test_export_pdf_english(client, db_session):
    # Insert a meeting directly into the DB
    meeting = Meeting(
        title="English PDF Test",
        audio_path="dummy.wav",
        transcript="Mock transcript text.",
        summary="Mock summary.",
        key_points=json.dumps(["Point one"]),
        decisions=json.dumps(["Decision one"]),
        action_items=json.dumps([]),
        status="done",
    )
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)

    # Request the PDF endpoint in English
    response = client.get(f"/meetings/{meeting.id}/pdf?lang=en")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    pdf_content = response.content
    assert pdf_content
    assert pdf_content.startswith(b"%PDF")


def test_export_pdf_not_found(client):
    response = client.get("/meetings/99999/pdf")
    assert response.status_code == 404
    assert response.json()["detail"] == "Meeting not found"
