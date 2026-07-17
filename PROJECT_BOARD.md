# GitHub Projects v2 Schema: 🚀 Orivon Alpha

This document defines the official GitHub Project (Projects v2) board layout, labels, milestones, and issues for **Orivon**. It acts as the direct configuration guide for GitHub project administrators.

---

## Project Settings

- **Project Name**: `🚀 Orivon Alpha`
- **Description**: `Engineering roadmap for Orivon. This project tracks all work required to reach a stable Alpha release. Every task must improve reliability, UX, performance, or product quality.`

---

## Status Columns

1. `📥 Inbox` - Default landing column for new issues/suggestions.
2. `📋 Ready` - Refined tasks ready for sprint planning.
3. `🚧 In Progress` - Active development phase.
4. `👀 Review` - Pull Request under design/code peer review.
5. `🧪 Testing` - QA, Playwright test validation, and manual audit.
6. `✅ Done` - Validated and merged changes.
7. `💡 Icebox` - Deferred ideas and future iterations.

---

## Repository Labels

| Label | Color | Description |
| :--- | :--- | :--- |
| `bug` | `#D73A4A` | Functional regressions or defects |
| `ui` | `#39D353` | Visual changes, padding, typography, colors |
| `ux` | `#1D76DB` | Flow logic, shortcut handling, interaction feel |
| `frontend` | `#F9D0C4` | Frontend Next.js component updates |
| `backend` | `#0052CC` | Backend FastAPI and Database updates |
| `playback` | `#5319E7` | Audio controls, scrubbing, speed controls |
| `ai` | `#C8F135` | Gemini prompting, classification, summary logic |
| `memory` | `#BFD4F2` | Entity relationship tags and related index models |
| `performance` | `#0E8A16` | React re-render optimization, speed improvements |
| `accessibility` | `#FBCA04` | Focus rings, ARIA labels, semantic keyboard tab-stops |
| `enhancement` | `#A2EEEF` | Visual improvements and micro-interactions |
| `high-priority` | `#B60205` | Blockers or milestone gating tasks |

---

## Milestones

- **Alpha 0.8 – Stability**: Focus on audio playback stability, shortcuts, and core visual alignment.
- **Alpha 0.9 – Premium UX**: Focus on smooth animations, responsive screens, and empty state guides.
- **Beta 1.0**: Focus on async job workers, multi-tenant databases, and production infrastructure.
- **Public Launch**: Focus on onboarding guides, exports, and integrations.

---

## Issues List & Assignment

### Category: CRITICAL (Alpha 0.8)

#### 1. Fix audio seek regression
- **Milestone**: `Alpha 0.8 – Stability`
- **Labels**: `bug`, `playback`, `frontend`, `high-priority`
- **Complexity**: `M`
- **Description**:
  When a user switches between recordings, the React playing state remains out of sync with the native audio element (playing state stays `true` while the new element resets to paused). Additionally, attempting to seek on unbuffered audio throws DOM exceptions.
- **Acceptance Criteria**:
  - [ ] Source changes trigger `audio.load()`, resetting `playing` state to `false`.
  - [ ] Time and duration state values are reset to `0` during load.
  - [ ] Seeking checks if `audio.readyState >= 1` before setting `currentTime`.

#### 2. Fix forward/backward controls
- **Milestone**: `Alpha 0.8 – Stability`
- **Labels**: `enhancement`, `playback`, `frontend`
- **Complexity**: `S`
- **Description**:
  Add explicit control buttons to skip backward 10 seconds and forward 10 seconds.
- **Acceptance Criteria**:
  - [ ] Skip buttons render to the left and right of the play/pause button.
  - [ ] Clicking backward seeks `currentTime - 10`.
  - [ ] Clicking forward seeks `currentTime + 10`.

#### 3. Restore keyboard shortcuts
- **Milestone**: `Alpha 0.8 – Stability`
- **Labels**: `ux`, `accessibility`, `frontend`
- **Complexity**: `S`
- **Description**:
  Ensure global keyboard shortcuts control playback. Shortcuts must be ignored when typing inside text inputs, textareas, or contenteditable divs.
