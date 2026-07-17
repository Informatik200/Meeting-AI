"use client";

import { RefObject, useState } from "react";
import AudioPlayer from "./AudioPlayer";

// ── EmptyState helper ──────────────────────────────────────
function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="empty-state-card">
      <span className="empty-state-icon" aria-hidden="true">{icon}</span>
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-desc">{desc}</p>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────
type ActionItem = { task: string; owner: string | null; due: string | null };
type Meeting = {
  id: number;
  title: string;
  status: string;
  recording_type: string;
  confidence: number;
  audio_filename: string | null;
  media_token: string;
  transcript: string | null;
  summary: string | null;
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
  created_at: string | null;
};

type EntityTag = { name: string; context: string };
type RelatedMeeting = { id: number; title: string; shared_count: number };

const TYPE_ICONS: Record<string, string> = {
  "Business Meeting": "💼",
  "Lecture": "🎓",
  "Interview": "🎙",
  "Personal Notes": "📝",
  "Podcast / Discussion": "🎧",
  "Unknown": "❓",
};

type T = {
  summary: string;
  keyPoints: string;
  decisions: string;
  actionItems: string;
  processingStatus: string;
  processingFailed: string;
  detectedAs: string;
  change: string;
  relatedRecordings: string;
  mentionedPeople: string;
  mentionedProjects: string;
  mentionedTopics: string;
  overviewTab: string;
  transcriptTab: string;
  memoryTab: string;
  addedToMemory: string;
  comingSoon: string;
  "Business Meeting": string;
  Lecture: string;
  Interview: string;
  "Personal Notes": string;
  "Podcast / Discussion": string;
  Unknown: string;
};

// ── Props ──────────────────────────────────────────────────
interface RecordingWorkspaceProps {
  selected: Meeting;
  meetings: Meeting[];
  lang: string;
  t: T;
  apiUrl: string;
  favorites: number[];
  peopleTags: EntityTag[];
  projectTags: EntityTag[];
  topicTags: EntityTag[];
  relatedMeetings: RelatedMeeting[];
  transcriptRef: RefObject<HTMLDivElement | null>;
  isEditingType: boolean;
  newType: string;
  typeLoading: boolean;
  onToggleFavorite: (id: number) => void;
  onSetSelected: (m: Meeting) => void;
  onSetNewType: (v: string) => void;
  onSetIsEditingType: (v: boolean) => void;
  onOverrideType: () => void;
  formatDate: (v: string | null, lang: string) => string;
}

type WorkspaceTab = "overview" | "transcript" | "memory";

