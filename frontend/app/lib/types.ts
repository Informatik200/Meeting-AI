export type ActionItem = { task: string; owner: string | null; due: string | null };

export type Meeting = {
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

export type EntityTag = { name: string; context: string };
export type RelatedMeeting = { id: number; title: string; shared_count: number };
export type ChatMessage = { role: "user" | "assistant"; text: string };

export type Lang = "en" | "de";

/** Category → soft-tinted color set matching the Stitch "Spaces"/tag chips. */
export const TYPE_META: Record<string, { label: string; tint: string; text: string; icon: string }> = {
  "Business Meeting": { label: "Business", tint: "bg-brand-50", text: "text-brand-700", icon: "briefcase" },
  Lecture: { label: "Lecture", tint: "bg-blue-50", text: "text-blue-700", icon: "graduation" },
  Interview: { label: "Interview", tint: "bg-amber-50", text: "text-amber-700", icon: "mic" },
  "Personal Notes": { label: "Personal", tint: "bg-emerald-50", text: "text-emerald-700", icon: "note" },
  "Podcast / Discussion": { label: "Podcast", tint: "bg-pink-50", text: "text-pink-700", icon: "headphones" },
  Unknown: { label: "General", tint: "bg-slate-100", text: "text-slate-600", icon: "file" },
};

export function formatDate(value: string | null, lang: Lang): string {
  if (!value) return lang === "de" ? "Wird verarbeitet" : "Processing";
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatDateShort(value: string | null, lang: Lang): string {
  if (!value) return lang === "de" ? "—" : "—";
  return new Intl.DateTimeFormat(lang, { month: "short", day: "numeric" }).format(new Date(value));
}

export function initials(nameOrEmail: string): string {
  const parts = nameOrEmail.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}