- **Acceptance Criteria**:
  - [ ] `Space` toggles play/pause.
  - [ ] `Left Arrow` skips backward 10 seconds.
  - [ ] `Right Arrow` skips forward 10 seconds.
  - [ ] `document.activeElement` checks prevent accidental triggers while typing in AI Chat.

#### 4. Fix playback progress synchronization
- **Milestone**: `Alpha 0.8 – Stability`
- **Labels**: `bug`, `playback`, `ui`, `frontend`
- **Complexity**: `M`
- **Description**:
  Progress bar must reflect exact current playback ratios. Scrubber dragging must be smooth, and clicking a point on the track must seek to that ratio.
- **Acceptance Criteria**:
  - [ ] Scrubber input uses dynamic linear gradient backgrounds painted via CSS variables.
  - [ ] Clicking seeking updates the track smoothly.
  - [ ] Dragging the scrubber changes visual progress in real-time, only setting audio `currentTime` on release to prevent network stalling.

#### 5. Full recording workflow QA
- **Milestone**: `Alpha 0.8 – Stability`
- **Labels**: `ux`, `frontend`, `backend`, `testing`
- **Complexity**: `M`
- **Description**:
  Validate the entire audio capture, file upload, transcription, and graph extraction pipelines.
- **Acceptance Criteria**:
  - [ ] Microphone recording starts, pauses, resumes, and stops.
  - [ ] Audio files upload, and the progress timeline accurately completes.
  - [ ] Extracted items appear correctly in the Workspace tabs.

---

### Category: HIGH (Alpha 0.9)

#### 6. Homepage redesign
- **Milestone**: `Alpha 0.9 – Premium UX`
- **Labels**: `ui`, `ux`, `frontend`, `high-priority`
- **Complexity**: `L`
- **Description**:
  Redesign the central reading sheet into a single-column, editorial document layout.
- **Acceptance Criteria**:
  - [ ] Card borders and boxes are removed.
  - [ ] Text width is constrained to `720px` max-width.
  - [ ] Summary text uses standard body sizes and line-heights.

#### 7. Premium audio player
- **Milestone**: `Alpha 0.9 – Premium UX`
- **Labels**: `ui`, `playback`, `frontend`
- **Complexity**: `M`
- **Description**:
  Redesign the audio player interface to resemble a premium audio tool (like Spotify or Apple Podcasts).
- **Acceptance Criteria**:
  - [ ] Play button size is visually dominant.
  - [ ] Custom volume tracks and mute icons are fully aligned.
  - [ ] Waveform bars sit inside/behind the progress track.

#### 8. AI panel polish
- **Milestone**: `Alpha 0.9 – Premium UX`
- **Labels**: `ui`, `ux`, `ai`, `frontend`
- **Complexity**: `M`
- **Description**:
  Improve typography, margins, and chat bubbles inside the assistant panel.
- **Acceptance Criteria**:
  - [ ] Chat bubbles use rounded card layouts with offset bounds.
  - [ ] Suggestion chips wrap cleanly.
  - [ ] Chat input features a focused lime border.

#### 9. Sidebar collapse
- **Milestone**: `Alpha 0.9 – Premium UX`
- **Labels**: `ui`, `ux`, `frontend`
- **Complexity**: `S`
- **Description**:
  Enable collapsible sidebar capabilities with local state persistence.
- **Acceptance Criteria**:
  - [ ] Sidebar collapses to the edge with a simple toggle trigger.
  - [ ] Width is resizable between `180px` and `360px`.

#### 10. Loading states
- **Milestone**: `Alpha 0.9 – Premium UX`
- **Labels**: `ui`, `frontend`
- **Complexity**: `S`
- **Description**:
  Replace standard raw loaders with unified, minimal spinning indicators.
- **Acceptance Criteria**:
  - [ ] Media player play button replaces icons with custom inline loaders during buffering.
  - [ ] Workspace shows smooth, light skeletons during text load.

#### 11. Empty states
- **Milestone**: `Alpha 0.9 – Premium UX`
- **Labels**: `ui`, `ux`, `frontend`
- **Complexity**: `S`
- **Description**:
  Improve UI appearance when there are no decisions, action items, or chat messages.
