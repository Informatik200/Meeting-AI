from google import genai

from app.config import settings


def get_gemini_client() -> genai.Client:
    """Configure and return the Gemini client."""
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not configured. Add it to backend/.env and retry.")
    return genai.Client(api_key=settings.gemini_api_key)
