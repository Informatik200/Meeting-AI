# ORIVON Product Architecture Spec

This document defines the official product architecture, module structures, screen systems, lifecycles, and future roadmap directions for **ORIVON**. It is the reference blueprint for all product managers, UX architects, and engineering teams.

---

## 1. Product Vision

### What Orivon Is
Orivon is an **AI Knowledge Workspace** that turns conversation into structured memory. It is a repository of mapped knowledge, not a collection of audio files.

### The Problem It Solves
Raw audio and flat transcript text represent high-entropy, low-retrievability databases. Humans forget the nuances, decisions, and connections discussed during standups, lectures, and interviews within 48 hours. Orivon resolves this by automatically indexing, linking, and exposing these memories semantically.

### Mental Model
Users should treat Orivon like a **second brain**. It is a quiet background system that captures, structures, and links information across time, letting users ask questions of their past conversations.

---

## 2. User Journey

### 1. First Launch
- The system presents a clean, empty state with minimal visual distraction.
- Clear instructions on how to start: live recording (microphone) or drag-and-drop file upload.

### 2. Recording
- Visual focus shifts into a high-fidelity visualizer (mic-level feedback, timer) without leaving the context sheet.
- Supports pause, resume, finish, and cancel.

### 3. Processing
- Instantly triggers a progress timeline check: Upload -> Speech recognition -> Summary creation -> Topic extraction -> Memory graph indexing.

### 4. Reading
- The user is presented with an editorial, publication-grade document layout.
- Sections: Overview (executive summary, action items with owner assignments), Transcript, and Memory.

### 5. Memory & Connection
- Extracted tags (people, projects, topics) link the recording automatically to other meetings containing matching entities.

### 6. Searching & Querying
- Users type into the search bar or chat assistant. The scope is either local (per-recording) or global (cross-recording memory graph queries).

### 7. Daily & Weekly Workflows
- **Daily**: Capture standard standups, voice notes, and quick client calls. Verify action items.
- **Weekly**: Query global search: *"What tasks did Alice agree to lead this week?"* or *"What did we decide on the frontend UI system?"*

---

## 3. Product Modules

| Module | Purpose | Justification |
| :--- | :--- | :--- |
| **Home** | Primary dashboard containing recent indices | Serves as the landing area for context retrieval. |
| **Capture** | Seamless recording and upload interface | Handles MediaRecorder inputs and local file parsing. |
| **Workspace** | High-fidelity reading sheets & tab switchers | Where consumption and editorial reading take place. |
| **Transcript** | Flat text view with warning indicators | Raw text lookup; lists why synchronizations are disabled. |
| **Memory** | Interactive Graph cloud tags and connections | Displays relationships between entities. |
| **Library** | Searchable lists, filters, and favorites | File indexing and manual organization of records. |
| **Search** | Semantic search inputs and cross-meeting results | The core entry point for memory retrieval. |
| **Study** | Flashcards and concept study guide triggers | Disabled utility deck placeholders (Coming soon). |
| **Settings** | Global localization and profile configuration | Configures user language and interface toggles. |
| **Assistant** | Floating right-rail AI grounded helper | Handles per-recording and global chat memory prompts. |

---

## 4. Screen Architecture

### 1. Library Dashboard Screen
- **Purpose**: Index and display all records.
- **Primary Actions**: Select record, filter by starred, search index, trigger capture flow.
- **Secondary Actions**: Change system language, access Settings.

### 2. Selected Workspace Screen
- **Purpose**: Consume a single record's structured findings.
- **Primary Actions**: Toggle tabs (Overview, Transcript, Memory), play audio stream.
- **Secondary Actions**: Manual override type classification, toggle star favorite, resize panels.

### 3. AI Assistant Panel
- **Purpose**: Conversational analysis.
- **Primary Actions**: Send prompt query, click suggested action chip, copy summary, generate email draft, export PDF.
- **Secondary Actions**: Toggle global search scope.

---

## 5. Navigation Architecture

