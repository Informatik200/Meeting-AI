"""
Sends a meeting transcript to Google Gemini and gets back a structured summary.
"""

import json

from google import genai
from google.genai import types

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


def _get_client() -> genai.Client:
    """Configure the Gemini client."""
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not configured. Add it to backend/.env and retry.")
    return genai.Client(api_key=settings.gemini_api_key)


def summarize_transcript(transcript: str) -> dict:
    """
    Calls Gemini with the transcript and parses the structured JSON response.
    Raises ValueError if Gemini doesn't return valid JSON.
    """
    client = _get_client()

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=f"Here is the transcript:\n\n{transcript}",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
        ),
    )

    raw_text = response.text

    # Gemini sometimes wraps JSON in markdown fences despite instructions - strip them
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini did not return valid JSON: {raw_text}") from e


def answer_question_about_meetings(question: str, context_chunks: list[str]) -> str:
    """
    Phase 2 preview: given retrieved transcript chunks (from ChromaDB later),
    answer a question grounded in those chunks. Kept here now so the API
    shape is ready when we wire up embeddings.
    """
    client = _get_client()

    context = "\n\n---\n\n".join(context_chunks)

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=f"Meeting excerpts:\n\n{context}\n\nQuestion: {question}",
        config=types.GenerateContentConfig(
            system_instruction=(
                "Answer the user's question using ONLY the meeting excerpts provided. "
                "If the answer isn't in the excerpts, say so clearly instead of guessing."
            ),
        ),
    )

    return response.text
