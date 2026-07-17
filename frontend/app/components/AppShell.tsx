"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CloudUpload,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  Video,
  X,
} from "lucide-react";
import type { AuthUser } from "../lib/auth";
import { initials, type Lang } from "../lib/types";

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
  children: React.ReactNode;
}

const NAV: { key: NavKey; label: string; labelDe: string; icon: typeof Home; kbd?: string }[] = [
  { key: "home", label: "Home", labelDe: "Startseite", icon: Home },
  { key: "meetings", label: "Meetings", labelDe: "Aufnahmen", icon: Video },
  { key: "search", label: "Search", labelDe: "Suche", icon: Search, kbd: "⌘K" },
  { key: "uploads", label: "Uploads", labelDe: "Hochladen", icon: CloudUpload },
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
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-full flex-shrink-0">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100/70">
        <button className="flex items-center gap-2 text-brand-600" onClick={() => go("home")}>
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 text-white shadow-glow">
            <Video className="h-4 w-4" />
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">Orivon</span>
        </button>
        <button
          className="ml-auto text-slate-400 hover:text-slate-600 transition-colors lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {NAV.map(({ key, label, labelDe, icon: Icon, kbd }) => {
            const isActive = active === key;
            return (
              <li key={key}>
                <button
                  onClick={() => go(key)}
                  className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${isActive ? "text-brand-600" : "text-slate-400"}`} />
                  {lang === "de" ? labelDe : label}
                  {kbd && (
                    <span className="ml-auto text-[11px] font-mono text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50">
                      {kbd}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile footer */}
      <div className="relative border-t border-slate-100 p-3" ref={profileRef}>
        {profileOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 rounded-xl border border-slate-100 bg-white p-1.5 shadow-soft-lg animate-rise">
            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              onClick={() => {
                setProfileOpen(false);
                go("settings");
              }}
            >
              <Settings className="h-[15px] w-[15px] text-slate-400" /> {lang === "de" ? "Einstellungen" : "Settings"}
            </button>
            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              onClick={() => {
                setProfileOpen(false);
                onLogout();
              }}
            >
              <LogOut className="h-[15px] w-[15px]" /> {lang === "de" ? "Abmelden" : "Log out"}
            </button>
          </div>
        )}
        <button
          className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-slate-50 transition-colors"
          onClick={() => setProfileOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          aria-label="Account menu"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-purple-500 text-sm font-bold text-white">
            {initials(displayName)}
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-semibold text-slate-900">{displayName}</span>
            <span className="block truncate text-xs text-slate-400">{user.email}</span>
          </span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{sidebar}</div>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-fade-in" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full animate-rise">{sidebar}</div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-100 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative min-w-0 flex-1 max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
              className="w-full rounded-lg border border-transparent bg-slate-100/60 py-2 pl-10 pr-12 text-sm transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder={lang === "de" ? "Aufnahmen, Personen, Themen suchen…" : "Search meetings, people, topics..."}
              aria-label="Search recordings"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-400 shadow-sm sm:block">
              ⌘K
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              onClick={onQuickRecord}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 transition-colors hover:bg-brand-700 sm:px-4"
            >
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">{lang === "de" ? "Aufnehmen" : "Quick Record"}</span>
            </button>
            <button
              className="relative hidden h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sm:grid"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => onNavigate("settings")}
              className="hidden h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sm:grid"
              aria-label="Settings"
            >
              <Settings className="h-[18px] w-[18px]" />
            </button>
            <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
            <button
              onClick={() => onNavigate("settings")}
              className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-purple-500 text-xs font-bold text-white"
              aria-label="Open profile"
            >
              {initials(displayName)}
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