```
[Global Navigation System]
 ├── Search Index Input (⌘K)
 ├── Record & Upload Tab (⌘N)
 ├── Settings Tab
 └── Library Records List
      └── Workspace Context Tab Selector (Overview / Transcript / Memory)
```

- **Global Navigation**: Located in the sidebar. Standard desktop spacing.
- **Keyboard Shortcuts**:
  - `Space` toggles player Play/Pause.
  - `←` seeks back 10s.
  - `→` seeks forward 10s.
  - `Esc` closes current modal or collapsible panel.
  - `⌘⌥C` collapses/expands the AI assistant panel.

---

## 6. Recording Lifecycle

```
[Idle] ──(Click Mic / Upload)──> [Recording] ──(Pause)──> [Paused]
                                     │
                                (Finish / Stop)
                                     │
                                     ▼
                                [Processing] ──(Sync Block)──> [Completed]
                                                                   │
                                                                   ├──> [Archived]
                                                                   └──> [Deleted]
```

- **Idle**: Clean surface, microphone trigger, choice input.
- **Recording**: Active audio context stream, timer ticks, visualizer moves.
- **Paused**: Audio stream paused, visualizer static, timer frozen.
- **Processing**: Simulates steps: Upload -> Transcribe -> Summarize -> Extract -> Index.
- **Completed**: Status set to `done`, playback allowed.
- **Deleted**: Audio file deleted, graph connections decoupled, record purged.

---

## 7. AI Lifecycle

1. **Transcription**: Converts raw speech-to-text.
2. **Classification**: Analyzes transcript patterns to classify the record (e.g. *Business Meeting*, *Lecture*).
3. **Summary**: Extracts primary overview, key points, decisions, and action items.
4. **Memory Graph Extraction**: Parses entities (people, projects, topics) and creates relational connections.
5. **Assistant**: Utilizes local context or global connections to answer grounded queries.

---

## 8. Knowledge Model

```
                    +--------------------+
                    |      Meeting       |
                    +---------+----------+
                              | 1
                              |
                              | *
                    +---------v----------+
                    |   MeetingEntity    |
                    +---------+----------+
                              | *
                              |
                              | 1
                    +---------v----------+
                    |       Entity       |
                    +--------------------+
```

- **Meeting**: ID, title, status, classification type, raw transcript, summary text, created_at.
- **Entity**: Name (e.g., "Alice"), Category (e.g., *People*, *Project*, *Topic*).
- **MeetingEntity (Connection)**: Relates a Meeting to an Entity with surrounding conversational context.

---

## 9. Future Features

- **Study Mode**: Generates interactive flashcards and study decks from *Lectures* and *Personal Notes*.
- **Teams Workspace**: Shared knowledge graphs where group entities link automatically.
- **Browser Extension**: Instantly captures Google Meet / Zoom tabs and pipes audio directly into the Orivon upload queue.
- **Mobile Capture**: Minimal app focused purely on capturing voice memos and displaying processed action items.
- **Calendar Integration**: Matches upcoming events with processed Orivon meetings for pre-meeting briefing notes.

---

## 10. Product Principles

### Features Accepted
- Clear semantic improvements.
- Precision layout alignment rules.
- Understated keyboard utilities.

### Features Rejected
- Interactive bots, cartoon mascots, or animated emojis.
- Purple/Blue glow design styles.
- Advertising banners or marketing panels.

---

## 11. Long-term Roadmap

```
+------------------+------------------+------------------+
|                  |                  |                  |
|  Alpha           |  Beta            |  v1 Release      |
|  Local SQLite    |  Teams Space     |  Mobile App      |
|  Single User     |  Integrations    |  Workspace Sync  |
|                  |                  |                  |
+------------------+------------------+------------------+
```
- **Alpha**: Offline SQLite single user, core transcript analysis. (Current State)
- **Beta**: Shared graphs, Slack alerts for action items, Google Drive exports.
- **v1**: Native mobile iOS application for capture, browser extension support.
