"""
Sends a meeting transcript to Google Gemini and gets back a structured summary.
"""

import json

from google.genai import types

from app.services.gemini import get_gemini_client

PROMPTS_BY_TYPE = {
    "Business Meeting": (
        "Focus on business topics, action items, owner tasks, decisions, and deadlines. "
        "Summarize project alignments and next steps."
    ),
    "Lecture": (
        "Focus on educational concepts, teacher explanations, learning guides, definitions, and questions discussed."
    ),
    "Interview": (
        "Focus on candidate skills, background details, answers to technical or behavioral questions, and strengths/weaknesses."
    ),
    "Personal Notes": ("Focus on key thoughts, to-do reminders, ideas, tags, and brainstormed themes."),
    "Podcast / Discussion": (
        "Focus on conversational topics, participant opinions, debate themes, and interesting anecdotes."
    ),
    "Unknown": ("Identify the primary themes, discussions, and decisions mentioned in the text."),
}


def summarize_transcript(transcript: str, recording_type: str = "Unknown") -> dict:
    """
    Calls Gemini with the transcript and parses the structured JSON response.
    Applies specialized prompt logic based on the recording type.
    Raises ValueError if Gemini doesn't return valid JSON.
    """
    client = get_gemini_client()

    specialized_instruction = PROMPTS_BY_TYPE.get(recording_type, PROMPTS_BY_TYPE["Unknown"])

    system_instruction = (
        "You are an AI assistant specialized in analyzing speech transcripts.\n"
        f"The type of this recording is classified as: {recording_type}.\n"
        f"Analyze the transcript with this specific guidance: {specialized_instruction}\n\n"
        "Respond with ONLY a valid JSON object (no markdown fences, no preamble, no explanation) with exactly these keys:\n"
        "{\n"
        '  "title": "a short 5-8 word title for the meeting",\n'
        '  "summary": "a 3-5 sentence plain-language summary of what was discussed",\n'
        '  "key_points": ["list", "of", "the main topics discussed, as short phrases"],\n'
        '  "decisions": ["list", "of", "any decisions that were made, empty list if none"],\n'
        '  "action_items": [\n'
        '    {"task": "description of the task", "owner": "person responsible, or null if unclear", "due": "deadline mentioned, or null if none"}\n'
        "  ]\n"
        "}\n\n"
        "If the transcript is in German, write the summary/key_points/decisions in German too. "
        "Never invent content that is not present in the transcript."
    )

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=f"Here is the transcript:\n\n{transcript}",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
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
    client = get_gemini_client()

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


def answer_meeting_chat(question: str, transcript: str) -> str:
    """
    Answers a user's question about a specific meeting transcript using Gemini.
    Answers must be grounded strictly in the provided transcript text.
    """
    client = get_gemini_client()

    prompt = f"Meeting transcript:\n\n{transcript}\n\nUser Question: {question}"

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=(
                "Answer the user's question using ONLY the meeting transcript provided. "
                "Be direct, objective, and precise. If the transcript does not contain "
                "the information required to answer, clearly state that the answer is not "
                "present in the transcript. Do not guess or hallucinate any facts."
            ),
        ),
    )

    return response.text
