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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md animate-rise rounded-2xl border border-slate-100 bg-white p-6 shadow-soft-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Keyboard className="h-4 w-4 text-brand-500" /> {lang === "de" ? "Tastenkombinationen" : "Keyboard shortcuts"}
          </h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100" aria-label="Close shortcuts help">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="divide-y divide-slate-100">
          {SHORTCUTS.map((s) => (
            <li key={s.en} className="flex items-center justify-between py-2.5 text-sm text-slate-600">
              <span>{lang === "de" ? s.de : s.en}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="min-w-[22px] rounded-md border border-slate-200 border-b-2 bg-slate-50 px-1.5 py-0.5 text-center font-mono text-[11px] text-slate-700">
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
