"use client";

import React, { RefObject, useState } from "react";
import {
  Bot,
  Sparkles,
  X,
  Send,
  FileText,
  Mail,
  Download,
  Copy,
  BookOpen,
  Calendar,
  Languages,
  Layers,
  Check,
} from "lucide-react";
import type { ChatMessage, Lang, Meeting } from "../lib/types";
import { API_URL } from "../lib/auth";

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

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: string) => {
    if (list.length) {
      out.push(
        <ul key={key} className="list-disc pl-4 space-y-1 my-2">
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
      if (trimmed) out.push(<p key={i} className="my-1.5 leading-relaxed">{inline(trimmed)}</p>);
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
    if (tok.startsWith("**")) tokens.push(<strong key={k++} className="font-bold text-text-primary">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) tokens.push(<code key={k++} className="px-1.5 py-0.5 rounded bg-bg-base text-accent-lime font-mono text-xs">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const lm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (lm)
        tokens.push(
          <a key={k++} href={lm[2]} target="_blank" rel="noopener noreferrer" className="text-accent-lime underline">
            {lm[1]}
          </a>,
        );
    } else tokens.push(<em key={k++} className="italic text-text-secondary">{tok.slice(1, -1)}</em>);
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
  const [copied, setCopied] = useState(false);

  const hasSelected = !!selected;

  const handleCopySummary = () => {
    if (!selected || !selected.summary) return;
    void navigator.clipboard.writeText(selected.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    if (!selected) return;
    const pdfHref = `${API_URL}/meetings/${selected.id}/pdf?lang=${lang}&token=${selected.media_token}`;
    window.open(pdfHref, "_blank");
  };

  const actions = [
    {
      label: t("Summarize", "Zusammenfassen"),
      icon: FileText,
      disabled: !hasSelected,
      onClick: () => onSendMessage(t("Summarize the main discussion and key insights", "Fasse die Hauptdiskussion und wichtigsten Erkenntnisse zusammen")),
    },
    {
      label: t("Draft Email", "E-Mail entwerfen"),
      icon: Mail,
      disabled: !hasSelected || emailGenerating,
      onClick: onCreateEmail,
    },
    {
      label: t("Export PDF", "PDF exportieren"),
      icon: Download,
      disabled: !hasSelected,
      onClick: handleExportPDF,
    },
    {
      label: copied ? t("Copied!", "Kopiert!") : t("Copy Summary", "Zusammenf. kopieren"),
      icon: copied ? Check : Copy,
      disabled: !hasSelected || !selected?.summary,
      onClick: handleCopySummary,
    },
    {
      label: t("Study Notes", "Lernnotizen"),
      icon: BookOpen,
      disabled: !hasSelected,
      onClick: () => onSendMessage(t("Generate detailed study notes for this meeting", "Erstelle detaillierte Lernnotizen zu diesem Meeting")),
    },
    {
      label: t("Meeting Minutes", "Protokoll"),
      icon: Calendar,
      disabled: !hasSelected,
      onClick: () => onSendMessage(t("Generate structured meeting minutes", "Erstelle ein strukturiertes Meeting-Protokoll")),
    },
    {
      label: t("Translate", "Übersetzen"),
      icon: Languages,
      disabled: !hasSelected,
      onClick: () => onSendMessage(t("Translate the key insights from this meeting", "Übersetze die wichtigsten Erkenntnisse dieses Meetings")),
    },
    {
      label: t("Flashcards", "Karteikarten"),
      icon: Layers,
      disabled: !hasSelected,
      onClick: () => onSendMessage(t("Generate interactive flashcards from this meeting", "Erstelle interaktive Karteikarten aus diesem Meeting")),
    },
  ];

  return (
    <aside className="flex h-full w-full flex-col bg-surface-card border-l border-border-subtle text-text-primary" aria-label="Orivon AI panel">
      {/* Panel Header */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border-subtle px-5">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-text-primary">
          <Sparkles className="h-4 w-4 text-accent-lime" />
          <span>{t("Orivon AI", "Orivon AI")}</span>
        </h2>
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Close AI panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick AI Actions Section */}
      <div className="flex-shrink-0 p-4 border-b border-border-subtle space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted px-1">
          {t("Quick AI Actions", "Schnelle KI-Aktionen")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((act, i) => (
            <button
              key={i}
              onClick={act.onClick}
              disabled={act.disabled}
              className={`flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-card px-2.5 py-2 text-left text-xs font-semibold text-text-secondary transition-colors cursor-pointer hover:border-accent-lime hover:text-text-primary hover:bg-elevated-hover disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <act.icon className="h-3.5 w-3.5 text-accent-lime flex-shrink-0" />
              <span className="truncate">{act.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Timeline */}
      <div ref={chatHistoryRef} className="flex-1 space-y-4 overflow-y-auto p-5" tabIndex={0} aria-label="AI conversation history">
        {/* Welcome message */}
        <div className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-border-subtle text-accent-lime">
            <Bot className="h-4 w-4" />
          </span>
          <div className="rounded-xl bg-elevated-hover px-3.5 py-2.5 text-xs text-text-secondary leading-relaxed border border-border-subtle">
            {hasSelected
              ? t(`Hi ${userName}! Ask me anything about "${selected.title}".`, `Hallo ${userName}! Frag mich alles zu "${selected.title}".`)
              : t("Ask Orivon anything. I can search across all your meeting logs.", "Frag Orivon etwas. Ich kann alle Ihre Meetings durchsuchen.")}
          </div>
        </div>

        {chatMessages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-xl bg-accent-lime px-3.5 py-2.5 text-xs font-semibold text-black">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2.5">
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-border-subtle text-accent-lime">
                <Bot className="h-4 w-4" />
              </span>
              <div className="copilot-markdown max-w-[85%] rounded-xl bg-elevated-hover px-3.5 py-2.5 text-xs text-text-secondary border border-border-subtle">
                {renderMarkdown(msg.text)}
              </div>
            </div>
          ),
        )}

        {chatLoading && (
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-border-subtle text-accent-lime">
              <Bot className="h-4 w-4" />
            </span>
            <div className="flex gap-1 rounded-xl bg-elevated-hover px-4 py-3 border border-border-subtle">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 rounded-full bg-text-muted" style={{ animation: `pulseDot 1.2s ${d * 0.2}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}

        {chatError && <div className="rounded-lg bg-rose-950/20 border border-rose-500/20 px-3 py-2 text-xs text-rose-400" role="alert">{chatError}</div>}
      </div>

      {/* Persistent Chat Input */}
      <div className="flex-shrink-0 border-t border-border-subtle p-4 bg-surface-card space-y-2">
        <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted select-none">
          <input
            type="checkbox"
            checked={globalChatEnabled || !hasSelected}
            disabled={!hasSelected}
            onChange={(e) => onGlobalToggle(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border-subtle bg-bg-base text-accent-lime focus:ring-accent-lime"
          />
          {t("Search across all recordings", "Alle Aufnahmen durchsuchen")}
        </label>

        <div className="relative">
          <input
            ref={chatInputRef}
            type="text"
            value={chatInput}
            placeholder={hasSelected ? t("Ask Orivon...", "Orivon fragen...") : t("Ask about all meetings...", "Alle Meetings durchsuchen...")}
            disabled={chatLoading}
            onChange={(e) => onChatInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSendMessage();
            }}
            className="w-full rounded-xl border border-border-subtle bg-bg-base py-3 pl-4 pr-12 text-xs text-text-primary transition-all placeholder:text-text-muted focus:border-accent-lime focus:outline-none focus:ring-1 focus:ring-accent-lime"
            aria-label="Type message to AI"
          />
          <button
            onClick={() => onSendMessage()}
            disabled={chatLoading || !chatInput.trim()}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-accent-lime text-black hover:bg-opacity-95 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
