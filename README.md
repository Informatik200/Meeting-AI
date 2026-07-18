# Orivon — The Fastest AI Meeting Workspace

**Orivon** is a premium, open-source meeting assistant designed to get users to their meeting details within seconds. Record conversations directly in the browser or upload audio files, and immediately receive automated transcripts, formatted summaries, key points, action items, and decisions.

Everything is styled in a custom **Graphite Dark Theme** (featuring a minimal Notion-like spacing, Apple-like premium detail, and a focus-oriented workspace).

---

## Key Features

- **One-Click Recording & Upload**: Start browser microphone recording instantly or drop in audio files (`.webm`, `.mp3`, `.wav`, `.m4a`, `.ogg`, `.mp4`).
- **Graphite Dark Theme & 3-Column Layout**: A unified, high-contrast dark theme optimized for large screen real estate with a left navigation rail, central workspace, and right AI helper rail.
- **Orivon AI Assistant Panel**: Persistent chat helper that answers questions using the meeting context, drafts email follow-ups, exports PDFs, and routes queries globally when no specific meeting is selected.
- **Local Speech-to-Text**: Offline transcription powered by `faster-whisper` ensures audio files are processed locally on-disk.
- **AI-Powered Structured Notes**: Gemini-generated titles, editorial summaries, bulleted key points, decisions, and action items.
- **Production-Ready Security & Multi-Tenancy**: Complete registration and login system with JWT tokens, Google Sign-In support, secure sessions, and strict data isolation across accounts.
- **Keyboard Shortcuts**: High-speed productivity shortcuts (e.g. Space to play/pause, Arrow keys to skip, ⌘K focus search) to minimize click overhead.

---

## Technology Stack

- **Frontend**: Next.js (Turbopack, Tailwind CSS v4, TypeScript, React 19)
- **Backend**: FastAPI (Python 3.9+, Uvicorn)
- **Database**: SQLite (SQLAlchemy, Alembic database migration ready)
- **Transcription**: `faster-whisper`
- **Summary Generator**: Google Gemini API

---

## Local Setup

### Prerequisites
*   **Node.js 20+**
*   **Python 3.9+**
*   **Gemini API Key** (Get a free key from the [Google AI Studio](https://aistudio.google.com/apikey))

---

### Step 1: Start the Backend Service
In a new terminal window:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Open backend/.env and add your GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

---

### Step 2: Start the Frontend Application
In a separate terminal window:
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Verification Checks

A verification script is included in the project to run formatting, linting, type checks, and tests across both frontend and backend directories:
```bash
./scripts/verify.sh
```

### Manual Individual Commands:
*   **Backend Pytest suite**: `pytest`
*   **Backend Linting**: `ruff check .`
*   **Frontend Type Check**: `npm run typecheck`
*   **Frontend Linting**: `npm run lint`
*   **Frontend E2E Tests**: `npm run test:e2e` (Playwright)

---

## Directory Structure

```
├── backend/            FastAPI, Whisper transcription, SQLite DB, and Gemini summaries
├── frontend/           Next.js client interface, components, and Playwright spec suites
├── design/             Stitch visual replica guidelines and assets
├── docs/               Consolidated product, technical, schema, and design specifications
└── scripts/            Unified quality verification scripts
```

---

## Documentation

For deep dives into Orivon's design guidelines, data layouts, lifecycle flows, and technical definitions, see the following consolidated sheets:
*   [Product Requirements Document (PRD)](file:///Users/rahultanwar/Documents/Codex/2026-07-15/build/meeting-ai/docs/PRD.md)
*   [Technical Requirements Document (TRD)](file:///Users/rahultanwar/Documents/Codex/2026-07-15/build/meeting-ai/docs/TRD.md)
*   [Technical Architecture (ARCHITECTURE)](file:///Users/rahultanwar/Documents/Codex/2026-07-15/build/meeting-ai/docs/ARCHITECTURE.md)
*   [Application Interaction Flow](file:///Users/rahultanwar/Documents/Codex/2026-07-15/build/meeting-ai/docs/APP_FLOW.md)
*   [UI/UX Design Specification](file:///Users/rahultanwar/Documents/Codex/2026-07-15/build/meeting-ai/docs/UI_UX_BRIEF.md)
*   [Backend Database Schema](file:///Users/rahultanwar/Documents/Codex/2026-07-15/build/meeting-ai/docs/BACKEND_SCHEMA.md)
*   [Implementation Log & Retrospective](file:///Users/rahultanwar/Documents/Codex/2026-07-15/build/meeting-ai/docs/IMPLEMENTATION_PLAN.md)