// ── Component ──────────────────────────────────────────────
export default function RecordingWorkspace({
  selected,
  meetings,
  lang,
  t,
  apiUrl,
  favorites,
  peopleTags,
  projectTags,
  topicTags,
  relatedMeetings,
  transcriptRef,
  isEditingType,
  newType,
  typeLoading,
  onToggleFavorite,
  onSetSelected,
  onSetNewType,
  onSetIsEditingType,
  onOverrideType,
  formatDate,
}: RecordingWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const isFav = favorites.includes(selected.id);
  const isProcessing =
    selected.status === "transcribing" || selected.status === "summarizing";

  return (
    <div className="rw-root">
      {/* ── Recording Header ─────────────────────────────── */}
      <header className="rw-header">
        <div className="rw-header-top">
          {/* Type badge */}
          <div className="rw-type-badge">
            <span className="rw-type-icon" aria-hidden="true">
              {TYPE_ICONS[selected.recording_type] ?? "❓"}
            </span>
            <span className="rw-type-label">
              {t[selected.recording_type as keyof T] || selected.recording_type}
            </span>
            {selected.confidence < 80 && (
              <span className="rw-confidence">
                {selected.confidence}%
              </span>
            )}

            {/* Type correction — quiet inline affordance */}
            {!isProcessing && (
              <>
                {isEditingType ? (
                  <span className="rw-type-editor">
                    <select
                      value={newType}
                      onChange={(e) => onSetNewType(e.target.value)}
                      disabled={typeLoading}
                      aria-label="Select recording type"
                    >
                      <option value="Business Meeting">{t["Business Meeting"]}</option>
                      <option value="Lecture">{t["Lecture"]}</option>
                      <option value="Interview">{t["Interview"]}</option>
                      <option value="Personal Notes">{t["Personal Notes"]}</option>
                      <option value="Podcast / Discussion">{t["Podcast / Discussion"]}</option>
                      <option value="Unknown">{t["Unknown"]}</option>
                    </select>
                    <button
                      className="rw-type-save"
                      onClick={onOverrideType}
                      disabled={typeLoading}
                    >
                      {lang === "de" ? "Speichern" : "Save"}
                    </button>
                    <button
                      className="rw-type-cancel"
                      onClick={() => onSetIsEditingType(false)}
                      disabled={typeLoading}
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <button
                    className="rw-type-change"
                    onClick={() => {
                      onSetNewType(selected.recording_type);
                      onSetIsEditingType(true);
                    }}
                    aria-label={t.change}
                  >
                    {t.change}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Favorite button */}
          <button
            className={`rw-fav-btn ${isFav ? "active" : ""}`}
            onClick={() => onToggleFavorite(selected.id)}
            aria-label={isFav ? "Remove from starred" : "Star recording"}
            aria-pressed={isFav}
          >
            {isFav ? "★" : "☆"}
          </button>
        </div>

        {/* Title */}
        <h1 className="rw-title">{selected.title}</h1>

        {/* Date */}
        <p className="rw-date">{formatDate(selected.created_at, lang)}</p>

        {/* Audio player */}
        {selected.audio_filename && selected.status === "done" && (
          <div className="rw-audio-wrapper">
            <AudioPlayer
              src={`${apiUrl}/meetings/${selected.id}/audio?token=${selected.media_token}`}
              ariaLabel="Play recording audio"
            />
          </div>
        )}
      </header>

      {/* ── Tab navigation ───────────────────────────────── */}
      <nav className="rw-tabs" aria-label="Recording workspace sections">
        {(["overview", "transcript", "memory"] as WorkspaceTab[]).map((tab) => (
          <button
            key={tab}
            className={`rw-tab ${activeTab === tab ? "rw-tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}
            aria-selected={activeTab === tab}
            role="tab"
          >
            {tab === "overview"    ? t.overviewTab :
             tab === "transcript" ? t.transcriptTab :
                                    t.memoryTab}
          </button>
        ))}
      </nav>

      {/* ── Tab Panels ───────────────────────────────────── */}
      <div className="rw-body" role="tabpanel">

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="rw-overview">

            {/* AI Summary — highest hierarchy */}
            <section className="rw-section rw-section-summary">
              <h2 className="rw-section-label">{t.summary}</h2>
              <p className="rw-summary-text">
                {selected.status === "failed"
                  ? t.processingFailed
                  : selected.summary || t.processingStatus}
              </p>
            </section>

            {/* Key Points — highly scannable list */}
            <section className="rw-section">
              <h2 className="rw-section-label">{t.keyPoints}</h2>
              {selected.key_points.length > 0 ? (
                <ul className="rw-key-points">
                  {selected.key_points.map((pt, i) => (
                    <li key={i} className="rw-key-point-item">
                      <span className="rw-kp-dot" aria-hidden="true" />
                      {pt}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="✦" title={t.keyPoints} desc={lang === "de" ? "Noch keine wichtigen Punkte aus dieser Aufnahme erfasst." : "No key points captured from this recording yet."} />
              )}
            </section>

            {/* Decisions */}
            <section className="rw-section">
              <h2 className="rw-section-label">{t.decisions}</h2>
              {selected.decisions.length > 0 ? (
                <ul className="rw-decisions">
                  {selected.decisions.map((d, i) => (
                    <li key={i} className="rw-decision-item">{d}</li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="✓" title={t.decisions} desc={lang === "de" ? "Noch keine Entscheidungen aus dieser Aufnahme erfasst." : "No decisions captured from this recording yet."} />
              )}
            </section>

            {/* Action Items */}
            <section className="rw-section">
              <h2 className="rw-section-label">{t.actionItems}</h2>
              {selected.action_items.length > 0 ? (
                <div className="rw-actions">
                  {selected.action_items.map((item, i) => (
                    <div key={i} className="rw-action-item">
                      <div className="rw-action-checkbox" aria-hidden="true">
                        <div className="rw-action-dot" />
                      </div>
                      <div className="rw-action-body">
                        <span className="rw-action-task">{item.task}</span>
                        {(item.owner || item.due) && (
                          <span className="rw-action-meta">
                            {[item.owner, item.due].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="📋" title={t.actionItems} desc={lang === "de" ? "Noch keine Aufgaben aus dieser Aufnahme erfasst." : "No action items captured from this recording yet."} />
              )}
            </section>

          </div>
        )}

        {/* TRANSCRIPT */}
        {activeTab === "transcript" && (
          <div className="rw-transcript-view">
            <div className="rw-transcript-sync-notice" style={{ marginBottom: "16px", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(255,255,255,0.01)", fontSize: "12px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>ℹ️</span>
              <span>
                {lang === "de"
                  ? "Die Transkript-Synchronisation kann ohne zeitgestempelte Abschnitte nicht implementiert werden."
                  : "Transcript synchronization cannot be implemented correctly without timestamped transcript segments."}
              </span>
            </div>
            <div
              ref={transcriptRef}
              className="rw-transcript-body"
              tabIndex={0}
              aria-label="Full recording transcript"
            >
              {selected.transcript
                ? selected.transcript
                : <span className="rw-empty-state">{t.processingStatus}</span>}
            </div>
          </div>
        )}

        {/* MEMORY */}
        {activeTab === "memory" && (
          <div className="rw-memory-view">

            {/* Added to memory indicator */}
            <div className="rw-memory-status">
              <span className="rw-memory-pulse" aria-hidden="true" />
              <span className="rw-memory-status-label">{t.addedToMemory}</span>
            </div>

            {/* People */}
            {peopleTags.length > 0 && (
              <section className="rw-section">
                <h2 className="rw-section-label">{t.mentionedPeople}</h2>
                <div className="rw-entity-group">
                  {peopleTags.map((tag, i) => (
                    <span
                      key={i}
                      className="rw-entity rw-entity-people"
                      title={tag.context}
                      aria-label={`Person: ${tag.name}. ${tag.context}`}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {projectTags.length > 0 && (
              <section className="rw-section">
                <h2 className="rw-section-label">{t.mentionedProjects}</h2>
                <div className="rw-entity-group">
                  {projectTags.map((tag, i) => (
                    <span
                      key={i}
                      className="rw-entity rw-entity-project"
                      title={tag.context}
                      aria-label={`Project: ${tag.name}. ${tag.context}`}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Topics */}
            {topicTags.length > 0 && (
              <section className="rw-section">
                <h2 className="rw-section-label">{t.mentionedTopics}</h2>
                <div className="rw-entity-group">
                  {topicTags.map((tag, i) => (
                    <span
                      key={i}
                      className="rw-entity rw-entity-topic"
                      title={tag.context}
                      aria-label={`Topic: ${tag.name}. ${tag.context}`}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Related Recordings */}
            {relatedMeetings.length > 0 && (
              <section className="rw-section">
                <h2 className="rw-section-label">{t.relatedRecordings}</h2>
                <div className="rw-related-list">
                  {relatedMeetings.map((meet) => {
                    const matched = meetings.find((m) => m.id === meet.id);
                    return (
                      <button
                        key={meet.id}
                        className="rw-related-item"
                        onClick={() => { if (matched) onSetSelected(matched); }}
                        aria-label={`Open related recording: ${meet.title}`}
                        disabled={!matched}
                      >
                        <span className="rw-related-title">{meet.title}</span>
                        <span className="rw-related-count">{meet.shared_count}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Empty memory state */}
            {peopleTags.length === 0 &&
             projectTags.length === 0 &&
             topicTags.length === 0 &&
             relatedMeetings.length === 0 && (
              <EmptyState icon="🧠" title={lang === "de" ? "Wissensgedächtnis" : "Knowledge Memory"} desc={lang === "de" ? "Noch keine Entitäten oder ähnliche Aufnahmen aus dieser Aufnahme extrahiert." : "No entities or related recordings extracted from this recording yet."} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
