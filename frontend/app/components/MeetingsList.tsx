"use client";

import { ArrowRight, FileText, Search, Video } from "lucide-react";
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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <header className="mb-6 animate-rise">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {mode === "search" ? t("Search", "Suche") : t("Meetings", "Aufnahmen")}
        </h1>
        <p className="mt-1 text-slate-500">
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
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
              <div className="h-10 w-10 animate-shimmer rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 animate-shimmer rounded" />
                <div className="h-2.5 w-1/3 animate-shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-12 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-500">
            {mode === "search" ? <Search className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </span>
          <p className="mt-4 font-semibold text-slate-900">
            {mode === "search" && q ? t("No matches found", "Keine Treffer") : t("No recordings yet", "Noch keine Aufnahmen")}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {mode === "search" && q
              ? t("Try a different search term.", "Versuchen Sie einen anderen Suchbegriff.")
              : t("Record or upload a meeting to get started.", "Nehmen Sie ein Meeting auf, um zu beginnen.")}
          </p>
          {!(mode === "search" && q) && (
            <button onClick={onUpload} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 transition-colors hover:bg-brand-700">
              <Video className="h-4 w-4" /> {t("New recording", "Neue Aufnahme")}
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
                className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-soft transition-colors hover:border-brand-200"
              >
                <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg ${meta.tint} ${meta.text}`}>
                  <FileText className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-brand-600">{m.title}</h3>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span>{formatDate(m.created_at, lang)}</span>
                    {m.status === "done" && <span className={`rounded px-1.5 py-0.5 font-medium ${meta.tint} ${meta.text}`}>{meta.label}</span>}
                    {(m.status === "transcribing" || m.status === "summarizing") && (
                      <span className="flex items-center gap-1 text-brand-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" style={{ animation: "pulseDot 1.4s ease-in-out infinite" }} />
                        {t("Processing", "Verarbeitung")}
                      </span>
                    )}
                    {m.status === "failed" && <span className="text-rose-500">{t("Failed", "Fehlgeschlagen")}</span>}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition-colors group-hover:text-brand-500" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
