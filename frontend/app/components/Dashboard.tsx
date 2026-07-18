"use client";

import {
  ArrowRight,
  FileText,
  Mic,
  Play,
} from "lucide-react";
import type { Lang, Meeting } from "../lib/types";
import { formatRelativeTime, TYPE_META } from "../lib/types";
import type { AuthUser } from "../lib/auth";

interface DashboardProps {
  user: AuthUser;
  lang: Lang;
  meetings: Meeting[];
  loading: boolean;
  onSelectMeeting: (m: Meeting) => void;
  onUpload: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: () => void;
  onQuickRecord?: () => void;
}

export default function Dashboard({
  user,
  lang,
  meetings,
  loading,
  onSelectMeeting,
  onUpload,
  onQuickRecord,
}: DashboardProps) {
  const t = (en: string, de: string) => (lang === "de" ? de : en);

  const name = user.name || user.email.split("@")[0];
  const recent = meetings.slice(0, 5);
  const resume = meetings.find((m) => m.status === "done");

  const greeting = (ln: Lang) => {
    const hr = new Date().getHours();
    if (hr < 12) return ln === "de" ? "Guten Morgen" : "Good morning";
    if (hr < 18) return ln === "de" ? "Guten Tag" : "Good afternoon";
    return ln === "de" ? "Guten Abend" : "Good evening";
  };

  const formatDate = (dateStr: string, ln: Lang) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(ln === "de" ? "de-DE" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8 space-y-12">
      {/* Centered Hero Greeting */}
      <header className="text-center animate-rise">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
          {greeting(lang)}, {name} <span className="inline-block">👋</span>
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {t("Your premium AI meeting workspace. Speed is our biggest feature.", "Ihr Premium-KI-Meeting-Workspace. Geschwindigkeit ist unser wichtigstes Feature.")}
        </p>
        <div className="mt-6 flex justify-center">
          <button
            onClick={onQuickRecord}
            className="flex items-center gap-2 rounded-xl bg-accent-lime px-6 py-3 text-sm font-semibold text-black hover:bg-opacity-95 transition-all hover:scale-105 shadow-glow cursor-pointer"
          >
            <Mic className="h-4.5 w-4.5 text-black" />
            <span>{t("Start recording", "Meeting aufnehmen")}</span>
          </button>
        </div>
      </header>

      {/* Main Single Column Layout */}
      <div className="mx-auto max-w-[720px] space-y-8">
        {/* Continue where you left off */}
        <section className="space-y-2.5">
          <h2 className="text-xs uppercase tracking-wider text-text-muted font-bold">
            {t("Continue where you left off", "Weitermachen")}
          </h2>
          {resume ? (
            <button
              onClick={() => onSelectMeeting(resume)}
              className="group flex w-full items-center gap-4 rounded-xl border border-border-subtle bg-surface-card p-4 text-left transition-colors hover:border-accent-lime cursor-pointer"
            >
              <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg bg-border-subtle text-text-primary">
                <FileText className="h-5 w-5 text-accent-lime" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-text-primary group-hover:text-accent-lime transition-colors">
                  {resume.title}
                </h3>
                <p className="mt-0.5 text-xs text-text-secondary">{formatDate(resume.created_at || "", lang)}</p>
              </div>
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-accent-lime text-black shadow-glow transition-transform group-hover:scale-105">
                <Play className="h-3.5 w-3.5 translate-x-0.5 fill-current" />
              </span>
            </button>
          ) : (
            <div className="rounded-xl border border-dashed border-border-subtle bg-surface-card/40 p-6 text-center text-sm text-text-muted">
              {t("Nothing to resume yet — record or upload your first meeting.", "Noch nichts zu tun — nehmen Sie Ihr erstes Meeting auf.")}
            </div>
          )}
        </section>

        {/* Recent Meetings list */}
        <section className="space-y-2.5">
          <h2 className="text-xs uppercase tracking-wider text-text-muted font-bold">
            {t("Recent Meetings", "Letzte Meetings")}
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 border border-border-subtle rounded-xl p-4 bg-surface-card animate-pulse">
                  <div className="h-10 w-10 bg-border-strong rounded-lg animate-shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/3 bg-border-strong rounded animate-shimmer" />
                    <div className="h-2.5 w-1/5 bg-border-strong rounded animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-subtle bg-surface-card/40 p-10 text-center">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-border-subtle text-text-muted">
                <Mic className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-text-primary">{t("No recordings yet", "Noch keine Aufnahmen")}</p>
              <button
                onClick={onUpload}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent-lime px-4 py-2 text-xs font-semibold text-black hover:bg-opacity-95 transition-colors cursor-pointer"
              >
                <Mic className="h-3.5 w-3.5" />
                <span>{t("Upload recording", "Aufnahme hochladen")}</span>
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
              <ul className="divide-y divide-border-subtle">
                {recent.map((m) => {
                  const meta = TYPE_META[m.recording_type] ?? TYPE_META.Unknown;
                  const isProcessing = m.status === "transcribing" || m.status === "summarizing";
                  return (
                    <li key={m.id}>
                      <button
                        onClick={() => onSelectMeeting(m)}
                        className="group flex w-full items-center gap-4 p-4 text-left hover:bg-elevated-hover transition-colors cursor-pointer"
                      >
                        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-border-subtle text-text-secondary group-hover:text-accent-lime transition-colors">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-semibold text-text-primary group-hover:text-accent-lime transition-colors">
                            {m.title}
                          </h4>
                          <p className="text-xs text-text-muted mt-0.5">{formatRelativeTime(m.created_at, lang)}</p>
                        </div>
                        {isProcessing && (
                          <span className="flex items-center gap-1 text-xs font-medium text-accent-lime">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent-lime animate-pulse" />
                            {t("Processing", "Verarbeitung")}
                          </span>
                        )}
                        {!isProcessing && (
                          <span className="hidden rounded bg-border-subtle px-2 py-0.5 text-[10px] font-medium text-text-secondary sm:block">
                            {meta.label}
                          </span>
                        )}
                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-text-muted group-hover:text-accent-lime transition-colors" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
