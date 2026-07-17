"use client";

import React, { RefObject } from "react";

type Translations = {
  chatHeader: string;
  createEmail: string;
  copySummary: string;
  copied: string;
  exportPdf: string;
  flashcards: string;
  quiz: string;
  studyGuide: string;
  processingMeeting: string;
  chatPlaceholder: string;
  chatSend: string;
  chatNoTranscript: string;
  searchScopeGlobal: string;
  chatChipDecisions: string;
  chatChipActions: string;
  chatChipTopics: string;
  chatChipWho: string;
  chatChipDeadlines: string;
  chatError: string;
  comingSoon: string;
};

type Meeting = {
  id: number;
  transcript: string | null;
  summary: string | null;
  media_token: string;
};

interface AIPanelProps {
  selected: Meeting | null;
  lang: string;
  t: Translations;
  chatMessages: { role: "user" | "assistant"; text: string }[];
  chatInput: string;
  chatLoading: boolean;
  chatError: string;
  chatHistoryRef: RefObject<HTMLDivElement | null>;
  chatInputRef: RefObject<HTMLInputElement | null>;
  globalChatEnabled: boolean;
  emailGenerating: boolean;
  copiedSummary: boolean;
  apiUrl: string;
  onSendMessage: (override?: string) => void;
  onChatInputChange: (v: string) => void;
  onGlobalToggle: (v: boolean) => void;
  onCreateEmail: () => void;
  onCopySummary: () => void;
  onClose: () => void;
}

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // 1. Link parsing: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      tokens.push(
        <a key={key++} href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", textDecoration: "underline" }}>
          {linkText}
        </a>
      );
      remaining = remaining.substring(linkMatch[0].length);
      continue;
    }

    // 2. Bold (**text**)
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      tokens.push(<strong key={key++} style={{ fontWeight: 600 }}>{boldMatch[1]}</strong>);
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    // 3. Italic (*text*)
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      tokens.push(<em key={key++} style={{ fontStyle: "italic" }}>{italicMatch[1]}</em>);
      remaining = remaining.substring(italicMatch[0].length);
      continue;
    }

    // 4. Inline code (`code`)
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code key={key++} style={{
          backgroundColor: "rgba(255,255,255,0.06)",
          padding: "2px 5px",
          borderRadius: "4px",
          fontFamily: "var(--font-mono)",
          fontSize: "12px"
        }}>
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.substring(codeMatch[0].length);
      continue;
    }

    // 5. Normal text character-by-character
    const nextSpecialIndex = remaining.search(/[\*`\[]/);
    if (nextSpecialIndex === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecialIndex > 0) {
      tokens.push(remaining.substring(0, nextSpecialIndex));
      remaining = remaining.substring(nextSpecialIndex);
    } else {
      tokens.push(remaining[0]);
      remaining = remaining.substring(1);
    }
  }

  return tokens;
}

function renderMarkdown(text: string) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  
  let inList = false;
  let listItems: string[] = [];
  let isNumbered = false;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = (key: string | number) => {
    if (listItems.length > 0) {
      const Tag = isNumbered ? "ol" : "ul";
      elements.push(
        <Tag key={`list-${key}`} style={{ paddingLeft: "20px", margin: "8px 0" }}>
          {listItems.map((item, i) => (
            <li key={i} style={{ marginBottom: "4px" }}>
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </Tag>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushCodeBlock = (key: string | number) => {
    if (codeBlockLines.length > 0) {
      elements.push(
        <pre key={`code-${key}`} style={{
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          padding: "10px",
          borderRadius: "6px",
          overflowX: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          margin: "8px 0"
        }}>
          <code>{codeBlockLines.join("\n")}</code>
        </pre>
      );
      codeBlockLines = [];
      inCodeBlock = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock(i);
      } else {
        flushList(i);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      if (!inList) {
        flushList(i);
        inList = true;
        isNumbered = false;
      }
      listItems.push(line.replace(/^\s*[\*\-]\s+/, ""));
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      if (!inList) {
        flushList(i);
        inList = true;
        isNumbered = true;
      }
      listItems.push(line.replace(/^\s*\d+\.\s+/, ""));
      continue;
    }

    if (inList) {
      flushList(i);
    }

    if (line.startsWith("### ")) {
      elements.push(<h5 key={i} style={{ margin: "16px 0 8px", fontSize: "14px", fontWeight: 600 }}>{parseInlineMarkdown(line.substring(4))}</h5>);
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h4 key={i} style={{ margin: "16px 0 8px", fontSize: "16px", fontWeight: 600 }}>{parseInlineMarkdown(line.substring(3))}</h4>);
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h3 key={i} style={{ margin: "16px 0 8px", fontSize: "18px", fontWeight: 700 }}>{parseInlineMarkdown(line.substring(2))}</h3>);
      continue;
    }

    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} style={{
          borderLeft: "3px solid var(--border-strong)",
          paddingLeft: "10px",
          color: "var(--muted)",
          margin: "8px 0",
          fontStyle: "italic"
        }}>
          {parseInlineMarkdown(line.substring(2))}
        </blockquote>
      );
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    elements.push(<p key={i} style={{ margin: "8px 0", lineHeight: "1.6" }}>{parseInlineMarkdown(line)}</p>);
  }

  flushList("final");
  flushCodeBlock("final");

  return elements;
}

export default function AIPanel({
  selected,
  lang,
  t,
  chatMessages,
  chatInput,
  chatLoading,
  chatError,
  chatHistoryRef,
  chatInputRef,
  globalChatEnabled,
  emailGenerating,
  copiedSummary,
  apiUrl,
  onSendMessage,
  onChatInputChange,
  onGlobalToggle,
  onCreateEmail,
  onCopySummary,
  onClose,
}: AIPanelProps) {
  const hasTranscript = !!selected?.transcript;

  return (
    <aside className="ai-panel" aria-label="AI Intelligence Panel">
      {/* Panel header */}
      <div className="ai-panel-header">
        <div className="ai-panel-header-left">
          <span className="ai-panel-accent-dot" aria-hidden="true" />
          <span className="ai-panel-title">{lang === "de" ? "KI" : "AI"}</span>
        </div>
        <button
          className="ai-panel-close"
          onClick={onClose}
          aria-label="Close AI panel"
          title="Close (⌘⌥C)"
        >
          ✕
        </button>
      </div>

      {/* Quick Actions */}
      {selected && hasTranscript && (
        <div className="ai-quick-actions">
          <button
            className="ai-action-btn"
            onClick={onCreateEmail}
            disabled={chatLoading || emailGenerating}
            aria-label="Generate professional follow-up email"
          >
            {emailGenerating ? "…" : "✉"}
            <span>{emailGenerating ? t.processingMeeting : t.createEmail}</span>
          </button>

          <button
            className="ai-action-btn"
            onClick={onCopySummary}
            disabled={!selected.summary}
            aria-label="Copy summary to clipboard"
          >
            {copiedSummary ? "✓" : "⎘"}
            <span>{copiedSummary ? t.copied : t.copySummary}</span>
          </button>

          <a
            href={`${apiUrl}/meetings/${selected.id}/pdf?lang=${lang}&token=${selected.media_token}`}
            download={`meeting-${selected.id}.pdf`}
            className="ai-action-btn"
            style={{ textDecoration: "none" }}
            aria-label="Export PDF"
          >
            ↓ <span>{t.exportPdf}</span>
          </a>

          {/* Study tools — NOT IMPLEMENTED in backend — shown as disabled */}
          <button
            className="ai-action-btn ai-action-coming-soon"
            disabled
            title={t.comingSoon}
            aria-label={`${t.flashcards} — ${t.comingSoon}`}
          >
            ▦ <span>{t.flashcards}</span>
          </button>
          <button
            className="ai-action-btn ai-action-coming-soon"
            disabled
            title={t.comingSoon}
            aria-label={`${t.quiz} — ${t.comingSoon}`}
          >
            ? <span>{t.quiz}</span>
          </button>
          <button
            className="ai-action-btn ai-action-coming-soon"
            disabled
            title={t.comingSoon}
            aria-label={`${t.studyGuide} — ${t.comingSoon}`}
          >
            ≡ <span>{t.studyGuide}</span>
          </button>
        </div>
      )}

      {/* Chat history */}
      <div
        ref={chatHistoryRef}
        className="ai-chat-history"
        tabIndex={0}
        aria-label="AI conversation history"
      >
        {hasTranscript ? (
          <>
            {chatMessages.length === 0 ? (
              <p className="ai-chat-empty">{t.chatPlaceholder}</p>
            ) : (
              chatMessages.map((msg, i) => {
                const isEmail =
                  msg.role === "assistant" &&
                  (msg.text.includes("Subject:") ||
                    msg.text.includes("Dear") ||
                    msg.text.includes("Hi "));
                return (
                  <div
                    key={i}
                    className={`ai-bubble ai-bubble-${msg.role}${isEmail ? " ai-bubble-email" : ""}`}
                  >
                    {msg.role === "assistant" ? renderMarkdown(msg.text) : msg.text}
                  </div>
                );
              })
            )}
            {chatLoading && (
              <div className="ai-typing" aria-label="AI is thinking">
                <span /><span /><span />
              </div>
            )}
            {chatError && (
              <div className="ai-chat-error" role="alert">
                {chatError}
              </div>
            )}
          </>
        ) : (
          <p className="ai-chat-empty ai-chat-empty-center">
            {t.chatNoTranscript}
          </p>
        )}
      </div>

      {/* Footer: global toggle + chips + input */}
      {selected && hasTranscript && (
        <div className="ai-chat-footer">
          {/* Scope toggle */}
          <label className="ai-scope-toggle">
            <input
              id="global-chat-checkbox"
              type="checkbox"
              checked={globalChatEnabled}
              onChange={(e) => onGlobalToggle(e.target.checked)}
            />
            <span className="ai-scope-label">🌐 {t.searchScopeGlobal}</span>
          </label>

          {/* Suggestion chips */}
          <div className="ai-chips">
            {[
              { id: "decisions", label: t.chatChipDecisions },
              { id: "actions",   label: t.chatChipActions },
              { id: "topics",    label: t.chatChipTopics },
              { id: "who",       label: t.chatChipWho },
              { id: "deadlines", label: t.chatChipDeadlines },
            ].map((chip) => (
              <button
                key={chip.id}
                className="ai-chip"
                disabled={chatLoading}
                onClick={() => onSendMessage(chip.label)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="ai-input-row">
            <input
              ref={chatInputRef}
              type="text"
              className="ai-input"
              value={chatInput}
              placeholder={t.chatPlaceholder}
              disabled={chatLoading}
              aria-label="Type message to AI"
              onChange={(e) => onChatInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSendMessage();
              }}
            />
            <button
              className="ai-send-btn"
              disabled={chatLoading || !chatInput.trim()}
              onClick={() => onSendMessage()}
              aria-label="Send message"
            >
              {t.chatSend}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
