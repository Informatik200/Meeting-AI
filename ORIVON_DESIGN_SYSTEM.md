# ORIVON Design System & Specification

This document defines the official visual identity, interaction guidelines, and engineering constraints for **ORIVON**. It is the single source of truth for all designers, engineers, and AI agents collaborating on the Orivon workspace.

---

## 1. Brand

### Mission
To turn raw human conversation into structured, searchable, and permanent intelligence.

### Vision
A world where no idea is lost, no decision is forgotten, and raw voice transforms into a structured personal knowledge network.

### Positioning
Orivon is **NOT** a recording app or a transcription dashboard. It is an **AI Knowledge Workspace**. We do not focus on "audio playback" as the primary utility; we focus on the **Knowledge Graph** and **Semantic Search** derived from conversation.

### Target Users
- **Product & Engineering Leaders**: Who need decision tracking and action summaries across multiple standups.
- **Researchers & Consultants**: Syncing interview notes, coding observations, and mapping concepts.
- **Students & Academics**: Converting complex lectures into study structures.

### Product Personality
- **Quiet**: Non-intrusive. Never sends unnecessary alerts or uses neon glows.
- **Precise**: High attention to details, sub-pixel borders, alignment, and semantic layout.
- **Academic**: Editorial, focused on reading comprehension, clarity, and structured indexing.

### Brand Voice
Direct, low-entropy, understated. We avoid marketing jargon like "revolutionary AI-powered recorder." We refer to features as "Memory Indexing," "Semantic Search," and "Knowledge Extraction."

### Core Principles
- **Orivon IS**: A permanent memory assistant; an editorial document workspace; a precision tool.
- **Orivon is NOT**: A chat toy; a media file catalog; a cluttered dashboard.

---

## 2. Design Philosophy

### Reading First
Reading is the primary way humans digest structured information. The transcript, summary, and action items must use the same spacing and layout rules as a high-end publication or a physical book.

### Memory Before Meetings
Individual recordings are temporary captures. The **Knowledge Graph** (entity links, projects, people) is permanent. The workspace highlights these permanent links over simple filenames.

### AI Assists, Never Dominates
AI output is treated as structured markdown. We do not use floating robots, chat bubbles with glowing avatars, or animated gradients to show AI is working. AI text is simply displayed as clean, high-contrast typography.

### Invisible Intelligence
The application does not show off features. We do not display confidence scores unless they are below a critical threshold (e.g., `< 80%`). We do not display complex background statistics.

### Minimal Cognitive Load & Calm Interfaces
We use a monochrome graphite base. Visual separators are minimal. Layout transitions are smooth and slow. If there is nothing to show, the system uses empty states that direct the user's attention instead of creating noise.

---

## 3. Layout System

Orivon uses a 3-column modular structure on desktop viewports.

### Grid Rules
- **Base Unit**: `4px`
- **Gaps**: `16px` or `24px`
- **Padding**: `12px` (Sidebar items), `24px` (Main panel), `36px` (Reading workspace)

### Desktop & Laptop Layout (≥ 1024px)
```
+------------------+--------------------------------------------+------------------+
|                  |                                            |                  |
|  Sidebar         |  Main Reading Workspace                    |  AI Assistant    |
|  (240px width)   |  (Max column width: 720px)                 |  (320px width)   |
|                  |                                            |                  |
+------------------+--------------------------------------------+------------------+
```
- **Max Reading Width**: `720px` (or `68ch`). Text elements must never stretch beyond this width.
- **Sidebar Collapse**: Collapses into a left-side edge trigger. Resizing changes width between `180px` and `360px` (stored in `localStorage`).
- **AI Panel Collapse**: Slides out to the right. Resizing changes width between `280px` and `480px`.

### Tablet & Compact Layout (< 1024px)
- Sidebar sits at the top or transitions into an overlay drawer.
- AI Assistant slides from the bottom or operates as a full-screen modal drawer.
- Vertical layout shifts to single-column with side margins at `16px`.

---

## 4. Typography

Orivon relies on two typefaces: **Inter** (sans-serif) for system elements, summaries, and actions; and **JetBrains Mono** (monospace) for timestamps, metadata tags, and code logs.

### Typographic Scale

| Style | Font | Weight | Size | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Title 1** | Inter | 700 (Bold) | `28px` | `1.2` | `-0.04em` | Recording Titles |
| **Title 2** | Inter | 600 (Semibold) | `20px` | `1.3` | `-0.03em` | Section Titles |
| **Subtitle** | Inter | 500 (Medium) | `15px` | `1.4` | `-0.02em` | Overview Cards |
| **Body Large** | Inter | 400 (Regular) | `15px` | `1.75` | `-0.01em` | Summaries & Reading Columns |
| **Body Regular**| Inter | 400 (Regular) | `13.5px` | `1.65` | `0` | Action Items, Descriptions |
| **Metadata** | JetBrains Mono| 500 (Medium) | `11px` | `1.4` | `0.05em` | Timestamps, Confidence Scores |
| **Caption** | Inter | 500 (Medium) | `10px` | `1.4` | `0.1em` | Category Titles (Uppercase) |

