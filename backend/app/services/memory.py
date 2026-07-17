import json

from google.genai import types
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import Entity, Meeting, MeetingEntity
from app.services.gemini import get_gemini_client


def extract_and_store_entities(meeting: Meeting, db: Session):
    """
    Extracts structured entities from a meeting's transcript using Gemini,
    then updates the Entity and MeetingEntity relational tables.
    """
    if not meeting.transcript or not meeting.transcript.strip():
        return

    client = get_gemini_client()

    prompt = f"Transcript:\n\n{meeting.transcript}"

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=(
                "You are an expert AI knowledge extractor. You must analyze the transcript and extract key entities.\n"
                "Extract entities belonging strictly to these categories:\n"
                "- people (e.g. 'Alice', 'Professor Smith')\n"
                "- projects (e.g. 'Meeting-AI', 'CRM Migration')\n"
                "- organizations (e.g. 'OpenAI', 'Microsoft')\n"
                "- technologies (e.g. 'Kubernetes', 'FastAPI')\n"
                "- topics (e.g. 'Authentication', 'Cloud Migration')\n\n"
                "For each extracted entity, return:\n"
                "1. name: Normalized text (Title Case, singular, stripped of clutter like 'Mr.' or extra spaces)\n"
                "2. category: one of the exact category strings listed above\n"
                "3. context: a short 1-sentence explanation of what context they were mentioned in during this transcript\n\n"
                "Respond with ONLY a valid JSON list of objects (no markdown, no preamble):\n"
                "[\n"
                "  {\n"
                '    "name": "Entity Name",\n'
                '    "category": "people/projects/organizations/technologies/topics",\n'
                '    "context": "Context snippet."\n'
                "  }\n"
                "]"
            ),
        ),
    )

    raw_text = response.text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    raw_text = raw_text.strip()

    try:
        entities_data = json.loads(raw_text)
    except Exception:
        # Fallback if parsing fails
        entities_data = []

    valid_categories = {"people", "projects", "organizations", "technologies", "topics"}

    for item in entities_data:
        name = item.get("name", "").strip()
        category = item.get("category", "").strip().lower()
        context = item.get("context", "").strip()

        if not name or category not in valid_categories:
            continue

        # Look up or create Entity, scoped to this meeting's owner so two
        # users mentioning e.g. "Alice" never share (and leak) an entity row.
        entity = (
            db.query(Entity)
            .filter(
                func.lower(Entity.name) == func.lower(name),
                Entity.category == category,
                Entity.owner_id == meeting.owner_id,
            )
            .first()
        )

        if not entity:
            entity = Entity(name=name, category=category, owner_id=meeting.owner_id)
            db.add(entity)
            db.commit()
            db.refresh(entity)

        # Check if link already exists
        link = db.query(MeetingEntity).filter_by(meeting_id=meeting.id, entity_id=entity.id).first()

        if not link:
            link = MeetingEntity(meeting_id=meeting.id, entity_id=entity.id, context=context)
            db.add(link)
            db.commit()


def get_meeting_entities_and_related(meeting_id: int, owner_id: int, db: Session) -> dict:
    """
    Retrieves the entities linked to a meeting grouped by category,
    and lists related meetings sharing entities, sorted by shared entity count.
    """
    # Fetch categorized entities
    links = db.query(MeetingEntity).filter_by(meeting_id=meeting_id).all()

    people = []
    projects = []
    topics = []
    organizations = []
    technologies = []

    entity_ids = []

    for link in links:
        entity = link.entity
        entity_ids.append(entity.id)
        entity_info = {"name": entity.name, "context": link.context}

        if entity.category == "people":
            people.append(entity_info)
        elif entity.category == "projects":
            projects.append(entity_info)
        elif entity.category == "organizations":
            organizations.append(entity_info)
        elif entity.category == "technologies":
            technologies.append(entity_info)
        elif entity.category == "topics":
            topics.append(entity_info)

    # Find related meetings sharing entities
    related = []
    if entity_ids:
        shared_counts = (
            db.query(MeetingEntity.meeting_id, func.count(MeetingEntity.entity_id).label("shared_count"))
            .filter(MeetingEntity.entity_id.in_(entity_ids), MeetingEntity.meeting_id != meeting_id)
            .group_by(MeetingEntity.meeting_id)
            .order_by(func.count(MeetingEntity.entity_id).desc())
            .all()
        )

        for meet_id, count in shared_counts:
            meet = db.query(Meeting).get(meet_id)
            # Entities are already owner-scoped, so this should never cross
            # users - checked explicitly anyway as defense in depth.
            if meet and meet.status == "done" and meet.owner_id == owner_id:
                related.append({"id": meet.id, "title": meet.title, "shared_count": count})

    return {
        "people": people,
        "projects": projects,
        "organizations": organizations,
        "technologies": technologies,
        "topics": topics,
        "related_meetings": related,
    }


def answer_global_chat(message: str, owner_id: int, db: Session) -> str:
    """
    Answers user questions spanning the entire knowledge base (cross-meeting search).
    """
    # Gather summaries and actions for context - scoped to the requesting
    # user's own recordings only.
    meetings = db.query(Meeting).filter(Meeting.status == "done", Meeting.owner_id == owner_id).all()

    context_blocks = []
    for m in meetings:
        meeting_meta = []
        meeting_meta.append(f"Meeting ID: {m.id}")
        meeting_meta.append(f"Title: {m.title}")
        meeting_meta.append(f"Date: {m.created_at.strftime('%Y-%m-%d') if m.created_at else 'Unknown'}")
        meeting_meta.append(f"Summary: {m.summary or 'No summary'}")

        # Load associated entities for context
        links = db.query(MeetingEntity).filter_by(meeting_id=m.id).all()
        entities_text = ", ".join([f"{link.entity.name} ({link.entity.category}: {link.context})" for link in links])
        meeting_meta.append(f"Entities mentioned: {entities_text if entities_text else 'None'}")

        context_blocks.append("\n".join(meeting_meta))

    knowledge_base = "\n\n=== RECORDINGS DATABASE ===\n\n" + "\n\n---\n\n".join(context_blocks)

    client = get_gemini_client()

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=f"User Query:\n{message}",
        config=types.GenerateContentConfig(
            system_instruction=(
                "You are an expert AI meeting assistant. You have access to a database of processed recordings, summaries, and mentioned entities.\n"
                "You must answer the user's query utilizing ONLY the database context provided below.\n"
                "If the database does not contain the answer, state that clearly (do not hallucinate details).\n\n"
                f"DATABASE CONTEXT:\n{knowledge_base}"
            ),
        ),
    )

    return response.text