- **Acceptance Criteria**:
  - [ ] Empty state containers display dashed, high-contrast frames.
  - [ ] Containers show helpful, actionable instruction texts (e.g. "Ask questions like...").

#### 12. Responsive layout audit
- **Milestone**: `Alpha 0.9 – Premium UX`
- **Labels**: `ui`, `ux`, `performance`, `frontend`
- **Complexity**: `M`
- **Description**:
  Perform audit on tablet and mobile resolutions.
- **Acceptance Criteria**:
  - [ ] Sidebar and AI Panel transition to clean vertical blocks on screens smaller than `900px`.
  - [ ] Reading workspace gutters adapt dynamically.

---

### Category: MEDIUM (Alpha 0.9)

#### 13. Animation polish
- **Milestone**: `Alpha 0.9 – Premium UX`
- **Labels**: `ui`, `ux`, `enhancement`
- **Complexity**: `S`
- **Description**:
  Standardize hover, press, and fade transitions.
- **Acceptance Criteria**:
  - [ ] Controls use `120ms` durations.
  - [ ] Panel states use `200ms` slide actions with `cubic-bezier(0.16, 1, 0.3, 1)`.

#### 14. Accessibility improvements
- **Milestone**: `Alpha 0.9 – Premium UX`
- **Labels**: `accessibility`, `frontend`
- **Complexity**: `S`
- **Description**:
  Verify contrast ratios and ARIA elements.
- **Acceptance Criteria**:
  - [ ] Focus outlines display clearly on all controls.
  - [ ] Icon-only buttons have descriptive `aria-label` tags.

#### 15. Theme consistency
- **Milestone**: `Alpha 0.9 – Premium UX`
- **Labels**: `ui`, `frontend`
- **Complexity**: `S`
- **Description**:
  Standardize dark colors and borders across all modules.
- **Acceptance Criteria**:
  - [ ] Backgrounds utilize `#0A0A0A` and `#121212`.
  - [ ] Custom scrollbars styled to prevent bright default browser tracks.

#### 16. Performance optimization
- **Milestone**: `Alpha 0.9 – Premium UX`
- **Labels**: `performance`, `frontend`
- **Complexity**: `M`
- **Description**:
  Minimize rendering scopes during player playback.
- **Acceptance Criteria**:
  - [ ] Time states do not trigger root page rerenders.
  - [ ] Range input tracking stays optimized.

---

### Category: FUTURE (Beta / Launch)

#### 17. Study Mode
- **Milestone**: `Beta 1.0`
- **Labels**: `ui`, `ux`, `frontend`, `ai`
- **Complexity**: `L`
- **Description**:
  Generate interactive flashcards and study decks from *Lectures* and *Personal Notes*.
- **Acceptance Criteria**:
  - [ ] Add backend study schemas.
  - [ ] Renders flashcard slides in the AI Assistant.

#### 18. Browser Extension
- **Milestone**: `Beta 1.0`
- **Labels**: `frontend`, `ux`
- **Complexity**: `L`
- **Description**:
  Capture Google Meet / Zoom tab audio directly.
- **Acceptance Criteria**:
  - [ ] Background workers pipe capture streams into Orivon.

#### 19. Mobile App
- **Milestone**: `Public Launch`
- **Labels**: `frontend`, `ux`
- **Complexity**: `L`
- **Description**:
  iOS/Android capture client.
- **Acceptance Criteria**:
  - [ ] Captures voice memo files and syncs with cloud schemas.

#### 20. Team Workspaces
- **Milestone**: `Beta 1.0`
- **Labels**: `frontend`, `backend`, `memory`
- **Complexity**: `L`
- **Description**:
  Shared knowledge graphs and group collections.
- **Acceptance Criteria**:
  - [ ] Multi-tenant isolation supports team sharing bounds.

#### 21. Calendar Integration
- **Milestone**: `Public Launch`
- **Labels**: `backend`, `ux`
- **Complexity**: `M`
- **Description**:
  Read upcoming meetings and link briefings.
- **Acceptance Criteria**:
  - [ ] Syncs with Google Calendar API.
