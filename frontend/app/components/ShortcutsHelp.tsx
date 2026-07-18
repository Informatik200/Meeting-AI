"use client";

import { Keyboard, X } from "lucide-react";
import type { Lang } from "../lib/types";

interface ShortcutsHelpProps {
  lang: Lang;
  onClose: () => void;
}

const SHORTCUTS: { keys: string[]; en: string; de: string }[] = [
  { keys: ["⌘", "K"], en: "Focus search", de: "Suche fokussieren" },
  { keys: ["⌘", "/"], en: "Toggle sidebar", de: "Seitenleiste umschalten" },
  { keys: ["⌘", "⌥", "C"], en: "Toggle AI panel", de: "KI-Panel umschalten" },
  { keys: ["Space"], en: "Play / pause audio", de: "Audio abspielen / pausieren" },
  { keys: ["←"], en: "Seek back 10s", de: "10 Sekunden zurück" },
  { keys: ["→"], en: "Seek forward 10s", de: "10 Sekunden vor" },
  { keys: ["Esc"], en: "Close dialogs", de: "Dialoge schließen" },
  { keys: ["?"], en: "Show this help", de: "Diese Hilfe anzeigen" },
];

export default function ShortcutsHelp({ lang, onClose }: ShortcutsHelpProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md animate-rise rounded-xl border border-border-subtle bg-surface-card p-6 shadow-soft-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-text-primary">
            <Keyboard className="h-4 w-4 text-accent-lime" /> {lang === "de" ? "Tastenkombinationen" : "Keyboard shortcuts"}
          </h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer" aria-label="Close shortcuts help">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="divide-y divide-border-subtle">
          {SHORTCUTS.map((s) => (
            <li key={s.en} className="flex items-center justify-between py-2.5 text-sm text-text-secondary">
              <span>{lang === "de" ? s.de : s.en}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="min-w-[22px] rounded border border-border-strong border-b-2 bg-bg-base px-1.5 py-0.5 text-center font-mono text-[10px] text-text-primary">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
