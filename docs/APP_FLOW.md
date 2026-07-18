# Application Flow (APP_FLOW) — Orivon

This document maps out the states, screens, transitions, and user interactions of the **Orivon** workspace.

---

## 1. Authentication Flow

```
[Unauthenticated Visitor]
       │
       ├──> Visit Dashboard / Home ──> Redirect to AuthScreen
       │
       ├──> [Register Form] ──> Enter Email/Password ──> Submit ──> Logged In (Redirect to Home)
       │
       ├──> [Login Form]    ──> Enter Credentials    ──> Submit ──> Logged In (Redirect to Home)
       │
       └──> [Google Login]  ──> OAuth Callback      ──> Submit ──> Logged In (Redirect to Home)
```

-   **Auth Guard**: The main route (`app/page.tsx`) checks if the user is authenticated. If not, it renders `AuthScreen.tsx` as a full-page modal card.
-   **Session Restore**: On page load, `refreshSession()` is called to fetch a new token from the `httpOnly` refresh cookie, keeping sessions intact.
-   **Logout**: Wipes the in-memory access token, triggers `POST /auth/logout` to revoke the database cookie, and resets screen states to `AuthScreen`.

---

## 2. Dashboard Workspace Flow

Once authenticated, the user enters the main 3-column workspace:
1.  **Sidebar (Left Rail)**: Contains navigation items (Home, Meetings list, Search, Uploads, Settings) and the User Account menu.
2.  **Central Sheet (Reading Workspace)**:
    *   **Empty State**: Renders when there are no meetings. Displays a dashed graphite border with a large microphone/upload CTA button.
    *   **Dashboard Feed**: Displays a clean greeting header ("Guten Morgen, Rahul") and a list of recent recordings with relative time summaries ("2 hours ago", "Yesterday").
3.  **AI Helper (Right Rail)**: Persistent sidebar providing quick actions and localized chat interactions.

---

## 3. Recording & Capture Flow

```
[Click "Record" / Drop File]
       │
       ▼
[Active Visualizer State]
       │
       ├──> Timer updates dynamically
       └──> Mic audio waveform level moves
       │
       ▼
[Stop Recording / Click Done]
       │
       ▼
[Decoupled Progress States]
       │
       ├──> "transcribing" (Whisper processing local audio bytes)
       ├──> "summarizing"  (Gemini generating structured summaries)
       └──> "done"         (Renders final structured workspace)
```

*   **Microphone Access**: Clicking "Record" requests browser microphone permissions, initializes `MediaRecorder`, and automatically begins capturing audio.
*   **Progress Indicators**: When uploading/processing, a clean horizontal animated loading progress bar is displayed with status text messages.
*   **Terminal Polling**: Frontend starts a background polling process checking `GET /meetings/{id}` every 2 seconds until the status returns `done` or `failed`.

---

## 4. Single Workspace Consumables

When a meeting is selected, the central sheet transitions into a structured document workspace:
*   **Header Bar**: Displays the meeting title (inline editable), time metadata, and playback speed controls.
*   **Overview Tab**: Constrained to `720px` width. Displays the editorial executive summary, bulleted key points, decisions, and action items.
*   **Transcript Tab**: Flat text transcript. Includes a subtle banner explaining that transcription was generated offline.
*   **Memory Graph Tab**: Cloud of tags representing extracted entities (People, Projects, Technologies, Topics) that link this meeting to others.

---

## 5. Right-Rail AI Interaction

The right panel has two main modes depending on selection:
*   **Local Scope**: Grounds AI responses in the selected meeting transcript. Renders interactive suggestions:
    *   *Draft email follow-up*
    *   *Extract action items table*
    *   *Draft summary brief*
*   **Global Scope**: Grounds AI responses across all meetings owned by the user.

---

## 6. Settings Panel

Accessed via the Left Sidebar. Renders a central settings card containing:
1.  **Localization settings**: Switch application display state between German (DE) and English (EN).
2.  **Change Password form**: Update user password.
3.  **System configuration details**: Database mode indicator, version numbers, and developer credits.
