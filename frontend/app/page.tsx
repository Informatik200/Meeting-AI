"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import AppShell, { type NavKey } from "./components/AppShell";
import AuthScreen from "./components/AuthScreen";
import CopilotPanel from "./components/CopilotPanel";
import Dashboard from "./components/Dashboard";
import MeetingDetail from "./components/MeetingDetail";
import MeetingsList from "./components/MeetingsList";
import RecordingFlow from "./components/RecordingFlow";
import SettingsView from "./components/SettingsView";
import ShortcutsHelp from "./components/ShortcutsHelp";
import { API_URL, apiFetch, logout as apiLogout, refreshSession, type AuthUser } from "./lib/auth";
import {
  type ChatMessage,
  type EntityTag,
  type Lang,
  type Meeting,
  type RelatedMeeting,
} from "./lib/types";

type View = NavKey | "detail";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("home");
  const [copilotOpen, setCopilotOpen] = useState(true);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  // Classification
  const [isEditingType, setIsEditingType] = useState(false);
  const [newType, setNewType] = useState("");
  const [typeLoading, setTypeLoading] = useState(false);

  // Misc UI
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [emailGenerating, setEmailGenerating] = useState(false);
  const [globalChatEnabled, setGlobalChatEnabled] = useState(false);
  const [autoStartRecord, setAutoStartRecord] = useState(false);

  // Memory graph
  const [peopleTags, setPeopleTags] = useState<EntityTag[]>([]);
  const [projectTags, setProjectTags] = useState<EntityTag[]>([]);
  const [topicTags, setTopicTags] = useState<EntityTag[]>([]);
  const [relatedMeetings, setRelatedMeetings] = useState<RelatedMeeting[]>([]);

  // Meeting management
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const t = (en: string, de: string) => (lang === "de" ? de : en);

  // Restore preferences
  useEffect(() => {
    const savedLang = localStorage.getItem("meeting-ai-lang");
    if (savedLang === "en" || savedLang === "de") setLang(savedLang);
    const favs = localStorage.getItem("meeting-ai-favorites");
    if (favs) {
      try {
        setFavorites(JSON.parse(favs));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Silent session restore
  useEffect(() => {
    (async () => {
      const user = await refreshSession();
      setAuthUser(user);
      setAuthChecked(true);
    })();
  }, []);

  async function handleLogout() {
    await apiLogout();
    setAuthUser(null);
    setMeetings([]);
    setSelected(null);
    setView("home");
  }

  function changeLanguage(newLang: Lang) {
    setLang(newLang);
    localStorage.setItem("meeting-ai-lang", newLang);
  }

  async function loadMeetingMetadata(meetingId: number) {
    try {
      const res = await apiFetch(`${API_URL}/meetings/${meetingId}/metadata`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPeopleTags(data.people || []);
      setProjectTags(data.projects || []);
      setTopicTags(data.topics || []);
      setRelatedMeetings(data.related_meetings || []);
    } catch {
      setPeopleTags([]);
      setProjectTags([]);
      setTopicTags([]);
      setRelatedMeetings([]);
    }
  }

  // Reset chat + load metadata when selected meeting changes
  useEffect(() => {
    setChatMessages([]);
    setChatInput("");
    setChatLoading(false);
    setChatError("");
    setIsEditingType(false);
    setTypeLoading(false);
    if (selected) void loadMeetingMetadata(selected.id);
    else {
      setPeopleTags([]);
      setProjectTags([]);
      setTopicTags([]);
      setRelatedMeetings([]);
    }
    if (transcriptRef.current) transcriptRef.current.scrollTop = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Scroll chat
  useEffect(() => {
    if (chatHistoryRef.current) chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
  }, [chatMessages, chatLoading, chatError]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setCopilotOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (chatInputRef.current) chatInputRef.current.focus();
        else searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsEditingType(false);
        setShowShortcuts(false);
        if (renameId !== null) setRenameId(null);
        if (deleteId !== null) setDeleteId(null);
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const a = document.activeElement;
        const typing = a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.hasAttribute("contenteditable"));
        if (!typing) {
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [renameId, deleteId]);

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("meeting-ai-favorites", JSON.stringify(next));
      return next;
    });
  };

  async function handleRenameSave() {
    if (renameId === null || !renameTitle.trim()) return;
    try {
      const res = await apiFetch(`${API_URL}/meetings/${renameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle.trim() }),
      });
      if (!res.ok) throw new Error("Rename failed");
      const updated = await res.json();
      setMeetings((curr) => curr.map((m) => (m.id === renameId ? { ...m, title: updated.title } : m)));
      setSelected((curr) => (curr && curr.id === renameId ? { ...curr, title: updated.title } : curr));
      setRenameId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteConfirm() {
    if (deleteId === null) return;
    try {
      const res = await apiFetch(`${API_URL}/meetings/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      const next = meetings.filter((m) => m.id !== deleteId);
      setMeetings(next);
      if (selected && selected.id === deleteId) {
        setSelected(null);
        setView("meetings");
      }
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    }
  }

  function copySummaryToClipboard() {
    if (!selected || !selected.summary) return;
    void navigator.clipboard.writeText(selected.summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  }

  async function triggerCreateEmail() {
    if (!selected || emailGenerating) return;
    setEmailGenerating(true);
    try {
      await sendChatMessage(
        "Draft a professional follow-up email summarizing the key topics, action items, owner tasks, and decisions from this meeting.",
      );
    } finally {
      setEmailGenerating(false);
    }
  }

  async function handleOverrideType() {
    if (!selected) return;
    setTypeLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/meetings/${selected.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_type: newType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to change type.");
      setMeetings((curr) => curr.map((m) => (m.id === selected.id ? data : m)));
      setSelected(data);
      setIsEditingType(false);
    } catch (cause) {
      console.error(cause instanceof Error ? cause.message : "Failed to change type.");
    } finally {
      setTypeLoading(false);
    }
  }

  async function sendChatMessage(messageOverride?: string) {
    const textToSend = messageOverride ?? chatInput;
    if (!textToSend.trim()) return;
    const isGlobal = globalChatEnabled || !selected;
    if (!isGlobal && !selected) return; // safeguard
    if (!messageOverride) setChatInput("");
    setChatError("");
    setChatLoading(true);
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", text: textToSend }];
    setChatMessages(newMessages);
    const endpoint = isGlobal
      ? `${API_URL}/meetings/global/chat`
      : `${API_URL}/meetings/${selected!.id}/chat`;
    try {
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? t("Could not get a response.", "Fehler beim Abrufen der Antwort."));
      setChatMessages([...newMessages, { role: "assistant", text: data.response }]);
    } catch (cause) {
      setChatError(cause instanceof Error ? cause.message : t("Could not get a response.", "Fehler beim Abrufen der Antwort."));
    } finally {
      setChatLoading(false);
    }
  }

  async function loadMeetings() {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/meetings`);
      if (!res.ok) throw new Error("load failed");
      const data: Meeting[] = await res.json();
      setMeetings(data);
      setSelected((curr) => (curr ? (data.find((m) => m.id === curr.id) ?? curr) : null));
    } catch (cause) {
      console.error(cause);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authUser) void loadMeetings();
  }, [lang, authUser]);

  // ── Render gates ──────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Sparkles className="h-6 w-6 animate-pulse text-brand-400" />
      </div>
    );
  }
  if (!authUser) {
    return <AuthScreen lang={lang} onAuthenticated={setAuthUser} />;
  }

  const selectMeeting = (m: Meeting) => {
    setSelected(m);
    setView("detail");
    setCopilotOpen(true);
  };
  const navigate = (key: NavKey) => {
    setView(key);
    setSelected(null);
  };
  const triggerQuickRecord = () => {
    setAutoStartRecord(true);
    setView("uploads");
    setSelected(null);
  };
  const activeNav: NavKey = view === "detail" ? "meetings" : (view as NavKey);
  const showCopilot = copilotOpen;

  return (
    <>
      <AppShell
        user={authUser}
        lang={lang}
        active={activeNav}
        onNavigate={navigate}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => setView("search")}
        searchInputRef={searchInputRef}
        onQuickRecord={triggerQuickRecord}
        onLogout={() => void handleLogout()}
        meetings={meetings}
        selectedMeeting={selected}
        onSelectMeeting={selectMeeting}
      >
        <div className="flex h-full">
          <div className="min-w-0 flex-1 overflow-y-auto">
            {view === "home" && (
              <Dashboard
                user={authUser}
                lang={lang}
                meetings={meetings}
                loading={loading}
                onSelectMeeting={selectMeeting}
                onUpload={() => setView("uploads")}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={() => setView("search")}
                onQuickRecord={triggerQuickRecord}
              />
            )}
            {(view === "meetings" || view === "search") && (
              <MeetingsList
                lang={lang}
                mode={view === "search" ? "search" : "meetings"}
                meetings={meetings}
                loading={loading}
                query={view === "search" ? searchQuery : ""}
                onSelectMeeting={selectMeeting}
                onUpload={() => setView("uploads")}
              />
            )}
            {view === "uploads" && (
              <RecordingFlow
                lang={lang}
                apiUrl={API_URL}
                onUploadComplete={(m) => {
                  setMeetings((curr) => [m, ...curr]);
                  selectMeeting(m);
                }}
                onError={(msg) => console.error(msg)}
                autoStart={autoStartRecord}
                onStarted={() => setAutoStartRecord(false)}
              />
            )}
            {view === "settings" && (
              <SettingsView
                user={authUser}
                lang={lang}
                onChangeLanguage={changeLanguage}
                onProfileUpdated={setAuthUser}
                onShowShortcuts={() => setShowShortcuts(true)}
              />
            )}
            {view === "detail" && selected && (
              <MeetingDetail
                selected={selected}
                meetings={meetings}
                lang={lang}
                apiUrl={API_URL}
                favorites={favorites}
                peopleTags={peopleTags}
                projectTags={projectTags}
                topicTags={topicTags}
                relatedMeetings={relatedMeetings}
                transcriptRef={transcriptRef}
                isEditingType={isEditingType}
                newType={newType}
                typeLoading={typeLoading}
                copiedSummary={copiedSummary}
                onToggleFavorite={toggleFavorite}
                onSetSelected={selectMeeting}
                onSetNewType={setNewType}
                onSetIsEditingType={setIsEditingType}
                onOverrideType={() => void handleOverrideType()}
                onCopySummary={copySummaryToClipboard}
                onBack={() => navigate("meetings")}
                onRename={() => {
                  setRenameId(selected.id);
                  setRenameTitle(selected.title);
                }}
                onDelete={() => setDeleteId(selected.id)}
              />
            )}
          </div>

          {/* Copilot rail (Orivon AI) */}
          {showCopilot && (
            <div className="hidden w-[320px] flex-shrink-0 lg:block">
              <CopilotPanel
                selected={selected}
                lang={lang}
                userName={(authUser.name || authUser.email.split("@")[0]).split(" ")[0]}
                chatMessages={chatMessages}
                chatInput={chatInput}
                chatLoading={chatLoading}
                chatError={chatError}
                chatHistoryRef={chatHistoryRef}
                chatInputRef={chatInputRef}
                globalChatEnabled={globalChatEnabled || !selected}
                emailGenerating={emailGenerating}
                onSendMessage={(o) => void sendChatMessage(o)}
                onChatInputChange={setChatInput}
                onGlobalToggle={setGlobalChatEnabled}
                onCreateEmail={() => void triggerCreateEmail()}
                onClose={() => setCopilotOpen(false)}
              />
            </div>
          )}
        </div>
      </AppShell>

      {/* Rename modal */}
      {renameId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setRenameId(null)}>
          <div className="w-full max-w-sm animate-rise rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-soft-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-text-primary">{t("Rename recording", "Aufnahme umbenennen")}</h3>
            <input
              className="mt-4 w-full rounded-lg border border-border-subtle bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent-lime focus:outline-none focus:ring-1 focus:ring-accent-lime"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameTitle.trim()) void handleRenameSave();
              }}
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setRenameId(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-elevated-hover transition-colors cursor-pointer">
                {t("Cancel", "Abbrechen")}
              </button>
              <button
                onClick={() => void handleRenameSave()}
                disabled={!renameTitle.trim()}
                className="rounded-lg bg-accent-lime px-4 py-2 text-sm font-semibold text-black hover:bg-opacity-95 transition-colors cursor-pointer disabled:opacity-40"
              >
                {t("Save", "Speichern")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm animate-rise rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-soft-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold text-text-primary">{t("Delete recording", "Aufnahme löschen")}</h3>
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">
              {t(
                "Are you sure you want to permanently delete this recording? This can't be undone.",
                "Möchten Sie diese Aufnahme wirklich dauerhaft löschen? Dies kann nicht rückgängig gemacht werden.",
              )}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-elevated-hover transition-colors cursor-pointer">
                {t("Cancel", "Abbrechen")}
              </button>
              <button onClick={() => void handleDeleteConfirm()} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer">
                {t("Delete", "Löschen")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Help dialog */}
      {showShortcuts && <ShortcutsHelp lang={lang} onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
