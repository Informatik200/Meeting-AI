"use client";

import { ArrowRight, FileText, Mic, Search } from "lucide-react";
import { formatDate, type Lang, type Meeting, TYPE_META } from "../lib/types";

interface MeetingsListProps {
  lang: Lang;
  mode: "meetings" | "search";
  meetings: Meeting[];
  loading: boolean;
  query: string;
  onSelectMeeting: (m: Meeting) => void;
  onUpload: () => void;
}

export default function MeetingsList({ lang, mode, meetings, loading, query, onSelectMeeting, onUpload }: MeetingsListProps) {
  const t = (en: string, de: string) => (lang === "de" ? de : en);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? meetings.filter((m) => m.title.toLowerCase().includes(q) || (m.transcript ?? "").toLowerCase().includes(q))
    : meetings;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 text-text-primary animate-rise">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {mode === "search" ? t("Search", "Suche") : t("Meetings", "Aufnahmen")}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {mode === "search"
            ? q
              ? t(`${filtered.length} result${filtered.length === 1 ? "" : "s"} for "${query}"`, `${filtered.length} Ergebnis${filtered.length === 1 ? "" : "se"} für „${query}“`)
              : t("Search across your recordings by title or transcript.", "Durchsuchen Sie Aufnahmen nach Titel oder Transkript.")
            : t(`${meetings.length} recording${meetings.length === 1 ? "" : "s"}`, `${meetings.length} Aufnahme${meetings.length === 1 ? "" : "n"}`)}
        </p>
      </header>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-card p-4 shadow-soft">
              <div className="h-10 w-10 animate-shimmer rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 animate-shimmer rounded" />
                <div className="h-2.5 w-1/3 animate-shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface-card/40 p-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-border-subtle text-text-muted">
            {mode === "search" ? <Search className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </span>
          <p className="mt-4 text-sm font-semibold text-text-primary">
            {mode === "search" && q ? t("No matches found", "Keine Treffer") : t("No recordings yet", "Noch keine Aufnahmen")}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {mode === "search" && q
              ? t("Try a different search term.", "Versuchen Sie einen anderen Suchbegriff.")
              : t("Record or upload a meeting to get started.", "Nehmen Sie ein Meeting auf, um zu beginnen.")}
          </p>
          {!(mode === "search" && q) && (
            <button onClick={onUpload} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-lime px-4 py-2 text-xs font-semibold text-black hover:bg-opacity-95 transition-colors cursor-pointer shadow-glow">
              <Mic className="h-3.5 w-3.5" /> <span>{t("New recording", "Neue Aufnahme")}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => {
            const meta = TYPE_META[m.recording_type] ?? TYPE_META.Unknown;
            return (
              <button
                key={m.id}
                onClick={() => onSelectMeeting(m)}
                className="group flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-card p-4 text-left shadow-soft transition-all hover:border-accent-lime cursor-pointer"
              >
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-border-subtle text-text-secondary group-hover:text-accent-lime transition-colors">
                  <FileText className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-text-primary group-hover:text-accent-lime transition-colors">{m.title}</h3>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-muted font-mono">
                    <span>{formatDate(m.created_at, lang)}</span>
                    {m.status === "done" && <span className={`rounded bg-border-subtle px-1.5 py-0.5 font-semibold ${meta.tint} ${meta.text}`}>{meta.label}</span>}
                    {(m.status === "transcribing" || m.status === "summarizing") && (
                      <span className="flex items-center gap-1 text-accent-lime">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-lime animate-pulse" />
                        {t("Processing", "Verarbeitung")}
                      </span>
                    )}
                    {m.status === "failed" && <span className="text-rose-400">{t("Failed", "Fehlgeschlagen")}</span>}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-text-muted group-hover:text-accent-lime transition-colors" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
