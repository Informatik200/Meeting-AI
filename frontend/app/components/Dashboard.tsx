"use client";

import {
  ArrowRight,
  CheckSquare,
  CloudUpload,
  FileText,
  Lightbulb,
  Play,
  Radio,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import type { AuthUser } from "../lib/auth";
import { formatDate, type Lang, type Meeting, TYPE_META } from "../lib/types";

interface DashboardProps {
  user: AuthUser;
  lang: Lang;
  meetings: Meeting[];
  loading: boolean;
  onSelectMeeting: (m: Meeting) => void;
  onUpload: () => void;
}

function greeting(lang: Lang): string {
  const h = new Date().getHours();
  if (lang === "de") return h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function StatCard({
  value,
  label,
  sub,
  icon: Icon,
  tint,
  iconColor,
  hoverBorder,
}: {
  value: number;
  label: string;
  sub: string;
  icon: typeof Video;
  tint: string;
  iconColor: string;
  hoverBorder: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition-colors ${hoverBorder}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl font-bold tracking-tight text-slate-900">{value}</span>
        <span className={`grid h-10 w-10 place-items-center rounded-full ${tint} ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{label}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function AvatarStack({ n }: { n: number }) {
  const dots = Math.min(n, 3);
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className="h-6 w-6 rounded-full border-2 border-white bg-gradient-to-br from-brand-200 to-purple-200"
        />
      ))}
      {n > 3 && (
        <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-500">
          +{n - 3}
        </span>
      )}
    </div>
  );
}

export default function Dashboard({ user, lang, meetings, loading, onSelectMeeting, onUpload }: DashboardProps) {
  const t = (en: string, de: string) => (lang === "de" ? de : en);
  const name = (user.name || user.email.split("@")[0]).split(" ")[0];

  const done = meetings.filter((m) => m.status === "done");
  const processing = meetings.filter((m) => m.status === "transcribing" || m.status === "summarizing");
  const totalActions = meetings.reduce((n, m) => n + (m.action_items?.length ?? 0), 0);
  const totalDecisions = meetings.reduce((n, m) => n + (m.decisions?.length ?? 0), 0);
  const resume = done[0];
  const recent = meetings.slice(0, 5);

  const insight = (() => {
    if (done.length === 0) return null;
    const decided = done.filter((m) => (m.decisions?.length ?? 0) > 0).length;
    return t(
      `${done.length} recording${done.length === 1 ? "" : "s"} indexed. ${totalDecisions} decision${
        totalDecisions === 1 ? "" : "s"
      } captured across ${decided} meeting${decided === 1 ? "" : "s"}.`,
      `${done.length} Aufnahme${done.length === 1 ? "" : "n"} indiziert. ${totalDecisions} Entscheidung${
        totalDecisions === 1 ? "" : "en"
      } in ${decided} Meeting${decided === 1 ? "" : "s"}.`,
    );
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      {/* Greeting */}
      <header className="animate-rise">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {greeting(lang)}, {name} <span className="inline-block">👋</span>
        </h1>
        <p className="mt-1 text-slate-500">
          {t(
            `You have ${meetings.length} recording${meetings.length === 1 ? "" : "s"} and ${totalActions} action item${
              totalActions === 1 ? "" : "s"
            }.`,
            `Sie haben ${meetings.length} Aufnahme${meetings.length === 1 ? "" : "n"} und ${totalActions} Aufgabe${
              totalActions === 1 ? "" : "n"
            }.`,
          )}
        </p>
      </header>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          value={meetings.length}
          label={t("Meetings", "Aufnahmen")}
          sub={t("All time", "Gesamt")}
          icon={TrendingUp}
          tint="bg-brand-50"
          iconColor="text-brand-600"
          hoverBorder="hover:border-brand-200"
        />
        <StatCard
          value={totalActions}
          label={t("Action Items", "Aufgaben")}
          sub={t("Across meetings", "Alle Meetings")}
          icon={CheckSquare}
          tint="bg-emerald-50"
          iconColor="text-emerald-600"
          hoverBorder="hover:border-emerald-200"
        />
        <StatCard
          value={totalDecisions}
          label={t("Decisions", "Entscheidungen")}
          sub={t("Captured", "Erfasst")}
          icon={Lightbulb}
          tint="bg-amber-50"
          iconColor="text-amber-600"
          hoverBorder="hover:border-amber-200"
        />
        <StatCard
          value={processing.length}
          label={t("Recordings", "In Arbeit")}
          sub={t("Processing", "Wird verarbeitet")}
          icon={Radio}
          tint="bg-pink-50"
          iconColor="text-pink-600"
          hoverBorder="hover:border-pink-200"
        />
      </div>

      {/* Continue + Insight */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="min-w-0 lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-slate-900">{t("Continue where you left off", "Weitermachen")}</h2>
          {resume ? (
            <button
              onClick={() => onSelectMeeting(resume)}
              className="group flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-soft transition-colors hover:border-brand-200 sm:gap-5 sm:p-6"
            >
              <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 text-white sm:h-16 sm:w-20">
                <FileText className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold text-slate-900 group-hover:text-brand-600">
                  {resume.title}
                </h3>
                <p className="mt-0.5 text-sm text-slate-400">{formatDate(resume.created_at, lang)}</p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-brand-500 to-purple-500" />
                </div>
              </div>
              <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-brand-500 text-white shadow-md shadow-brand-500/30 transition-transform group-hover:scale-105 group-hover:bg-brand-600">
                <Play className="h-5 w-5 translate-x-0.5 fill-current" />
              </span>
            </button>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-8 text-center">
              <p className="text-sm text-slate-400">
                {t("Nothing to resume yet — record or upload your first meeting.", "Noch nichts — nehmen Sie Ihr erstes Meeting auf.")}
              </p>
            </div>
          )}
        </section>

        <section className="min-w-0">
          <h2 className="mb-3 text-lg font-bold text-slate-900">{t("Insights", "Erkenntnisse")}</h2>
          <div className="relative h-[132px] overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-purple-50 p-6 shadow-soft">
            <Sparkles className="absolute right-4 top-4 h-5 w-5 text-brand-300" />
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-800">
              <Sparkles className="h-4 w-4 text-brand-500" /> {t("AI Insight", "KI-Erkenntnis")}
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              {insight ?? t("Your insights appear here once meetings are processed.", "Ihre Erkenntnisse erscheinen hier, sobald Meetings verarbeitet wurden.")}
            </p>
            <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-brand-200/30 blur-2xl" />
          </div>
        </section>
      </div>

      {/* Recent meetings */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{t("Recent Meetings", "Letzte Aufnahmen")}</h2>
        </div>

        {loading ? (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-slate-50 p-4 last:border-0">
                <div className="h-10 w-10 animate-shimmer rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 animate-shimmer rounded" />
                  <div className="h-2.5 w-1/5 animate-shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-500">
              <Video className="h-6 w-6" />
            </span>
            <p className="mt-3 font-semibold text-slate-900">{t("No recordings yet", "Noch keine Aufnahmen")}</p>
            <p className="mt-1 text-sm text-slate-400">
              {t("Record or upload a meeting to see it here.", "Nehmen Sie ein Meeting auf, um es hier zu sehen.")}
            </p>
            <button
              onClick={onUpload}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 transition-colors hover:bg-brand-700"
            >
              <CloudUpload className="h-4 w-4" /> {t("Upload a recording", "Aufnahme hochladen")}
            </button>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
            {recent.map((m) => {
              const meta = TYPE_META[m.recording_type] ?? TYPE_META.Unknown;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => onSelectMeeting(m)}
                    className="group flex w-full items-center gap-4 border-b border-slate-50 p-4 text-left transition-colors last:border-0 hover:bg-slate-50"
                  >
                    <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg ${meta.tint} ${meta.text}`}>
                      <FileText className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold text-slate-900 group-hover:text-brand-600">{m.title}</h4>
                      <p className="text-xs text-slate-400">{formatDate(m.created_at, lang)}</p>
                    </div>
                    {(m.status === "transcribing" || m.status === "summarizing") && (
                      <span className="hidden items-center gap-1.5 text-xs font-medium text-brand-600 sm:flex">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" style={{ animation: "pulseDot 1.4s ease-in-out infinite" }} />
                        {t("Processing", "Verarbeitung")}
                      </span>
                    )}
                    {m.status === "failed" && (
                      <span className="hidden text-xs font-medium text-rose-500 sm:block">{t("Failed", "Fehlgeschlagen")}</span>
                    )}
                    {m.status === "done" && (
                      <>
                        <span className={`hidden rounded-md px-2 py-0.5 text-xs font-medium sm:block ${meta.tint} ${meta.text}`}>
                          {meta.label}
                        </span>
                        <AvatarStack n={(m.key_points?.length ?? 0) + 1} />
                      </>
                    )}
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition-colors group-hover:text-brand-500" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
