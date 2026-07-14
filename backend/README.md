# Meeting AI Assistant — Backend (Phase 1)

Working end-to-end pipeline: record/upload audio → transcribe (Whisper, local) →
summarize + extract action items (Gemini API) → store locally in SQLite (or Postgres).

## What's here

```
backend/
  app/
    main.py                  # FastAPI app, routes
    config.py                # loads settings from .env
    database.py              # SQLAlchemy models (Meeting table)
    services/
      transcription.py       # faster-whisper wrapper
      ai_summary.py           # Gemini API call + JSON parsing
  requirements.txt
  .env.example
```

## Setup (Windows/Mac/Linux — run in a terminal)

1. **Python 3.11+** required. Check with `python3 --version`.

2. **Create a virtual environment and install dependencies:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate        # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and paste in your real Gemini API key
   (get a free key at https://aistudio.google.com/apikey). The default SQLite
   database needs no extra setup. You can use Postgres by changing `DATABASE_URL`.

4. **Run the server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   First request that transcribes audio will download the Whisper model
   (~1.5GB for `medium`) — this needs internet once, then it's cached locally.

5. **Check it's alive:**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return `{"status":"ok"}`. Interactive API docs are at
   http://localhost:8000/docs — you can upload a test file straight from there.

## Test the full pipeline

```bash
curl -X POST http://localhost:8000/meetings/upload \
  -F "file=@/path/to/a/short_recording.mp3"
```

This will (synchronously) transcribe the audio and return the full JSON:
title, summary, key points, decisions, action items.

Record yourself talking for 1-2 minutes about a fake "meeting" (mention a
decision and a task with a deadline) to see realistic output.

## Known limitations of this Phase 1 version (by design — fix in Phase 2+)

- **Synchronous processing**: the upload request blocks until transcription +
  summarization finish. Fine for testing, bad for a real app with longer
  recordings. Fix: move processing into a background task/queue.
- **No auth**: anyone who can reach the API can upload/read meetings. Fix:
  add Clerk/Auth.js on the frontend + JWT verification here.
- **Local disk storage**: audio files saved to `./uploads`, not S3/Blob. Fine
  until you need to deploy across multiple servers.
- **No RAG/chat yet**: `answer_question_about_meetings()` in `ai_summary.py`
  is a preview — wire it up once ChromaDB + embeddings are added (Phase 2).
- **CORS** is currently only open to `http://localhost:3000` — update this
  when your frontend gets a real domain.

## Next step

Once this works locally, the Phase 2 frontend (Next.js recording UI +
dashboard) POSTs to `/meetings/upload` and reads from `GET /meetings`.
