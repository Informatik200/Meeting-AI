import json

from google import genai
from google.genai import types

from app.config import settings


def _get_client() -> genai.Client:
    """Configure the Gemini client."""
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not configured. Add it to backend/.env and retry.")
    return genai.Client(api_key=settings.gemini_api_key)


def classify_transcript(transcript: str) -> dict:
    """
    Analyzes a meeting transcript using Gemini and returns a classification dict:
    {
      "recording_type": str (one of the supported types),
      "confidence": int (0-100),
      "reason": str (short explanation)
    }
    """
    if not transcript or not transcript.strip():
        return {"recording_type": "Unknown", "confidence": 100, "reason": "Transcript is empty."}

    client = _get_client()

    prompt = f"Here is the transcript:\n\n{transcript}"

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=(
                "You are an AI assistant that classifies speech transcripts. You must analyze the transcript and classify it into EXACTLY one of the following categories:\n"
                "- Business Meeting\n"
                "- Lecture\n"
                "- Interview\n"
                "- Personal Notes\n"
                "- Podcast / Discussion\n"
                "- Unknown\n\n"
                "Respond with ONLY a valid JSON object (no markdown formatting, no code fences, no extra text) with precisely these keys:\n"
                "{\n"
                '  "recording_type": "one of the exact category strings listed above",\n'
                '  "confidence": 0-100 (an integer representing your confidence level),\n'
                '  "reason": "a short 1-2 sentence explanation of why this category was chosen"\n'
                "}\n\n"
                "If the text is too short, ambiguous, or lacks context to determine a type, classify it as 'Unknown' with low confidence."
            ),
        ),
    )

    raw_text = response.text.strip()

    # Clean markdown code fences if Gemini ignores instruction
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    raw_text = raw_text.strip()

    try:
        data = json.loads(raw_text)
        supported_types = {
            "Business Meeting",
            "Lecture",
            "Interview",
            "Personal Notes",
            "Podcast / Discussion",
            "Unknown",
        }
        if data.get("recording_type") not in supported_types:
            data["recording_type"] = "Unknown"

        # Ensure confidence is an integer between 0 and 100
        try:
            data["confidence"] = max(0, min(100, int(data.get("confidence", 100))))
        except (ValueError, TypeError):
            data["confidence"] = 100

        return data
    except Exception:
        # Fallback in case of parse failures
        return {"recording_type": "Unknown", "confidence": 100, "reason": "Failed to parse classifier JSON response."}
