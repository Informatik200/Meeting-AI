"use client";

import React, { RefObject } from "react";
import { Bot, CheckCircle2, ListChecks, Loader2, Mail, Send, Sparkles, X } from "lucide-react";
import type { ChatMessage, Lang, Meeting } from "../lib/types";

interface CopilotPanelProps {
  selected: Meeting | null;
  lang: Lang;
  userName: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  chatLoading: boolean;
  chatError: string;
  chatHistoryRef: RefObject<HTMLDivElement | null>;
  chatInputRef: RefObject<HTMLInputElement | null>;
  globalChatEnabled: boolean;
  emailGenerating: boolean;
  onSendMessage: (override?: string) => void;
  onChatInputChange: (v: string) => void;
  onGlobalToggle: (v: boolean) => void;
  onCreateEmail: () => void;
  onClose: () => void;
}

/** Minimal, safe markdown → React (bold, italic, code, lists, links). */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: string) => {
    if (list.length) {
      out.push(
        <ul key={key}>
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      list.push(trimmed.slice(2));
    } else {
      flush(`l${i}`);
      if (trimmed) out.push(<p key={i}>{inline(trimmed)}</p>);
    }
  });
  flush("lend");
  return out;
}

function inline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) tokens.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) tokens.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) tokens.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const lm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (lm)
        tokens.push(
          <a key={k++} href={lm[2]} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
            {lm[1]}
          </a>,
        );
    } else tokens.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return tokens;
}

export default function CopilotPanel(props: CopilotPanelProps) {
  const {
    selected,
    lang,
    userName,
    chatMessages,
    chatInput,
    chatLoading,
    chatError,
    chatHistoryRef,
    chatInputRef,
    globalChatEnabled,
    emailGenerating,
    onSendMessage,
    onChatInputChange,
    onGlobalToggle,
    onCreateEmail,
    onClose,
  } = props;
  const t = (en: string, de: string) => (lang === "de" ? de : en);
  const hasTranscript = !!selected?.transcript;

  const prompts: { label: string; icon: typeof Sparkles; action: () => void }[] = [
    { label: t("What are the key decisions?", "Welche Entscheidungen wurden getroffen?"), icon: CheckCircle2, action: () => onSendMessage(t("What are the key decisions?", "Welche Entscheidungen wurden getroffen?")) },
    { label: t("List all action items", "Alle Aufgaben auflisten"), icon: ListChecks, action: () => onSendMessage(t("List all action items", "Liste alle Aufgaben auf")) },
    { label: t("Summarize the discussion", "Diskussion zusammenfassen"), icon: Sparkles, action: () => onSendMessage(t("Summarize the main discussion", "Fasse die Hauptdiskussion zusammen")) },
    { label: t("Draft follow-up email", "Follow-up-E-Mail entwerfen"), icon: Mail, action: onCreateEmail },
  ];

  return (
    <aside className="flex h-full w-full flex-col bg-white" aria-label="AI Copilot panel">
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-100 px-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Sparkles className="h-4 w-4 text-brand-500" /> {t("AI Copilot", "KI-Copilot")}
        </h2>
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close AI panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={chatHistoryRef} className="flex-1 space-y-4 overflow-y-auto p-5" tabIndex={0} aria-label="AI conversation history">
        {/* Greeting */}
        <div className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-600">
            <Bot className="h-4 w-4" />
          </span>
          <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
            {hasTranscript
              ? t(`Hi ${userName}! Ask me anything about this meeting.`, `Hallo ${userName}! Frag mich alles zu diesem Meeting.`)
              : t("No transcript available to ask questions yet.", "Noch kein Transkript für Fragen verfügbar.")}
          </div>
        </div>

        {chatMessages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2.5 text-sm text-white">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2.5">
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-600">
                <Bot className="h-4 w-4" />
              </span>
              <div className="copilot-markdown max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
                {renderMarkdown(msg.text)}
              </div>
            </div>
          ),
        )}

        {chatLoading && (
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-600">
              <Bot className="h-4 w-4" />
            </span>
            <div className="flex gap-1 rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-3">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animation: `pulseDot 1.2s ${d * 0.2}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}

        {chatError && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">{chatError}</div>}
      </div>

      {/* Footer */}
      {hasTranscript && (
        <div className="flex-shrink-0 border-t border-slate-100 p-4">
          <label className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              checked={globalChatEnabled}
              onChange={(e) => onGlobalToggle(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            {t("Search across all recordings", "Alle Aufnahmen durchsuchen")}
          </label>

          {chatMessages.length === 0 && (
            <div className="mb-3 grid gap-2">
              {prompts.map((p) => (
                <button
                  key={p.label}
                  onClick={p.action}
                  disabled={chatLoading || (p.icon === Mail && emailGenerating)}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                >
                  {p.icon === Mail && emailGenerating ? (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-brand-500" />
                  ) : (
                    <p.icon className="h-4 w-4 flex-shrink-0 text-brand-500" />
                  )}
                  <span className="truncate">{p.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              placeholder={t("Ask anything...", "Fragen Sie etwas...")}
              disabled={chatLoading}
              onChange={(e) => onChatInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSendMessage();
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-12 text-sm transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              aria-label="Type message to AI"
            />
            <button
              onClick={() => onSendMessage()}
              disabled={chatLoading || !chatInput.trim()}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
