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

export const TYPE_META: Record<string, { label: string; tint: string; text: string; icon: string }> = {
  "Business Meeting": { label: "Business", tint: "bg-indigo-950/40 border border-indigo-500/20", text: "text-indigo-400", icon: "briefcase" },
  Meeting: { label: "Meeting", tint: "bg-indigo-950/40 border border-indigo-500/20", text: "text-indigo-400", icon: "briefcase" },
  Lecture: { label: "Lecture", tint: "bg-blue-950/40 border border-blue-500/20", text: "text-blue-400", icon: "graduation" },
  Interview: { label: "Interview", tint: "bg-emerald-950/40 border border-emerald-500/20", text: "text-emerald-400", icon: "mic" },
  "Personal Notes": { label: "Personal", tint: "bg-purple-950/40 border border-purple-500/20", text: "text-purple-400", icon: "note" },
  "Podcast / Discussion": { label: "Podcast", tint: "bg-pink-950/40 border border-pink-500/20", text: "text-pink-400", icon: "headphones" },
  Brainstorming: { label: "Brainstorming", tint: "bg-purple-950/40 border border-purple-500/20", text: "text-purple-400", icon: "brain" },
  Pitch: { label: "Pitch", tint: "bg-pink-950/40 border border-pink-500/20", text: "text-pink-400", icon: "presentation" },
  Unknown: { label: "Other", tint: "bg-slate-900/40 border border-border-subtle", text: "text-text-secondary", icon: "file" },
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

export function formatRelativeTime(dateStr: string | null, lang: Lang): string {
  if (!dateStr) return lang === "de" ? "Wird verarbeitet" : "Processing";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return lang === "de" ? "Gerade eben" : "Just now";
  }
  if (diffMins < 60) {
    return lang === "de" ? `vor ${diffMins} Min.` : `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return lang === "de" ? `vor ${diffHours} Std.` : `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return lang === "de" ? "Gestern" : "Yesterday";
  }
  if (diffDays < 7) {
    return lang === "de" ? `vor ${diffDays} Tagen` : `${diffDays}d ago`;
  }
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(date);
}
