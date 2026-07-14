"""
Speech-to-text using faster-whisper (runs locally, no API cost).

First run will download the model weights (a few hundred MB to ~1.5GB
depending on model size) - this needs internet access once, then it's cached.
"""
from functools import lru_cache

from faster_whisper import WhisperModel

from app.config import settings


@lru_cache(maxsize=1)
def get_model() -> WhisperModel:
    """
    Loaded once and cached - loading the model takes a few seconds,
    we don't want to do that on every request.

    device="cpu" works everywhere. If you have an NVIDIA GPU with CUDA,
    switch to device="cuda", compute_type="float16" for much faster transcription.
    """
    return WhisperModel(
        settings.whisper_model_size,
        device="cpu",
        compute_type="int8",  # int8 is fast and accurate enough on CPU
    )


def transcribe_audio(file_path: str) -> str:
    """
    Transcribes an audio file to plain text.
    Supports mp3, wav, m4a, webm, and most common audio formats.
    """
    model = get_model()

    segments, info = model.transcribe(
        file_path,
        beam_size=5,
        vad_filter=True,  # filters out silence, improves quality
    )

    # segments is a generator - each segment has .start, .end, .text
    full_text = " ".join(segment.text.strip() for segment in segments)

    return full_text.strip()


def transcribe_audio_with_timestamps(file_path: str) -> list[dict]:
    """
    Same as above but returns segments with timestamps, useful if you
    want to show a synced transcript later or build speaker diarization on top.
    """
    model = get_model()

    segments, info = model.transcribe(file_path, beam_size=5, vad_filter=True)

    return [
        {"start": seg.start, "end": seg.end, "text": seg.text.strip()}
        for seg in segments
    ]
