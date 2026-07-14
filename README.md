# Meeting AI

**A private, open-source meeting assistant.** Record in your browser or upload audio, then receive a transcript, concise summary, decisions, and action items.

## MVP features

- Browser microphone recording and audio upload (`.webm`, `.mp3`, `.wav`, `.m4a`, `.ogg`, `.mp4`)
- Local speech-to-text with faster-whisper — audio never goes to a transcription API
- Gemini-powered structured notes: title, summary, key points, decisions, and action items
- A simple meeting dashboard with history and full transcript
- SQLite by default: no Docker or database setup needed for the demo

## Stack

Next.js · FastAPI · faster-whisper · Google Gemini · SQLite (Postgres-ready)

## Run locally

Prerequisites: **Node.js 20+**, Python **3.10+**, and a Gemini API key (free at https://aistudio.google.com/apikey).

Start the API in one terminal:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add GEMINI_API_KEY to backend/.env
uvicorn app.main:app --reload --port 8000
```

Start the frontend in another terminal:

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), record a short mock meeting, then click **Transcribe & summarize**. The first transcription downloads the selected Whisper model and can take a few minutes.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/meetings/upload` | Upload audio and process it |
| `GET` | `/meetings` | List processed meetings |
| `GET` | `/meetings/{id}` | Get one meeting |

Interactive API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Project structure

```
backend/     FastAPI, Whisper transcription, Gemini summaries, SQLite/Postgres
frontend/    Next.js recording UI and meeting dashboard
```

## Current MVP trade-offs

Processing is synchronous, there is no authentication, and audio is stored on local disk. These are deliberate demo-stage choices; the next production increments are background jobs, authenticated accounts, object storage, RAG chat, and speaker diarization.
