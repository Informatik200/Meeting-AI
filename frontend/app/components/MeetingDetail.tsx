"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Copy,
  Download,
  Lightbulb,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Sparkles,
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

function Card({ title, icon: Icon, action, children }: { title: string; icon: typeof Sparkles; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Icon className="h-[18px] w-[18px] text-brand-500" /> {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      {/* Breadcrumb */}
      <button onClick={onBack} className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> {t("Meetings", "Aufnahmen")}
        <span className="text-slate-300">/</span>
        <span className="truncate text-slate-900">{selected.title}</span>
      </button>

      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{selected.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {formatDate(selected.created_at, lang)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {new Date(selected.created_at ?? Date.now()).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite(selected.id)}
            className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
              isFav ? "border-amber-200 bg-amber-50 text-amber-500" : "border-slate-200 text-slate-400 hover:bg-slate-50"
            }`}
            aria-label={isFav ? "Remove from starred" : "Star recording"}
            aria-pressed={isFav}
          >
            <Star className={`h-[18px] w-[18px] ${isFav ? "fill-current" : ""}`} />
          </button>
          <a
            href={pdfHref}
            download={`meeting-${selected.id}.pdf`}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> {t("Export", "Export")}
          </a>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
              aria-label="Recording actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-44 rounded-xl border border-slate-100 bg-white p-1.5 shadow-soft-lg animate-rise">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onRename();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <Pencil className="h-[15px] w-[15px] text-slate-400" /> {t("Rename", "Umbenennen")}
                </button>
                <a
                  href={pdfHref}
                  download={`meeting-${selected.id}.pdf`}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <Download className="h-[15px] w-[15px] text-slate-400" /> {t("Export PDF", "PDF exportieren")}
                </a>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <Trash2 className="h-[15px] w-[15px]" /> {t("Delete", "Löschen")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-6 border-b border-slate-100">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`relative -mb-px flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
              tab === tb.key ? "text-brand-600" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {tb.label}
            {tb.count ? (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">{tb.count}</span>
            ) : null}
            {tab === tb.key && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-600" />}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Left rail: Details */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Details", "Details")}</h3>
            <div className="mb-3">
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${meta.tint} ${meta.text}`}>
                {meta.label}
              </span>
              {selected.confidence < 80 && <span className="ml-2 text-xs text-slate-400">{selected.confidence}%</span>}
            </div>
            {!isProcessing &&
              (isEditingType ? (
                <div className="space-y-2">
                  <select
                    value={newType}
                    onChange={(e) => onSetNewType(e.target.value)}
                    disabled={typeLoading}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    aria-label="Select recording type"
                  >
                    {TYPES.map((ty) => (
                      <option key={ty} value={ty}>
                        {TYPE_META[ty]?.label ?? ty}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={onOverrideType}
                      disabled={typeLoading}
                      className="flex-1 rounded-lg bg-brand-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {typeLoading ? t("Saving…", "Speichern…") : t("Save", "Speichern")}
                    </button>
                    <button
                      onClick={() => onSetIsEditingType(false)}
                      disabled={typeLoading}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
                    >
                      {t("Cancel", "Abbrechen")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onSetNewType(selected.recording_type);
                    onSetIsEditingType(true);
                  }}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  {t("Change type", "Typ ändern")}
                </button>
              ))}
          </div>

          {selected.audio_filename && selected.status === "done" && (
            <div className="lg:hidden">
              <AudioPlayer src={`${apiUrl}/meetings/${selected.id}/audio?token=${selected.media_token}`} ariaLabel="Play recording audio" />
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className="min-w-0 space-y-6">
          {selected.audio_filename && selected.status === "done" && (
            <div className="hidden lg:block">
              <AudioPlayer src={`${apiUrl}/meetings/${selected.id}/audio?token=${selected.media_token}`} ariaLabel="Play recording audio" />
            </div>
          )}

          {tab === "overview" && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Highlights */}
              <Card title={t("Highlights", "Highlights")} icon={Sparkles}>
                {selected.key_points.length ? (
                  <ul className="space-y-2.5">
                    {selected.key_points.map((k, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                        {k}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyMini text={t("No highlights captured yet.", "Noch keine Highlights erfasst.")} />
                )}
              </Card>

              {/* Summary */}
              <Card
                title={t("Summary", "Zusammenfassung")}
                icon={Sparkles}
                action={
                  selected.summary ? (
                    <button
                      onClick={onCopySummary}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand-600"
                    >
                      {copiedSummary ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedSummary ? t("Copied", "Kopiert") : t("Copy", "Kopieren")}
                    </button>
                  ) : undefined
                }
              >
                <p className="text-sm leading-relaxed text-slate-600">
                  {selected.status === "failed"
                    ? t("Processing failed. Please retry or contact support.", "Verarbeitung fehlgeschlagen. Bitte erneut versuchen.")
                    : selected.summary || t("This recording is still being processed.", "Diese Aufnahme wird noch verarbeitet.")}
                </p>
              </Card>

              {/* Tasks */}
              <Card title={t("Tasks", "Aufgaben")} icon={ListChecks}>
                {selected.action_items.length ? (
                  <div className="space-y-2.5">
                    {selected.action_items.map((a, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-2.5">
                        <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300" />
                        <div className="min-w-0 text-sm">
                          <p className="font-medium text-slate-800">{a.task}</p>
                          {(a.owner || a.due) && (
                            <p className="text-xs text-slate-400">{[a.owner, a.due].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyMini text={t("No action items captured yet.", "Noch keine Aufgaben erfasst.")} />
                )}
              </Card>

              {/* Decisions */}
              <Card title={t("Decisions", "Entscheidungen")} icon={Lightbulb}>
                {selected.decisions.length ? (
                  <ul className="space-y-2.5">
                    {selected.decisions.map((d, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                        {d}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyMini text={t("No decisions captured yet.", "Noch keine Entscheidungen erfasst.")} />
                )}
              </Card>
            </div>
          )}

          {tab === "transcript" && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
              <div
                ref={transcriptRef}
                className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700"
                tabIndex={0}
                aria-label="Full recording transcript"
              >
                {selected.transcript || (
                  <EmptyMini text={t("This recording is still being processed.", "Diese Aufnahme wird noch verarbeitet.")} />
                )}
              </div>
            </div>
          )}

          {tab === "memory" && (
            <div className="space-y-6">
              <MemorySection title={t("People", "Personen")} tags={peopleTags} color="bg-brand-50 text-brand-700" empty={t("No people extracted.", "Keine Personen extrahiert.")} />
              <MemorySection title={t("Projects", "Projekte")} tags={projectTags} color="bg-amber-50 text-amber-700" empty={t("No projects extracted.", "Keine Projekte extrahiert.")} />
              <MemorySection title={t("Topics", "Themen")} tags={topicTags} color="bg-purple-50 text-purple-700" empty={t("No topics extracted.", "Keine Themen extrahiert.")} />

              {relatedMeetings.length > 0 && (
                <Card title={t("Related recordings", "Ähnliche Aufnahmen")} icon={Sparkles}>
                  <div className="space-y-1">
                    {relatedMeetings.map((r) => {
                      const match = meetings.find((m) => m.id === r.id);
                      return (
                        <button
                          key={r.id}
                          onClick={() => match && onSetSelected(match)}
                          disabled={!match}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
                        >
                          <span className="truncate text-slate-700">{r.title}</span>
                          <span className="ml-2 flex-shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                            {r.shared_count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">{text}</div>
  );
}

function MemorySection({ title, tags, color, empty }: { title: string; tags: EntityTag[]; color: string; empty: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      {tags.length ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tg, i) => (
            <span key={i} title={tg.context} className={`rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
              {tg.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{empty}</p>
      )}
    </div>
  );
}