---

## 5. Color System

The palette is strictly dark mode by default, utilizing a graphite-black scale to prevent eye strain and create a calm interface.

### The Graphite Palette
- `Base Background`: `#0A0A0A`
- `Surface (Cards / Inputs)`: `#121212`
- `Elevated (Dropdowns / Hover states)`: `#1A1A1A`
- `Active state background`: `rgba(255, 255, 255, 0.05)`

### Borders
- `Border Subtle`: `rgba(255, 255, 255, 0.06)`
- `Border Mid`: `rgba(255, 255, 255, 0.12)`
- `Border Strong`: `rgba(255, 255, 255, 0.20)`

### Text Colors
- `Primary Text`: `#E8E6E1` (Warm off-white)
- `Secondary Text`: `#C4C0B8` (Soft gray)
- `Muted / Disabled`: `#6B6660` (Graphite gray)

### The Accent (Acid Lime)
- `Value`: `#C8F135`
- `Usage Constraint`: Can only occupy up to **1.5%** of the screen surface. Reserved for:
  - Playback track progress
  - Active navigation state bars
  - Pulsing recording indicator ring
  - Brand dot on headers
- **Never use for background fills, large button states, or decorative icons.**

---

## 6. Component Library

### 1. Primary Buttons
- **Variants**: Brand (`--brand`), Ghost (`--border-mid`), Danger (`#F87171` text/border).
- **Height**: `36px` (Desktop)
- **Radius**: `8px` (Standard)
- **Interactions**:
  - Hover: Background lightens by 5%; transform scaling `0.98`.
  - Focus: Solid `2px` lime ring with `2px` offset.

### 2. Audio Player & Waveform
- **Scrubber**: Range input over simulated static waveform bars.
- **Speed Rates**: `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`.
- **Keyboard Shortcuts**:
  - `Space` toggles Play/Pause.
  - `ArrowLeft` / `ArrowRight` seek back/forward 10s.

### 3. AI Assistant chat bubbles
- **Bubbles**: Nested cards with different corner radii.
  - User bubbles are aligned right, colored in `--brand` (black text).
  - Assistant bubbles are aligned left, colored in `#1A1A1A`.
- **Suggestions**: Interactive chips wrapped in thin subtle borders.

### 4. Memory Entity Tags
- **Category Colors**:
  - People: Muted Lime.
  - Projects: Muted Amber (`#FBBF24`).
  - Topics: Muted Violet (`#A78BFA`).
- **Context Tooltips**: Native HTML `title` or custom overlay tools displaying occurrence context.

---

## 7. Motion System

Orivon avoids decorative animations. Motion must only occur during state changes to direct user attention.

### Animation Principles
- **Timeline**: Short durations.
  - Micro-interactions (hover, click): `120ms`
  - Panel transitions (slide, expand): `200ms`
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (smooth out-quint).
- **Reduced Motion**: Respects `(prefers-reduced-motion: reduce)` by disabling slide transitions.

---

## 8. Accessibility

- **Contrast**: Text contrast ratio of at least `4.5:1` (off-white on dark gray).
- **Focus Rings**: Every interactive button, range scrubber, and input field must have an explicit `:focus-visible` ring.
- **ARIA labels**: Essential for icon-only buttons (like player skip or panel collapse triggers).

---

## 9. Engineering Rules

- **Zero HTML default controls**: Native scrollbars, audio players, select arrows, and checkboxes must be styled.
- **Spacing Scale**: Spacings must be multiples of the base unit (`4px` / `8px` / `12px` / `16px` / `24px` / `32px` / `48px`).
- **Radius Scale**: Corner radius is limited to `5px` (small), `8px` (standard), `10px` (medium), and `14px` (large).

---

## 10. Product UX Rules

- **Recording State**: Clicking record transitions the workspace seamlessly into a full visualizer.
- **Auto-Upload**: Dragging/choosing a file instantly starts the upload and displays the progress timeline.
- **Transcript Timestamps**: Since the database schema does not support word-level timestamp metadata, auto-follow is disabled, and an explicit informational notice is rendered in the tab.

---

## 11. Design QA Checklist

Before merging any PR, the following design checks must pass:
1. [ ] Text lines are constrained to `720px` max-width.
2. [ ] Acid-lime accent color is used only for active indicators and scrubber progress.
3. [ ] All buttons have `:focus-visible` focus outlines.
4. [ ] Standard spacing scale numbers (`8px`, `12px`, `16px`, `24px`) are used instead of random margins.
5. [ ] Custom scrollbars match the dark theme in Webkit/Firefox.

---

## 12. Future Roadmap Inheritance

Any new view (such as Collections, Analytics, or Team Spaces) must inherit these design system layout shells, type hierarchies, and component grids directly.
