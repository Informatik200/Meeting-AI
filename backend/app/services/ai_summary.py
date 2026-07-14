"""
Sends a meeting transcript to Claude and gets back a structured summary.
"""
import json

from anthropic import Anthropic

from app.config import settings

SYSTEM_PROMPT = """You are a meeting-notes assistant. You will be given a raw \
transcript of a meeting, lecture, or call. Respond with ONLY a valid JSON object \
(no markdown fences, no preamble, no explanation) with exactly these keys:

{
  "title": "a short 5-8 word title for the meeting",
  "summary": "a 3-5 sentence plain-language summary of what was discussed",
  "key_points": ["list", "of", "the main topics discussed, as short phrases"],
  "decisions": ["list", "of", "any decisions that were made, empty list if none"],
  "action_items": [
    {"task": "description of the task", "owner": "person responsible, or null if unclear", "due": "deadline mentioned, or null if none"}
  ]
}

If the transcript is in German, write the summary/key_points/decisions in German too. \
If information for a field is missing (e.g. no decisions were made), return an empty list - \
never invent content that isn't in the transcript."""


def summarize_transcript(transcript: str) -> dict:
    """
    Calls Claude with the transcript and parses the structured JSON response.
    Raises ValueError if Claude doesn't return valid JSON.
    """
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY is not configured. Add it to backend/.env and retry.")

    client = Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Here is the transcript:\n\n{transcript}",
            }
        ],
    )

    raw_text = "".join(
        block.text for block in message.content if block.type == "text"
    )

    # Claude sometimes wraps JSON in markdown fences despite instructions - strip them
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude did not return valid JSON: {raw_text}") from e


def answer_question_about_meetings(question: str, context_chunks: list[str]) -> str:
    """
    Phase 2 preview: given retrieved transcript chunks (from ChromaDB later),
    answer a question grounded in those chunks. Kept here now so the API
    shape is ready when we wire up embeddings.
    """
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY is not configured.")

    context = "\n\n---\n\n".join(context_chunks)
    client = Anthropic(api_key=settings.anthropic_api_key)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system=(
            "Answer the user's question using ONLY the meeting excerpts provided. "
            "If the answer isn't in the excerpts, say so clearly instead of guessing."
        ),
        messages=[
            {
                "role": "user",
                "content": f"Meeting excerpts:\n\n{context}\n\nQuestion: {question}",
            }
        ],
    )

    return "".join(block.text for block in message.content if block.type == "text")
