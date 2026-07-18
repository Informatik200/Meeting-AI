# Technical Architecture (ARCHITECTURE) — Orivon

This document describes the high-level system design, data flows, components, limits, and architectural scalability paths of the **Orivon** application.

---

## 2. Component Design & Responsibilities

### Frontend (Next.js)
*   **Role**: Handles audio recording capture (via browser `MediaRecorder` API), local file upload drops, dashboard indexing, and right-rail chat assistant prompts.
*   **State Management**: React state hooks.
*   **Authentication Guard**: The client checks access tokens in-memory. If missing, it restores the session from a secure HTTPOnly refresh cookie or redirects to the Login card.

### Backend (FastAPI)
*   **Role**: Serves REST APIs, validates authentication requests, mounts static folders for audio access, and coordinates background workers.
*   **Security Layers**: Custom Pydantic models validate request payloads, rate limiters prevent API flooding, and scoped SQL schemas isolate tenant data.

### Database (SQLAlchemy)
*   **Default**: SQLite database (`meeting_ai.db`) for lightweight, developer-friendly local setup.
*   **Production**: PostgreSQL adapter (`psycopg2-binary`) preloaded to support scalable concurrent database connections.

### AI Processing Pipeline
*   **Transcription**: Uses `faster-whisper` local model binaries spawned via python sub-threads to ensure data sovereignty.
*   **Summarization & Graph Connection**: Calls Google Gemini (`gemini-3.1-flash-lite`) via the `google-genai` SDK to run summarization, key points generation, and memory graph indexing.

---

## 3. Core Lifecycles

### Meeting Processing Lifecycle
1.  **Upload Stage**: The client uploads raw audio. The backend saves it to disk and writes a database record in `transcribing` status.
2.  **Queue Stage**: FastAPI places the job on the background worker thread via Starlette `BackgroundTasks`.
3.  **Transcription Stage**: Worker invokes Whisper. Transcript is written to the database; status transitions to `summarizing`.
4.  **Analysis Stage**: Worker invokes Gemini to structure summaries and extract context tag entities.
5.  **Completion Stage**: Database record status transitions to `done` (or `failed` if an unhandled error is caught).

---

## 4. Scalability & Production Transition Path

To transition Orivon from its current single-server prototype into an enterprise SaaS scale, the following architectural upgrades are recommended:

1.  **Decoupled Worker Queue (Celery/Redis)**:
    *   *Current*: Starlette `BackgroundTasks` run on the same CPU cores as the web server, which can block API responsiveness during concurrent uploads.
    *   *Next Steps*: Replace `BackgroundTasks` with a dedicated Celery task worker cluster backed by a Redis message broker, moving cpu-intensive Whisper tasks to separate compute nodes.
2.  **Object Storage (AWS S3 / GCS)**:
    *   *Current*: Files are written to local server disk storage (`/app/uploads`).
    *   *Next Steps*: Transition upload routes to return signed URLs, letting clients upload audio directly to AWS S3/GCS to allow stateless container scaling.
3.  **Speaker Diarization**:
    *   *Next Steps*: Integrate speaker recognition engines (e.g. `pyannote.audio` or managed APIs) to map transcripts to specific named attendees.
4.  **Database Migration (Alembic)**:
    *   *Next Steps*: Initialize Alembic database migrations to manage future schema revisions on PostgreSQL production clusters.
