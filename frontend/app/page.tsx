"use client";

import { useEffect, useRef, useState } from "react";
import RecordingWorkspace from "./components/RecordingWorkspace";
import AIPanel from "./components/AIPanel";
import RecordingFlow from "./components/RecordingFlow";

type ActionItem = { task: string; owner: string | null; due: string | null };
type Meeting = {
  id: number;
  title: string;
  status: string;
  recording_type: string;
  confidence: number;
  audio_filename: string | null;
  transcript: string | null;
  summary: string | null;
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
  created_at: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const translations = {
  en: {
    tagline: "AI Knowledge Workspace",
    eyebrow: "CAPTURE · INDEX · REMEMBER",
    headingNormal: "Every recording,",
    headingEm: "remembered.",
    lede: "Capture a conversation, then get a clean summary, decisions, and action items — permanently stored in your knowledge memory.",
    recordingNow: "Capture active",
    readyToCapture: "Ready to capture",
    recordingDesc: "Speak naturally. Stop when the capture ends.",
    readyDesc: "Use your microphone or choose an audio file.",
    stopRecording: "Stop capture",
    recordMeeting: "Record",
    chooseFile: "Choose file",
    transcribeSummarize: "Index & summarize →",
    processingMeeting: "Processing...",
    recentMeetings: "Recent recordings",
    loadingMeetings: "Loading your recordings…",
    noMeetingsYet: "No recordings yet. Star or record your first one.",
    emptyStateTitle: "Your structured knowledge will appear here.",
    emptyStateDesc: "Select a recording or start capture to begin.",
    summary: "Summary",
    keyPoints: "Key points",
    decisions: "Decisions",
    actionItems: "Action items",
    processingStatus: "This recording is still being processed.",
    processingFailed: "Processing failed. Please check the backend logs or retry.",
    loadMeetingsError: "Could not load recordings.",
    reachApiError: "Could not reach the API.",
    exportPdf: "Export PDF",
    detectedAs: "Detected as",
    change: "Change",
    "Business Meeting": "Business Meeting",
    "Lecture": "Lecture",
    "Interview": "Interview",
    "Personal Notes": "Personal Notes",
    "Podcast / Discussion": "Podcast / Discussion",
    "Unknown": "Unknown",
    chatHeader: "Ask Orivon",
    chatPlaceholder: "Ask a question...",
    chatSend: "Send",
    chatChipDecisions: "What decisions were made?",
    chatChipActions: "What are the next steps?",
    chatChipTopics: "What was the main topic?",
    chatChipWho: "Who was mentioned?",
    chatChipDeadlines: "Were there any deadlines?",
    chatError: "Could not get a response.",
    chatNoTranscript: "No transcript available to ask questions.",
    
    // Workspace translations
    navHome: "Home",
    navRecord: "Record & Upload",
    navSettings: "Settings",
    searchPlaceholder: "Search recordings...",
    createEmail: "Create Email",
    copySummary: "Copy Summary",
    copied: "Copied!",
    flashcards: "Flashcards",
    quiz: "Quiz",
    studyGuide: "Study Guide",
    toggleSidebar: "Toggle Sidebar",
    toggleChat: "Toggle AI Panel",
    
    // Knowledge Base elements
    searchScopeGlobal: "Search across all recordings",
    relatedRecordings: "Related Recordings",
    mentionedPeople: "Mentioned People",
    mentionedProjects: "Mentioned Projects",
    mentionedTopics: "Mentioned Topics",

    // Recording workspace tabs
    overviewTab: "Overview",
    transcriptTab: "Transcript",
    memoryTab: "Knowledge Memory",
    addedToMemory: "Added to Knowledge Memory",
    comingSoon: "Coming soon",
  },
  de: {
    tagline: "Ihr privater Wissensarbeitsbereich",
    eyebrow: "ERFASSEN · INDIZIEREN · ERINNERN",
    headingNormal: "Jede Aufnahme,",
    headingEm: "in Erinnerung.",
    lede: "Erfassen Sie ein Gespräch und erhalten Sie eine saubere Zusammenfassung, Entscheidungen und Aufgaben – dauerhaft in Ihrem Wissensgedächtnis gespeichert.",
    recordingNow: "Aufnahme aktiv",
    readyToCapture: "Bereit zur Aufnahme",
    recordingDesc: "Sprechen Sie ganz natürlich. Stoppen Sie, wenn die Erfassung endet.",
    readyDesc: "Verwenden Sie Ihr Mikrofon oder wählen Sie eine Audiodatei aus.",
    stopRecording: "Aufnahme stoppen",
    recordMeeting: "Aufnehmen",
    chooseFile: "Datei auswählen",
    transcribeSummarize: "Indizieren & zusammenfassen →",
    processingMeeting: "Wird verarbeitet…",
    recentMeetings: "Letzte Aufnahmen",
    loadingMeetings: "Ihre Aufnahmen werden geladen…",
    noMeetingsYet: "Noch keine Aufnahmen. Nehmen Sie Ihre erste auf oder laden Sie eine hoch.",
    emptyStateTitle: "Ihr strukturiertes Wissen wird hier angezeigt.",
    emptyStateDesc: "Wählen Sie eine Aufnahme aus oder starten Sie eine Erfassung.",
    summary: "Zusammenfassung",
    keyPoints: "Wichtige Punkte",
    decisions: "Entscheidungen",
    actionItems: "Aufgaben",
    processingStatus: "Diese Aufnahme wird noch verarbeitet.",
    processingFailed: "Verarbeitung fehlgeschlagen. Bitte überprüfen Sie die Backend-Protokolle oder versuchen Sie es erneut.",
    loadMeetingsError: "Aufnahmen konnten nicht geladen werden.",
    reachApiError: "Die API konnte nicht erreicht werden.",
    exportPdf: "PDF exportieren",
    detectedAs: "Erkannt als",
    change: "Ändern",
    "Business Meeting": "Geschäftstreffen",
    "Lecture": "Vorlesung",
    "Interview": "Interview",
    "Personal Notes": "Persönliche Notizen",
    "Podcast / Discussion": "Podcast / Diskussion",
    "Unknown": "Unbekannt",
    chatHeader: "Orivon fragen",
    chatPlaceholder: "Fragen Sie etwas...",
    chatSend: "Senden",
    chatChipDecisions: "Welche Entscheidungen wurden getroffen?",
    chatChipActions: "Was sind die nächsten Schritte?",
    chatChipTopics: "Was war das Hauptthema?",
    chatChipWho: "Wer wurde erwähnt?",
    chatChipDeadlines: "Gab es Fristen?",
    chatError: "Fehler beim Abrufen der Antwort.",
    chatNoTranscript: "Kein Transkript für Fragen verfügbar.",
    
    // Workspace translations
    navHome: "Startseite",
    navRecord: "Aufnahme & Upload",
    navSettings: "Einstellungen",
    searchPlaceholder: "Aufnahmen suchen...",
    createEmail: "E-Mail erstellen",
    copySummary: "Kopieren",
    copied: "Kopiert!",
    flashcards: "Lernkarten",
    quiz: "Quiz",
    studyGuide: "Leitfaden",
    toggleSidebar: "Seitenleiste umschalten",
    toggleChat: "KI-Panel umschalten",
    
    // Knowledge Base elements
    searchScopeGlobal: "Alle Aufnahmen durchsuchen",
    relatedRecordings: "Ähnliche Aufnahmen",
    mentionedPeople: "Erwähnte Personen",
    mentionedProjects: "Erwähnte Projekte",
    mentionedTopics: "Erwähnte Themen",

    // Recording workspace tabs
    overviewTab: "Übersicht",
    transcriptTab: "Transkript",
    memoryTab: "Wissensgedächtnis",
    addedToMemory: "Im Wissensgedächtnis gespeichert",
    comingSoon: "Demnächst",
  },
};

function formatDate(value: string | null, lang: string) {
  if (!value) return lang === "de" ? "Wird verarbeitet" : "Processing";
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function Home() {
  const [lang, setLang] = useState<"en" | "de">("en");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Chat integration
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  
  // Classification
  const [isEditingType, setIsEditingType] = useState(false);
  const [newType, setNewType] = useState("");
  const [typeLoading, setTypeLoading] = useState(false);
  
  // Panel Resizer & Nav States
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [chatWidth, setChatWidth] = useState(360);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [chatHidden, setChatHidden] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "record" | "settings">("home");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [emailGenerating, setEmailGenerating] = useState(false);

  // Knowledge base / Memory Graph
  const [globalChatEnabled, setGlobalChatEnabled] = useState(false);
  const [peopleTags, setPeopleTags] = useState<{ name: string; context: string }[]>([]);
  const [projectTags, setProjectTags] = useState<{ name: string; context: string }[]>([]);
  const [topicTags, setTopicTags] = useState<{ name: string; context: string }[]>([]);
  const [relatedMeetings, setRelatedMeetings] = useState<{ id: number; title: string; shared_count: number }[]>([]);

  // Meeting management
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Load configuration on mount to avoid Next.js hydration mismatches
  useEffect(() => {
    const saved = localStorage.getItem("meeting-ai-lang");
    if (saved === "en" || saved === "de") {
      setLang(saved);
    }
    const savedSidebar = localStorage.getItem("meeting-ai-sidebar-width");
    if (savedSidebar) setSidebarWidth(parseInt(savedSidebar));
    const savedChat = localStorage.getItem("meeting-ai-chat-width");
    if (savedChat) setChatWidth(parseInt(savedChat));
    const savedFavorites = localStorage.getItem("meeting-ai-favorites");
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch {
        // Fallback
      }
    }
  }, []);

  function changeLanguage(newLang: "en" | "de") {
    setLang(newLang);
    localStorage.setItem("meeting-ai-lang", newLang);
  }

  // Fetch meeting memory metadata from backend
  async function loadMeetingMetadata(meetingId: number) {
    try {
      const response = await fetch(`${API_URL}/meetings/${meetingId}/metadata`);
      if (!response.ok) throw new Error();
      const data = await response.json();
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

  // Handle panel resetting when selected meeting changes
  useEffect(() => {
    setChatMessages([]);
    setChatInput("");
    setChatLoading(false);
    setChatError("");
    setIsEditingType(false);
    setTypeLoading(false);

    if (selected) {
      void loadMeetingMetadata(selected.id);
    } else {
      setPeopleTags([]);
      setProjectTags([]);
      setTopicTags([]);
      setRelatedMeetings([]);
    }

    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Scroll Chat logs on updates
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading, chatError]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar: Cmd+/ or Ctrl+/
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setSidebarHidden((prev) => !prev);
      }
      // Toggle chat panel: Cmd+Alt+C or Ctrl+Alt+C
      if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setChatHidden((prev) => !prev);
      }
      // Focus Chat input: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (chatInputRef.current) {
          chatInputRef.current.focus();
        } else if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
      // Cancel edit dropdown: Esc
      if (e.key === "Escape") {
        setIsEditingType(false);
        setMenuOpenId(null);
        if (renameId !== null) setRenameId(null);
        if (deleteId !== null) setDeleteId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Panel Resizing Logic
  const initSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(400, moveEvent.clientX));
      setSidebarWidth(newWidth);
      localStorage.setItem("meeting-ai-sidebar-width", String(newWidth));
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const initChatResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(600, window.innerWidth - moveEvent.clientX));
      setChatWidth(newWidth);
      localStorage.setItem("meeting-ai-chat-width", String(newWidth));
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Star / Favorite toggler
  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("meeting-ai-favorites", JSON.stringify(next));
      return next;
    });
  };

  // Close sidebar menu on outside click
  useEffect(() => {
    if (menuOpenId === null) return;
    const close = () => setMenuOpenId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpenId]);

  // Meeting rename handler
  async function handleRenameSave() {
    if (renameId === null || !renameTitle.trim()) return;
    try {
      const res = await fetch(`${API_URL}/meetings/${renameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle.trim() })
      });
      if (!res.ok) throw new Error("Rename failed");
      const updated = await res.json();
      setMeetings((curr) => curr.map((m) => m.id === renameId ? { ...m, title: updated.title } : m));
      setSelected((curr) => curr && curr.id === renameId ? { ...curr, title: updated.title } : curr);
      setRenameId(null);
    } catch (err) {
      console.error(err);
    }
  }

  // Meeting delete handler
  async function handleDeleteConfirm() {
    if (deleteId === null) return;
    try {
      const res = await fetch(`${API_URL}/meetings/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      const nextMeetings = meetings.filter((m) => m.id !== deleteId);
      setMeetings(nextMeetings);
      if (selected && selected.id === deleteId) {
        setSelected(nextMeetings[0] ?? null);
      }
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    }
  }

  // Quick Action triggers
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
      await sendChatMessage("Draft a professional follow-up email summarizing the key topics, action items, owner tasks, and decisions from this meeting.");
    } finally {
      setEmailGenerating(false);
    }
  }

  async function handleOverrideType() {
    if (!selected) return;
    setTypeLoading(true);
    try {
      const response = await fetch(`${API_URL}/meetings/${selected.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_type: newType })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Failed to change type.");

      setMeetings((current) => current.map((m) => m.id === selected.id ? data : m));
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
    if (!textToSend.trim() || !selected) return;

    if (!messageOverride) {
      setChatInput("");
    }
    setChatError("");
    setChatLoading(true);

    const newMessages = [...chatMessages, { role: "user" as const, text: textToSend }];
    setChatMessages(newMessages);

    // Dynamic routing: single vs cross-meeting (global) knowledge bases
    const chatEndpoint = globalChatEnabled
      ? `${API_URL}/meetings/global/chat`
      : `${API_URL}/meetings/${selected.id}/chat`;

    try {
      const response = await fetch(chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? t.chatError);

      setChatMessages([...newMessages, { role: "assistant" as const, text: data.response }]);
    } catch (cause) {
      setChatError(cause instanceof Error ? cause.message : t.chatError);
    } finally {
      setChatLoading(false);
    }
  }

  const t = translations[lang];

  async function loadMeetings() {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/meetings`);
      if (!response.ok) throw new Error(t.loadMeetingsError);
      const data: Meeting[] = await response.json();
      setMeetings(data);
      // Select the first meeting if none is currently selected
      setSelected((current) => data.find((meeting) => meeting.id === current?.id) ?? data[0] ?? null);
    } catch (cause) {
      console.error(cause instanceof Error ? cause.message : t.reachApiError);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadMeetings(); }, [lang]);



  // Meetings Search & Favorites lists filters
  const filteredMeetings = meetings.filter((meeting) => {
    const query = searchQuery.toLowerCase();
    const matchQuery =
      meeting.title.toLowerCase().includes(query) ||
      (meeting.transcript && meeting.transcript.toLowerCase().includes(query));
    return matchQuery;
  });

  return (
    <div className="workspace-layout">
      {/* Sidebar navigation */}
      <aside className={`workspace-sidebar ${sidebarHidden ? "hidden" : ""}`} style={{ width: `${sidebarWidth}px` }} aria-label="Sidebar navigation">
        <div className="sidebar-header">
          <a className="sidebar-brand" href="#top" onClick={() => setActiveTab("home")}>
            <span>✦</span> ORIVON
          </a>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeTab === "home" ? "active" : ""}`}
            onClick={() => setActiveTab("home")}
            aria-label="View recent recordings dashboard"
          >
            🏠 {t.navHome}
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === "record" ? "active" : ""}`}
            onClick={() => setActiveTab("record")}
            aria-label="Record or upload new recording"
          >
            🎙 {t.navRecord}
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
            aria-label="Application settings"
          >
            ⚙️ {t.navSettings}
          </button>
        </nav>

        <div className="sidebar-section-title">{t.recentMeetings}</div>
        <div className="sidebar-search">
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search recordings"
          />
        </div>

        <div className="sidebar-section-title" style={{ paddingTop: "4px" }}>{lang === "de" ? "Aufnahmen" : "Recordings"}</div>
        <div className="sidebar-meetings-list">
          {loading ? (
            <p className="muted" style={{ paddingLeft: "10px", fontSize: "13px" }}>{t.loadingMeetings}</p>
          ) : filteredMeetings.length === 0 ? (
            <p className="muted" style={{ paddingLeft: "10px", fontSize: "13px" }}>{t.noMeetingsYet}</p>
          ) : (
            filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className={`sidebar-meeting-item ${selected?.id === meeting.id && activeTab === "home" ? "active" : ""}`}
              >
                <div
                  style={{ flex: 1, minWidth: 0, padding: "8px 10px", textAlign: "left" }}
                  onClick={() => { setSelected(meeting); setActiveTab("home"); }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select recording ${meeting.title}`}
                  onKeyDown={(e) => { if (e.key === "Enter") { setSelected(meeting); setActiveTab("home"); } }}
                >
                  <div className="sidebar-meeting-title">
                    {favorites.includes(meeting.id) ? "★ " : ""}
                    {meeting.title}
                  </div>
                  <div className="sidebar-meeting-date">{formatDate(meeting.created_at, lang)}</div>
                </div>
                <button
                  className="sidebar-meeting-menu-trigger"
                  data-open={menuOpenId === meeting.id ? "true" : undefined}
                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === meeting.id ? null : meeting.id); }}
                  aria-label="Recording actions"
                >
                  ⋯
                </button>
                {menuOpenId === meeting.id && (
                  <div className="sidebar-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setMenuOpenId(null); setRenameId(meeting.id); setRenameTitle(meeting.title); }}>
                      ✏️&nbsp; {lang === "de" ? "Umbenennen" : "Rename"}
                    </button>
                    <button className="menu-danger" onClick={() => { setMenuOpenId(null); setDeleteId(meeting.id); }}>
                      🗑️&nbsp; {lang === "de" ? "Löschen" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Divider resizer handle for Sidebar */}
      {!sidebarHidden && <div className="resizer" onMouseDown={initSidebarResize} />}

      {/* Main Workspace Content pane */}
      <main className="workspace-main" aria-label="Main content workspace">
        {/* Workspace Quick toggles */}
        <div className="workspace-header-actions">
          <button
            onClick={() => setSidebarHidden((prev) => !prev)}
            className="icon-button"
            title={t.toggleSidebar}
            aria-label="Toggle navigation sidebar"
          >
            {sidebarHidden ? "➔" : "⬅"}
          </button>
          <button
            onClick={() => setChatHidden((prev) => !prev)}
            className="icon-button"
            title={t.toggleChat}
            aria-label="Toggle AI assistant chat panel"
            style={{ marginLeft: "auto" }}
          >
            {chatHidden ? "⬅" : "➔"}
          </button>
        </div>

        {/* View render switch based on active tab state */}
        {activeTab === "record" ? (
          <RecordingFlow
            lang={lang}
            apiUrl={API_URL}
            onUploadComplete={(newMeeting) => {
              setMeetings((current) => [newMeeting, ...current]);
              setSelected(newMeeting);
              setActiveTab("home");
            }}
            onError={(msg) => console.error(msg)}
          />
        ) : activeTab === "settings" ? (
          <div style={{ maxWidth: "520px", margin: "48px auto", width: "100%", padding: "0 24px" }}>
            <div className="settings-card">
              <h2>{t.navSettings}</h2>
              <div className="settings-field">
                <label>Language / Sprache</label>
                <select
                  value={lang}
                  onChange={(e) => changeLanguage(e.target.value as "en" | "de")}
                  aria-label="Select settings language"
                >
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* "home" Tab — recording workspace */
          !selected ? (
            <div className="workspace-empty-view">
              <div className="workspace-empty-icon">✦</div>
              <h2>{t.emptyStateTitle}</h2>
              <p>{t.emptyStateDesc}</p>
            </div>
          ) : (
            <RecordingWorkspace
              selected={selected}
              meetings={meetings}
              lang={lang}
              t={t}
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
              onToggleFavorite={toggleFavorite}
              onSetSelected={setSelected}
              onSetNewType={setNewType}
              onSetIsEditingType={setIsEditingType}
              onOverrideType={() => void handleOverrideType()}
              formatDate={formatDate}
            />
          )
        )}
      </main>

      {/* Divider resizer handle for AI panel */}
      {!chatHidden && <div className="resizer" onMouseDown={initChatResize} />}

      {/* Right AI Intelligence Panel */}
      <div style={{ width: chatHidden ? 0 : `${chatWidth}px`, flexShrink: 0, transition: `width 200ms cubic-bezier(0.16,1,0.3,1)`, overflow: chatHidden ? "hidden" : "visible" }}>
        <AIPanel
          selected={selected}
          lang={lang}
          t={t}
          chatMessages={chatMessages}
          chatInput={chatInput}
          chatLoading={chatLoading}
          chatError={chatError}
          chatHistoryRef={chatHistoryRef}
          chatInputRef={chatInputRef}
          globalChatEnabled={globalChatEnabled}
          emailGenerating={emailGenerating}
          copiedSummary={copiedSummary}
          apiUrl={API_URL}
          onSendMessage={(override) => void sendChatMessage(override)}
          onChatInputChange={setChatInput}
          onGlobalToggle={setGlobalChatEnabled}
          onCreateEmail={() => void triggerCreateEmail()}
          onCopySummary={copySummaryToClipboard}
          onClose={() => setChatHidden(true)}
        />
      </div>
      {/* ── Rename Modal ──────────────────────────────────── */}
      {renameId !== null && (
        <div className="modal-overlay" onClick={() => setRenameId(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{lang === "de" ? "Aufnahme umbenennen" : "Rename Recording"}</h3>
            <input
              className="modal-input"
              type="text"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && renameTitle.trim()) void handleRenameSave(); }}
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-btn modal-btn-secondary" onClick={() => setRenameId(null)}>
                {lang === "de" ? "Abbrechen" : "Cancel"}
              </button>
              <button className="modal-btn modal-btn-primary" onClick={() => void handleRenameSave()} disabled={!renameTitle.trim()}>
                {lang === "de" ? "Speichern" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────── */}
      {deleteId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{lang === "de" ? "Aufnahme löschen" : "Delete Recording"}</h3>
            <p>
              {lang === "de"
                ? "Sind Sie sicher, dass Sie diese Aufnahme dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
                : "Are you sure you want to permanently delete this recording? This action cannot be undone."}
            </p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-secondary" onClick={() => setDeleteId(null)}>
                {lang === "de" ? "Abbrechen" : "Cancel"}
              </button>
              <button className="modal-btn modal-btn-danger" onClick={() => void handleDeleteConfirm()}>
                {lang === "de" ? "Löschen" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
