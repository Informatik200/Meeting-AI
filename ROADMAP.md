# Product Roadmap: Meeting-AI

This document outlines the prioritized milestones and feature roadmap to transition Meeting-AI from an MVP into a production-grade, secure, and horizontally scalable corporate meeting assistant.

---

## Prioritized Milestones

```mermaid
gantt
    title Meeting-AI Development Timeline
    dateFormat  YYYY-MM-DD
    section P0
    Milestone 1: Production Security & Isolation :active, m1, 2026-07-16, 20d
    Milestone 2: Scalable Async Processing Worker  :after m1, m2, 15d
    section P1
    Milestone 3: Speaker Diarization & Analytics   :after m2, m3, 20d
    Milestone 4: Calendar Bots & Integrations     :after m3, m4, 25d
    section P2
    Milestone 5: Collaborative Workspace          :after m4, m5, 20d
```

### Milestone 1: Production Security & Multi-Tenancy (P0)
* **Goal**: Establish user authentication, secure data isolation, production databases, and cloud asset hosting.
* **Features**:
  1. **User Authentication (JWT/OAuth2)**: Registration, login, password recovery, and secure sessions.
  2. **Multi-Tenant Schema Isolation**: Ensure users can only view, search, upload, or export their own meetings.
  3. **PostgreSQL & Alembic Migrations**: Replace SQLite with PostgreSQL and introduce Alembic to manage database revisions.
  4. **Object Storage Uploads (AWS S3 / GCS)**: Transition file storage to secure cloud storage using pre-signed URLs.
  5. **CORS & Domain Hardening**: Clean up open CORS headers to prevent cross-site scripting vulnerabilities.
* **Business Value**: Essential prerequisite for enterprise adoption; guarantees customer data privacy and data compliance.
* **User Impact**: Users gain personal accounts, secure private storage, and reliable historical notes.
* **Engineering Effort**: **Medium (M)**
* **Risk**: Low-Medium (Standard implementations, but database data migrations require careful deployment handling).
* **Dependencies**: None.

---

### Milestone 2: Decoupled Async Worker Pipeline & Real-Time UX (P0)
* **Goal**: Isolate heavy audio transcription and external summarization APIs to prevent FastAPI web server freezes.
* **Features**:
  1. **Celery Worker Integration**: Move Whisper audio processing out of the API thread into isolated Celery workers backed by Redis.
  2. **Worker Scaling Policies**: Deploy separate, lightweight web processes and heavy CPU/GPU processing nodes.
  3. **WebSockets / SSE Processing Indicators**: Provide live, real-time status updates (e.g. "Transcribing 42%...", "Summarizing...") to the frontend instead of static placeholders.
  4. **API Retry Policies**: Handle Gemini rate limits and transient connection errors with automated task retries and backoff.
* **Business Value**: Drastically reduces server crashes, increases system stability, and slashes hosting bills via server scaling optimization.
* **User Impact**: Fluid, responsive interface that updates automatically without requiring browser refreshes.
* **Engineering Effort**: **Medium (M)**
* **Risk**: Low.
* **Dependencies**: Milestone 1 (PostgreSQL/Redis setups).

---

### Milestone 3: Speaker Diarization & Rich Transcription (P1)
* **Goal**: Attribute transcripts to specific speakers rather than rendering a block of continuous text.
* **Features**:
  1. **Speaker Diarization Engine**: Integrate speaker recognition (e.g., via `pyannote.audio` or managed API) to label dialogue blocks (`Speaker A: ...`, `Speaker B: ...`).
  2. **Speaker Name Mapping**: Allow users to assign real names to detected speaker profiles for the meeting.
  3. **Time-Aligned Playback**: Sync the text transcripts with the audio playback timeline, highlighting sentences as they are spoken.
* **Business Value**: Transforms raw speech notes into readable, conversational transcripts that mimic real meeting layouts.
* **User Impact**: Dramatically increases note readability, particularly for large group meetings or panel discussions.
* **Engineering Effort**: **Large (L)** (Requires complex audio waveform processing and front-end synchronization).
* **Risk**: Medium-High (Requires higher server CPU/GPU resources and audio-to-text syncing logic).
* **Dependencies**: Milestone 2.

---

### Milestone 4: Calendar Bots & Automated Recording (P1)
* **Goal**: Automate meeting recording by enabling recorders to join Zoom, Google Meet, and Microsoft Teams.
* **Features**:
  1. **Calendar Sync (Google Calendar/Outlook)**: Read user calendars to automatically discover upcoming meetings.
  2. **Recording Calendar Bot**: Launch a headless web container (Puppeteer/WebRTC) to join audio calls, record the feed, and automatically upload the meeting to the pipeline.
  3. **Webhook Notifications**: Post summaries and action items automatically to Slack, Microsoft Teams, or email lists.
* **Business Value**: Eliminates the friction of manual recording and uploading, aligning with Fireflies.ai and Otter.ai workflows.
* **User Impact**: Complete hands-off experience; meeting summaries arrive in Slack 5 minutes after a call ends.
* **Engineering Effort**: **Large (L)**
* **Risk**: High (Video call platforms frequently change layouts, requiring continuous maintenance of headless bots).
* **Dependencies**: Milestone 2, Milestone 3.

---

### Milestone 5: Collaborative Workspace & Interactive Editors (P2)
* **Goal**: Build collaborative editor tools around the generated meeting records.
* **Features**:
  1. **Interactive Summaries**: Allow users to edit, add, or delete bullet points and action items, keeping the changes synchronized in the database.
  2. **Workspace Permissions**: Share meeting notes within teams, departments, or with external stakeholders via secure guest links.
  3. **Semantic Search (RAG)**: Ask questions across all historical meeting summaries using a semantic database search (e.g. "What did we decide on pricing last month?").
* **Business Value**: Converts a read-only archive into an active corporate repository of knowledge and decisions.
* **User Impact**: Team members can easily share notes, refine action items, and search corporate memory.
* **Engineering Effort**: **Medium-Large (M/L)**
* **Risk**: Low.
* **Dependencies**: Milestone 1, Milestone 2.

---

## Tech Lead Recommendation: Next High-ROI Step

I recommend prioritizing **Milestone 2: Decoupled Async Worker Pipeline & Real-Time UX**.

### Justification:
* **Immediate System Stability**: Moving transcription (Whisper) out of the FastAPI main request thread stops API server freezes. It prevents web request timeouts and database write locking.
* **High User Value (Real-Time UX)**: Transitioning from static polling to WebSockets or Server-Sent Events (SSE) updates changes the feel of the product from a static uploader to a dynamic, modern SaaS platform.
* **Cost Efficiency**: Decoupling the workers allows us to deploy the web server on a cheap, lightweight instance while routing CPU/GPU-heavy Whisper tasks to dedicated auto-scaling worker nodes only when files are actively processing.
