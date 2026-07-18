"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CloudUpload,
  FileText,
  Home,
  LogOut,
  Menu,
  Mic,
  Search,
  Settings,
  X,
} from "lucide-react";
import type { AuthUser } from "../lib/auth";
import { formatRelativeTime, initials, TYPE_META, type Lang, type Meeting } from "../lib/types";

export type NavKey = "home" | "meetings" | "search" | "uploads" | "settings";

interface AppShellProps {
  user: AuthUser;
  lang: Lang;
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  onQuickRecord: () => void;
  onLogout: () => void;
  meetings?: Meeting[];
  selectedMeeting?: Meeting | null;
  onSelectMeeting?: (m: Meeting) => void;
  children: React.ReactNode;
}

const NAV: { key: NavKey; label: string; labelDe: string; icon: typeof Home; kbd?: string }[] = [
  { key: "home", label: "Home", labelDe: "Startseite", icon: Home },
  { key: "meetings", label: "Meetings", labelDe: "Aufnahmen", icon: FileText },
  { key: "search", label: "Search", labelDe: "Suche", icon: Search, kbd: "⌘K" },
  { key: "uploads", label: "Uploads", labelDe: "Hochladen", icon: CloudUpload },
  { key: "settings", label: "Settings", labelDe: "Einstellungen", icon: Settings },
];

export default function AppShell({
  user,
  lang,
  active,
  onNavigate,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchInputRef,
  onQuickRecord,
  onLogout,
  meetings,
  selectedMeeting,
  onSelectMeeting,
  children,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const close = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [profileOpen]);

  const go = (key: NavKey) => {
    onNavigate(key);
    setMobileNavOpen(false);
  };

  const displayName = user.name || user.email.split("@")[0];

  const sidebar = (
    <aside className="w-64 bg-surface-card border-r border-border-subtle flex flex-col h-full flex-shrink-0 text-text-primary">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-border-subtle flex-shrink-0">
        <button className="flex items-center gap-2 cursor-pointer" onClick={() => go("home")}>
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-lime text-black font-extrabold text-sm shadow-glow">
            O
          </span>
          <span className="text-base font-bold tracking-tight text-text-primary">Orivon</span>
        </button>
        <button
          className="ml-auto text-text-muted hover:text-text-secondary transition-colors lg:hidden cursor-pointer"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="py-4 px-3 flex-shrink-0">
        <ul className="space-y-0.5">
          {NAV.map(({ key, label, labelDe, icon: Icon, kbd }) => {
            const isActive = active === key;
            return (
              <li key={key}>
                <button
                  onClick={() => go(key)}
                  className={`flex w-full items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-bg-active text-accent-lime"
                      : "text-text-secondary hover:bg-elevated-hover hover:text-text-primary"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-accent-lime" : "text-text-muted"}`} />
                  <span className="flex-1 text-left">{lang === "de" ? labelDe : label}</span>
                  {kbd && (
                    <span className="text-[10px] font-mono text-text-muted border border-border-subtle rounded px-1.5 py-0.5 bg-surface-card">
                      {kbd}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Recent Meetings */}
      {meetings && meetings.length > 0 && (
        <div className="flex-1 overflow-y-auto py-2 px-3 border-t border-border-subtle min-h-0">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {lang === "de" ? "Letzte Meetings" : "Recent Meetings"}
          </div>
          <ul className="mt-1 space-y-0.5">
            {meetings.slice(0, 10).map((m) => {
              const isSelected = selectedMeeting?.id === m.id;
              const meta = TYPE_META[m.recording_type] ?? TYPE_META.Unknown;
              const timeStr = formatRelativeTime(m.created_at, lang);
              return (
                <li key={m.id}>
                  <button
                    onClick={() => onSelectMeeting?.(m)}
                    className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-bg-active text-text-primary border-l-2 border-accent-lime"
                        : "text-text-secondary hover:bg-elevated-hover hover:text-text-primary"
                    }`}
                  >
                    <span className={`block truncate text-xs font-semibold w-full ${isSelected ? "text-accent-lime" : "text-text-primary"}`}>
                      {m.title}
                    </span>
                    <div className="flex w-full items-center justify-between text-[10px] text-text-muted font-mono mt-0.5">
                      <span>{meta.label}</span>
                      <span>{timeStr}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Profile footer */}
      <div className="relative border-t border-border-subtle p-3 flex-shrink-0" ref={profileRef}>
        {profileOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 rounded-xl border border-border-subtle bg-surface-card p-1.5 shadow-soft-lg animate-rise z-30">
            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer"
              onClick={() => {
                setProfileOpen(false);
                go("settings");
              }}
            >
              <Settings className="h-4 w-4 text-text-muted" /> {lang === "de" ? "Einstellungen" : "Settings"}
            </button>
            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-rose-950/20 hover:text-rose-400 transition-colors cursor-pointer"
              onClick={() => {
                setProfileOpen(false);
                onLogout();
              }}
            >
              <LogOut className="h-4 w-4" /> {lang === "de" ? "Abmelden" : "Log out"}
            </button>
          </div>
        )}
        <button
          className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-elevated-hover transition-colors cursor-pointer"
          onClick={() => setProfileOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          aria-label="Account menu"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-lime text-xs font-bold text-black flex-shrink-0">
            {initials(displayName)}
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-semibold text-text-primary">{displayName}</span>
            <span className="block truncate text-xs text-text-muted">{user.email}</span>
          </span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-text-primary">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{sidebar}</div>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full animate-rise">{sidebar}</div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-border-subtle bg-bg-base px-4 sm:px-6 lg:px-8">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-elevated-hover lg:hidden cursor-pointer"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative min-w-0 flex-1 max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              ref={searchInputRef}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearchSubmit();
              }}
              onFocus={() => {
                if (active !== "search") onNavigate("search");
              }}
              className="w-full rounded-lg border border-border-subtle bg-surface-card py-2 pl-10 pr-12 text-sm text-text-primary transition-all placeholder:text-text-muted focus:border-accent-lime focus:outline-none focus:ring-1 focus:ring-accent-lime"
              placeholder={lang === "de" ? "Aufnahmen, Personen, Themen suchen…" : "Search meetings, people, topics..."}
              aria-label="Search recordings"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border-subtle bg-elevated-hover px-1.5 py-0.5 font-mono text-[10px] text-text-muted shadow-sm sm:block">
              ⌘K
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              onClick={onQuickRecord}
              className="flex items-center gap-2 rounded-lg bg-accent-lime px-3 py-1.5 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-opacity-90 cursor-pointer sm:px-4 animate-fade-in"
            >
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">{lang === "de" ? "Aufnehmen" : "Quick Record"}</span>
            </button>
            <button
              className="relative hidden h-8 w-8 place-items-center rounded-full text-text-muted transition-colors hover:bg-elevated-hover hover:text-text-primary sm:grid cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => onNavigate("settings")}
              className="hidden h-8 w-8 place-items-center rounded-full text-text-muted transition-colors hover:bg-elevated-hover hover:text-text-primary sm:grid cursor-pointer"
              aria-label="Settings"
            >
              <Settings className="h-[18px] w-[18px]" />
            </button>
            <div className="mx-1 hidden h-6 w-px bg-border-subtle sm:block" />
            <button
              onClick={() => onNavigate("settings")}
              className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-accent-lime text-xs font-bold text-black cursor-pointer"
              aria-label="Open profile"
            >
              {initials(displayName)}
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-bg-base">{children}</main>
      </div>
    </div>
  );
}
