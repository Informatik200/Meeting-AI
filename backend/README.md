# Meeting AI Assistant — Backend (Phase 1)

Working end-to-end pipeline: record/upload audio → transcribe (Whisper, local) →
summarize + extract action items (Gemini API) → store locally in SQLite (or Postgres).

## What's here

```
backend/
  app/
    main.py                  # FastAPI app, routes
    config.py                # loads settings from .env
    database.py              # SQLAlchemy models (User, Meeting, Entity, ...)
    auth.py                  # password hashing, JWT, refresh tokens, Google sign-in
    rate_limit.py             # per-IP rate limiter
    logging_config.py        # structured JSON logging setup
    services/
      pipeline.py             # background processing orchestration
      transcription.py       # faster-whisper wrapper
      ai_summary.py           # Gemini API call + JSON parsing
      classification.py      # recording-type classification
      memory.py                # entity extraction + knowledge graph + global chat
      pdf_generator.py         # PDF export
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

   Leave `JWT_SECRET_KEY` and `GOOGLE_CLIENT_ID` blank for local dev — a
   random JWT secret is generated per process automatically (sessions just
   won't survive a restart), and the Google sign-in button hides itself when
   `GOOGLE_CLIENT_ID` isn't set. Set both explicitly in production.

   **If you have an existing local `meeting_ai.db` from before auth was
   added**: delete it (`rm meeting_ai.db`) and let the server recreate it.
   SQLite can't cleanly alter the old `entities` table's unique constraint in
   place, and the old data was never associated with a user anyway.

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
# Register (or use /auth/login on subsequent runs)
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "at-least-8-chars"}'
# -> {"access_token": "...", "user": {...}}

curl -X POST http://localhost:8000/meetings/upload \
  -H "Authorization: Bearer <access_token from above>" \
  -F "file=@/path/to/a/short_recording.mp3"
```

The upload returns immediately with `status: "transcribing"` - transcription
and summarization run in the background. Poll `GET /meetings/{id}` (with the
same `Authorization` header) until `status` becomes `"done"` or `"failed"`.

Record yourself talking for 1-2 minutes about a fake "meeting" (mention a
decision and a task with a deadline) to see realistic output.

## Authentication

- **Email/password**: `POST /auth/register`, `POST /auth/login`.
- **Google Sign-In**: `POST /auth/google` with `{"id_token": "<Google ID token>"}`
  from the frontend's Google Identity Services button. Requires `GOOGLE_CLIENT_ID`
  to be set (get one from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)).
- Every response includes a short-lived `access_token` (15 min by default) -
  send it as `Authorization: Bearer <token>` on every other request.
- A refresh token is set as an `httpOnly` cookie automatically; call
  `POST /auth/refresh` to get a new access token when the old one expires,
  and `POST /auth/logout` to revoke it.
- Every meeting is owned by the user who uploaded it - all endpoints filter
  by the authenticated user, and audio/PDF (which can't carry an
  `Authorization` header) use a short-lived signed `media_token` embedded in
  their URL instead (see `media_token` on any meeting response).

## Known limitations (by design — future work)

- **Local disk storage**: audio files saved to `./uploads`, not S3/Blob. Fine
  until you need to deploy across multiple servers.
- **No RAG/chat yet**: `answer_question_about_meetings()` in `ai_summary.py`
  is a preview — wire it up once ChromaDB + embeddings are added.
- **In-process background tasks**: the transcription/summarization pipeline
  runs via FastAPI `BackgroundTasks` in the same process, not a real task
  queue - fine for one server, not for horizontal scaling. It's structured
  so swapping in Celery/RQ later is a one-line change (see `app/services/pipeline.py`).
- **No formal DB migrations**: schema changes are applied via ad-hoc
  `ALTER TABLE` checks in `init_db()`, not Alembic.

## Next step

The Next.js frontend (recording UI + dashboard + login) POSTs to
`/meetings/upload`, `/auth/*`, and reads from `GET /meetings`.
