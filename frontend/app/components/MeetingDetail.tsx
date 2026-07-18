"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import { formatDate, type EntityTag, type Lang, type Meeting, type RelatedMeeting, TYPE_META } from "../lib/types";

type Tab = "overview" | "transcript" | "memory";
const TYPES = ["Business Meeting", "Lecture", "Interview", "Personal Notes", "Podcast / Discussion", "Unknown"];

interface MeetingDetailProps {
  selected: Meeting;
  meetings: Meeting[];
  lang: Lang;
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
  copiedSummary: boolean;
  onToggleFavorite: (id: number) => void;
  onSetSelected: (m: Meeting) => void;
  onSetNewType: (v: string) => void;
  onSetIsEditingType: (v: boolean) => void;
  onOverrideType: () => void;
  onCopySummary: () => void;
  onBack: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export default function MeetingDetail(props: MeetingDetailProps) {
  const {
    selected,
    meetings,
    lang,
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
    copiedSummary,
    onToggleFavorite,
    onSetSelected,
    onSetNewType,
    onSetIsEditingType,
    onOverrideType,
    onCopySummary,
    onBack,
    onRename,
    onDelete,
  } = props;

  const t = (en: string, de: string) => (lang === "de" ? de : en);
  const [tab, setTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setTab("overview"), [selected.id]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const meta = TYPE_META[selected.recording_type] ?? TYPE_META.Unknown;
  const isFav = favorites.includes(selected.id);
  const isProcessing = selected.status === "transcribing" || selected.status === "summarizing";
  const pdfHref = `${apiUrl}/meetings/${selected.id}/pdf?lang=${lang}&token=${selected.media_token}`;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: t("Overview", "Übersicht") },
    { key: "transcript", label: t("Transcript", "Transkript") },
    { key: "memory", label: t("Memory", "Gedächtnis"), count: peopleTags.length + projectTags.length + topicTags.length },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{t("Meetings", "Aufnahmen")}</span>
        <span className="text-border-strong">/</span>
        <span className="truncate text-text-secondary max-w-[200px]">{selected.title}</span>
      </button>

      {/* Large Meeting Title Row */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-6">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl leading-tight">
            {selected.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary font-mono">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-muted" />
              {formatDate(selected.created_at, lang)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-text-muted" />
              {new Date(selected.created_at ?? Date.now()).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}
            </span>

            <span className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.tint} ${meta.text}`}>
                {meta.label}
              </span>
              {selected.confidence < 80 && selected.confidence > 0 && (
                <span className="text-text-muted">({selected.confidence}% accuracy)</span>
              )}

              {!isProcessing && (
                isEditingType ? (
                  <div className="flex items-center gap-1">
                    <select
                      value={newType}
                      onChange={(e) => onSetNewType(e.target.value)}
                      disabled={typeLoading}
                      className="rounded border border-border-subtle bg-surface-card px-1.5 py-0.5 text-[10px] text-text-primary focus:border-accent-lime focus:outline-none"
                    >
                      {TYPES.map((ty) => (
                        <option key={ty} value={ty}>
                          {TYPE_META[ty]?.label ?? ty}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={onOverrideType}
                      disabled={typeLoading}
                      className="rounded bg-accent-lime px-1.5 py-0.5 text-[9px] font-semibold text-black cursor-pointer"
                    >
                      {typeLoading ? "..." : t("Save", "Save")}
                    </button>
                    <button
                      onClick={() => onSetIsEditingType(false)}
                      disabled={typeLoading}
                      className="text-[9px] text-text-muted hover:text-text-primary cursor-pointer ml-0.5"
                    >
                      {t("Cancel", "Cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onSetNewType(selected.recording_type);
                      onSetIsEditingType(true);
                    }}
                    className="text-[10px] text-text-muted hover:text-accent-lime cursor-pointer underline underline-offset-2"
                  >
                    {t("Change type", "Typ ändern")}
                  </button>
                )
              )}
            </span>
          </div>
        </div>

        {/* Action Panel Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onToggleFavorite(selected.id)}
            className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors cursor-pointer ${
              isFav ? "border-amber-500/20 bg-amber-500/10 text-amber-400" : "border-border-subtle text-text-muted hover:bg-elevated-hover hover:text-text-primary"
            }`}
            aria-label={isFav ? "Remove from starred" : "Star recording"}
            aria-pressed={isFav}
          >
            <Star className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
          </button>

          <a
            href={pdfHref}
            download={`meeting-${selected.id}.pdf`}
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t("Export", "Export")}</span>
          </a>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border-subtle text-text-muted hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Recording actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-44 rounded-xl border border-border-subtle bg-surface-card p-1.5 shadow-soft-lg animate-rise">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onRename();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5 text-text-muted" />
                  <span>{t("Rename", "Umbenennen")}</span>
                </button>
                <a
                  href={pdfHref}
                  download={`meeting-${selected.id}.pdf`}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-text-muted" />
                  <span>{t("Export PDF", "PDF exportieren")}</span>
                </a>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500/80" />
                  <span>{t("Delete", "Löschen")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audio Waveform as Hero */}
      {selected.audio_filename && selected.status === "done" && (
        <div className="w-full">
          <AudioPlayer src={`${apiUrl}/meetings/${selected.id}/audio?token=${selected.media_token}`} ariaLabel="Play recording audio" />
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex gap-6 border-b border-border-subtle">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`relative -mb-px flex items-center gap-2 pb-3 text-sm font-semibold transition-colors cursor-pointer ${
              tab === tb.key ? "text-accent-lime" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span>{tb.label}</span>
            {tb.count ? (
              <span className="rounded bg-border-subtle px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                {tb.count}
              </span>
            ) : null}
            {tab === tb.key && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent-lime shadow-glow" />}
          </button>
        ))}
      </div>

      {/* Tab Workspaces */}
      <div className="min-w-0 w-full pt-2">
        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="max-w-[720px] mx-auto space-y-8 pb-12">
            {/* Summary */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider text-accent-lime font-bold font-mono">
                  {t("Summary", "Zusammenfassung")}
                </h3>
                {selected.summary && (
                  <button
                    onClick={onCopySummary}
                    className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-lime transition-colors cursor-pointer"
                  >
                    {copiedSummary ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedSummary ? t("Copied", "Kopiert") : t("Copy", "Kopieren")}</span>
                  </button>
                )}
              </div>
              <p className="text-base leading-relaxed text-text-primary">
                {selected.status === "failed"
                  ? t("Processing failed. Please retry or contact support.", "Verarbeitung fehlgeschlagen. Bitte erneut versuchen.")
                  : selected.summary || t("This recording is still being processed.", "Diese Aufnahme wird noch verarbeitet.")}
              </p>
            </section>

            {/* Highlights / Main Points */}
            <section className="space-y-2.5">
              <h3 className="text-xs uppercase tracking-wider text-accent-lime font-bold font-mono">
                {t("Main Points & Highlights", "Wichtige Punkte & Highlights")}
              </h3>
              {selected.key_points && selected.key_points.length > 0 ? (
                <ul className="space-y-2">
                  {selected.key_points.map((k, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-lime" />
                      <span className="leading-relaxed">{k}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyMini text={t("No key points captured yet.", "Noch keine wichtigen Punkte erfasst.")} />
              )}
            </section>

            {/* Action Items (Tasks) */}
            <section className="space-y-2.5">
              <h3 className="text-xs uppercase tracking-wider text-accent-lime font-bold font-mono">
                {t("Action Items", "Aufgaben")}
              </h3>
              {selected.action_items && selected.action_items.length > 0 ? (
                <ul className="space-y-2">
                  {selected.action_items.map((a, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-card p-3.5 text-sm">
                      <span className="mt-0.5 h-4 w-4 rounded border border-border-strong flex items-center justify-center text-[9px] font-bold text-accent-lime font-mono">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-semibold text-text-primary leading-snug">{a.task}</p>
                        {(a.owner || a.due) && (
                          <p className="text-xs text-text-muted font-mono">{[a.owner, a.due].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyMini text={t("No action items captured yet.", "Noch keine Aufgaben erfasst.")} />
              )}
            </section>

            {/* Decisions */}
            <section className="space-y-2.5">
              <h3 className="text-xs uppercase tracking-wider text-accent-lime font-bold font-mono">
                {t("Decisions", "Entscheidungen")}
              </h3>
              {selected.decisions && selected.decisions.length > 0 ? (
                <ul className="space-y-2">
                  {selected.decisions.map((d, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                      <span className="leading-relaxed">{d}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyMini text={t("No decisions captured yet.", "Noch keine Entscheidungen erfasst.")} />
              )}
            </section>
          </div>
        )}

        {/* TRANSCRIPT TAB */}
        {tab === "transcript" && (
          <div className="max-w-[720px] mx-auto pb-12">
            <div
              ref={transcriptRef}
              className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-text-primary pr-2"
              tabIndex={0}
              aria-label="Full recording transcript"
            >
              {selected.transcript || (
                <EmptyMini text={t("This recording is still being processed.", "Diese Aufnahme wird noch verarbeitet.")} />
              )}
            </div>
          </div>
        )}

        {/* MEMORY TAB */}
        {tab === "memory" && (
          <div className="max-w-[720px] mx-auto space-y-6 pb-12">
            <MemorySection title={t("People", "Personen")} tags={peopleTags} color="bg-emerald-950/20 text-emerald-400 border border-emerald-500/20" empty={t("No people extracted.", "Keine Personen extrahiert.")} />
            <MemorySection title={t("Projects", "Projekte")} tags={projectTags} color="bg-amber-950/20 text-amber-400 border border-amber-500/20" empty={t("No projects extracted.", "Keine Projekte extrahiert.")} />
            <MemorySection title={t("Topics", "Themen")} tags={topicTags} color="bg-purple-950/20 text-purple-400 border border-purple-500/20" empty={t("No topics extracted.", "Keine Themen extrahiert.")} />

            {relatedMeetings.length > 0 && (
              <div className="rounded-xl border border-border-subtle bg-surface-card p-5 space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-text-muted font-bold">{t("Related recordings", "Ähnliche Aufnahmen")}</h3>
                <div className="space-y-1 divide-y divide-border-subtle">
                  {relatedMeetings.map((r) => {
                    const match = meetings.find((m) => m.id === r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => match && onSetSelected(match)}
                        disabled={!match}
                        className="flex w-full items-center justify-between py-2.5 text-left text-sm text-text-secondary hover:text-accent-lime transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <span className="truncate">{r.title}</span>
                        <span className="ml-2 flex-shrink-0 rounded-full bg-border-subtle px-2 py-0.5 text-xs font-semibold text-text-muted">
                          {r.shared_count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle px-4 py-6 text-center text-xs text-text-muted">{text}</div>
  );
}

function MemorySection({ title, tags, color, empty }: { title: string; tags: EntityTag[]; color: string; empty: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">{title}</h3>
      {tags.length ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tg, i) => (
            <span key={i} title={tg.context} className={`rounded-full px-2.5 py-1 text-xs font-semibold font-mono ${color}`}>
              {tg.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-muted">{empty}</p>
      )}
    </div>
  );
}
