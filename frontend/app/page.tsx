"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

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

const typeIcons: Record<string, string> = {
  "Business Meeting": "💼",
  "Lecture": "🎓",
  "Interview": "🎙",
  "Personal Notes": "📝",
  "Podcast / Discussion": "🎧",
  "Unknown": "❓"
};

const translations = {
  en: {
    tagline: "Your private meeting memory",
    eyebrow: "RECORD · TRANSCRIBE · ACT",
    headingNormal: "Every meeting,",
    headingEm: "remembered.",
    lede: "Capture a conversation, then get a clean summary, decisions, and the next steps — without writing notes.",
    recordingNow: "Recording now",
    readyToCapture: "Ready to capture",
    recordingDesc: "Speak naturally. Stop when the meeting ends.",
    readyDesc: "Use your microphone or choose an audio file.",
    stopRecording: "Stop recording",
    recordMeeting: "Record meeting",
    chooseFile: "Choose file",
    transcribeSummarize: "Transcribe & summarize →",
    processingMeeting: "Processing meeting…",
    recentMeetings: "Recent meetings",
    loadingMeetings: "Loading your meetings…",
    noMeetingsYet: "No recordings yet. Star or record your first one.",
    emptyStateTitle: "Your meeting notes will appear here.",
    emptyStateDesc: "Select an upload or start recording to begin.",
    summary: "Summary",
    keyPoints: "Key points",
    decisions: "Decisions",
    actionItems: "Action items",
    viewFullTranscript: "View full transcript",
    noneCaptured: "None captured",
    noActionItems: "No action items captured.",
    ownerDueNotSpecified: "Owner and due date not specified",
    processingStatus: "This meeting is still being processed.",
    processingFailed: "Processing failed. Please check the backend logs or retry.",
    micAccessBlocked: "Microphone access was blocked. Allow it in your browser settings, or upload an audio file instead.",
    loadMeetingsError: "Could not load meetings.",
    reachApiError: "Could not reach the API.",
    uploadFailed: "Upload failed.",
    exportPdf: "Export PDF",
    detectedAs: "Detected as",
    change: "Change",
    "Business Meeting": "Business Meeting",
    "Lecture": "Lecture",
    "Interview": "Interview",
    "Personal Notes": "Personal Notes",
    "Podcast / Discussion": "Podcast / Discussion",
    "Unknown": "Unknown",
    chatHeader: "Ask about this meeting",
    chatPlaceholder: "Ask a question about the meeting...",
    chatSend: "Send",
    chatSuggested: "Suggested questions:",
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
    starred: "Starred",
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
    mentionedTopics: "Mentioned Topics"
  },
  de: {
    tagline: "Ihr privater Meeting-Speicher",
    eyebrow: "AUFNEHMEN · TRANSSKRIBIEREN · HANDELN",
    headingNormal: "Jedes Meeting,",
    headingEm: "in Erinnerung.",
    lede: "Erfassen Sie ein Gespräch und erhalten Sie eine saubere Zusammenfassung, Entscheidungen und die nächsten Schritte – ohne Notizen zu schreiben.",
    recordingNow: "Aufnahme läuft",
    readyToCapture: "Bereit zur Aufnahme",
    recordingDesc: "Sprechen Sie ganz natürlich. Stoppen Sie, wenn das Meeting endet.",
    readyDesc: "Verwenden Sie Ihr Mikrofon oder wählen Sie eine Audiodatei aus.",
    stopRecording: "Aufnahme stoppen",
    recordMeeting: "Meeting aufnehmen",
    chooseFile: "Datei auswählen",
    transcribeSummarize: "Transkribieren & zusammenfassen →",
    processingMeeting: "Meeting wird verarbeitet…",
    recentMeetings: "Letzte Meetings",
    loadingMeetings: "Ihre Meetings werden geladen…",
    noMeetingsYet: "Noch keine Meetings. Nehmen Sie Ihr erstes auf oder laden Sie es hoch.",
    emptyStateTitle: "Ihre Meeting-Notizen werden hier angezeigt.",
    emptyStateDesc: "Wählen Sie ein Meeting aus oder starten Sie eine Aufnahme.",
    summary: "Zusammenfassung",
    keyPoints: "Wichtige Punkte",
    decisions: "Entscheidungen",
    actionItems: "Aufgaben",
    viewFullTranscript: "Vollständiges Transkript anzeigen",
    noneCaptured: "Keine erfasst",
    noActionItems: "Keine Aufgaben erfasst.",
    ownerDueNotSpecified: "Verantwortlicher und Fälligkeit nicht angegeben",
    processingStatus: "Dieses Meeting wird noch verarbeitet.",
    processingFailed: "Verarbeitung fehlgeschlagen. Bitte überprüfen Sie die Backend-Protokolle oder versuchen Sie es erneut.",
    micAccessBlocked: "Der Zugriff auf das Mikrofon wurde blockiert. Erlauben Sie ihn in Ihren Browsereinstellungen oder laden Sie stattdessen eine Audiodatei hoch.",
    loadMeetingsError: "Meetings konnten nicht geladen werden.",
    reachApiError: "Die API konnte nicht erreicht werden.",
    uploadFailed: "Upload failed.",
    exportPdf: "PDF exportieren",
    detectedAs: "Erkannt als",
    change: "Ändern",
    "Business Meeting": "Geschäftstreffen",
    "Lecture": "Vorlesung",
    "Interview": "Interview",
    "Personal Notes": "Persönliche Notizen",
    "Podcast / Discussion": "Podcast / Diskussion",
    "Unknown": "Unbekannt",
    chatHeader: "Fragen zu diesem Meeting",
    chatPlaceholder: "Stellen Sie eine Frage zum Meeting...",
    chatSend: "Senden",
    chatSuggested: "Vorgeschlagene Fragen:",
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
    starred: "Favorisiert",
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
    mentionedTopics: "Erwähnte Themen"
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
  const [file, setFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  
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
  const [sidebarWidth, setSidebarWidth] = useState(240);
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

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
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
    setError("");
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
      setError(cause instanceof Error ? cause.message : "Failed to change type.");
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
      setError(cause instanceof Error ? cause.message : t.reachApiError);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadMeetings(); }, [lang]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setFile(event.target.files?.[0] ?? null);
  }

  async function toggleRecording() {
    setError("");
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunks.current = [];
      mediaRecorder.ondataavailable = (event) => chunks.current.push(event.data);
      mediaRecorder.onstop = () => {
        const audio = new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" });
        setFile(new File([audio], `meeting-${Date.now()}.webm`, { type: audio.type }));
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };
      recorder.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch {
      setError(t.micAccessBlocked);
    }
  }

  async function upload() {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API_URL}/meetings/upload`, { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? t.uploadFailed);
      setMeetings((current) => [payload, ...current]);
      setSelected(payload);
      setFile(null);
      // Switch back to view pane
      setActiveTab("home");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

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
            <span>✦</span> Meeting AI
          </a>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeTab === "home" ? "active" : ""}`}
            onClick={() => setActiveTab("home")}
            aria-label="View recent meetings dashboard"
          >
            🏠 {t.navHome}
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === "record" ? "active" : ""}`}
            onClick={() => setActiveTab("record")}
            aria-label="Record or upload new meeting"
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

        <div className="sidebar-section-title">{t.searchPlaceholder}</div>
        <div style={{ padding: "0 4px" }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "13px",
              background: "var(--card)",
              color: "var(--ink)",
              marginBottom: "16px"
            }}
          />
        </div>

        <div className="sidebar-section-title">{t.recentMeetings}</div>
        <div className="sidebar-meetings-list">
          {loading ? (
            <p className="muted" style={{ paddingLeft: "12px" }}>{t.loadingMeetings}</p>
          ) : filteredMeetings.length === 0 ? (
            <p className="muted" style={{ paddingLeft: "12px" }}>{t.noMeetingsYet}</p>
          ) : (
            filteredMeetings.map((meeting) => (
              <button
                key={meeting.id}
                className={`sidebar-meeting-item ${selected?.id === meeting.id && activeTab === "home" ? "active" : ""}`}
                onClick={() => {
                  setSelected(meeting);
                  setActiveTab("home");
                }}
                aria-label={`Select meeting ${meeting.title}`}
              >
                <div className="sidebar-meeting-title">
                  {favorites.includes(meeting.id) ? "★ " : ""}
                  {meeting.title}
                </div>
                <div className="sidebar-meeting-date">{formatDate(meeting.created_at, lang)}</div>
              </button>
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
          <div className="workspace-record-view">
            <div className="record-panel-card">
              <div className={`record-dot ${recording ? "live" : ""}`} style={{ margin: "0 auto 16px" }} />
              <h2>{recording ? t.recordingNow : t.readyToCapture}</h2>
              <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
                {recording ? t.recordingDesc : file ? file.name : t.readyDesc}
              </p>
              
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  className={recording ? "stop" : "record"}
                  onClick={() => void toggleRecording()}
                  style={{
                    color: "white",
                    background: recording ? "#a73d38" : "var(--brand)",
                    border: 0,
                    borderRadius: "8px",
                    padding: "12px 24px",
                    fontWeight: 600
                  }}
                >
                  {recording ? t.stopRecording : t.recordMeeting}
                </button>
                
                <label
                  style={{
                    border: "1px solid #bbc6bf",
                    borderRadius: "8px",
                    padding: "11px 20px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: "var(--card)"
                  }}
                >
                  {t.chooseFile}
                  <input type="file" accept="audio/*,.webm,.mp4" onChange={chooseFile} style={{ display: "none" }} />
                </label>
              </div>

              {file && (
                <button
                  className="process"
                  onClick={() => void upload()}
                  disabled={uploading}
                  style={{
                    width: "100%",
                    marginTop: "24px",
                    color: "white",
                    background: "#173f34",
                    border: 0,
                    borderRadius: "8px",
                    padding: "12px",
                    fontWeight: 600
                  }}
                >
                  {uploading ? t.processingMeeting : t.transcribeSummarize}
                </button>
              )}
              {error && <p className="error" style={{ color: "#a5342f", marginTop: "16px" }}>{error}</p>}
            </div>
          </div>
        ) : activeTab === "settings" ? (
          <div style={{ maxWidth: "540px", margin: "40px auto", width: "100%" }}>
            <div className="record-panel-card" style={{ textAlign: "left" }}>
              <h2 style={{ marginTop: 0, marginBottom: "20px" }}>{t.navSettings}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>Language / Sprache</label>
                <select
                  value={lang}
                  onChange={(e) => changeLanguage(e.target.value as "en" | "de")}
                  aria-label="Select settings language"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-sidebar)",
                    color: "var(--ink)",
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* "home" Tab - meeting display */
          !selected ? (
            <div className="workspace-empty-view">
              <span>⌁</span>
              <h2>{t.emptyStateTitle}</h2>
              <p>{t.emptyStateDesc}</p>
            </div>
          ) : (
            <>
              <div className="workspace-title-section">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="workspace-date">{formatDate(selected.created_at, lang)}</span>
                  <button
                    onClick={() => toggleFavorite(selected.id)}
                    className="icon-button"
                    style={{ border: "none", background: "none", cursor: "pointer", fontSize: "16px", color: favorites.includes(selected.id) ? "#d97706" : "var(--muted)" }}
                    title={favorites.includes(selected.id) ? "Remove from Starred" : "Star meeting"}
                    aria-label={favorites.includes(selected.id) ? "Remove from Starred" : "Star meeting"}
                  >
                    {favorites.includes(selected.id) ? "★" : "☆"}
                  </button>
                </div>

                <div className="workspace-title-row">
                  <h1>{selected.title}</h1>
                </div>

                {/* Detected Recording type badge & manual override editing select */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0", fontSize: "13.5px", color: "var(--muted)" }}>
                  <span>
                    {t.detectedAs} {typeIcons[selected.recording_type] || "❓"} {t[selected.recording_type as keyof typeof translations.en] || selected.recording_type} 
                    {selected.confidence < 80 ? ` (${selected.confidence}%)` : ""}
                  </span>
                  
                  {isEditingType ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        aria-label="Select manual classification type"
                        disabled={typeLoading}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          color: "var(--ink)",
                          fontSize: "12px"
                        }}
                      >
                        <option value="Business Meeting">{t["Business Meeting"] || "Business Meeting"}</option>
                        <option value="Lecture">{t["Lecture"] || "Lecture"}</option>
                        <option value="Interview">{t["Interview"] || "Interview"}</option>
                        <option value="Personal Notes">{t["Personal Notes"] || "Personal Notes"}</option>
                        <option value="Podcast / Discussion">{t["Podcast / Discussion"] || "Podcast / Discussion"}</option>
                        <option value="Unknown">{t["Unknown"] || "Unknown"}</option>
                      </select>
                      <button
                        onClick={() => void handleOverrideType()}
                        disabled={typeLoading}
                        style={{
                          background: "var(--brand)",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "12px",
                          cursor: "pointer"
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingType(false)}
                        disabled={typeLoading}
                        style={{
                          background: "none",
                          border: "1px solid var(--border)",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "12px",
                          cursor: "pointer",
                          color: "var(--ink)"
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    selected.status !== "transcribing" && selected.status !== "summarizing" && (
                      <button
                        onClick={() => {
                          setNewType(selected.recording_type);
                          setIsEditingType(true);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--brand)",
                          fontSize: "12px",
                          textDecoration: "underline",
                          cursor: "pointer",
                          padding: 0
                        }}
                      >
                        {t.change}
                      </button>
                    )
                  )}
                </div>

                {/* Stream serving audio player */}
                {selected.audio_filename && selected.status === "done" && (
                  <div className="audio-player-container">
                    <span style={{ fontSize: "18px" }}>🔊</span>
                    <audio
                      src={`${API_URL}/audio/${selected.audio_filename}`}
                      controls
                      aria-label="Play recording audio stream"
                    />
                  </div>
                )}

                {/* Mentioned entities badges (Memory Graph Tag Clouds) */}
                {(peopleTags.length > 0 || projectTags.length > 0 || topicTags.length > 0) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
                    {peopleTags.map((tag, idx) => (
                      <span
                        key={idx}
                        title={tag.context}
                        style={{
                          background: "var(--brand-light)",
                          color: "var(--brand)",
                          fontSize: "12px",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          border: "1px solid var(--border)",
                          cursor: "help"
                        }}
                      >
                        👤 {tag.name}
                      </span>
                    ))}
                    {projectTags.map((tag, idx) => (
                      <span
                        key={idx}
                        title={tag.context}
                        style={{
                          background: "#fffbeb",
                          color: "#b45309",
                          fontSize: "12px",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          border: "1px solid #fde68a",
                          cursor: "help"
                        }}
                      >
                        📂 {tag.name}
                      </span>
                    ))}
                    {topicTags.map((tag, idx) => (
                      <span
                        key={idx}
                        title={tag.context}
                        style={{
                          background: "#f0f9ff",
                          color: "#0369a1",
                          fontSize: "12px",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          border: "1px solid #bae6fd",
                          cursor: "help"
                        }}
                      >
                        🏷️ {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Central workspace document detail view */}
              <div className="workspace-content">
                <section className="workspace-section">
                  <h3>{t.summary}</h3>
                  <p className="workspace-summary-text">
                    {selected.status === "failed" ? t.processingFailed : selected.summary || t.processingStatus}
                  </p>
                </section>

                <div className="workspace-grid">
                  <section className="workspace-section">
                    <h3>{t.keyPoints}</h3>
                    <ul>
                      {selected.key_points.length > 0 ? (
                        selected.key_points.map((point, index) => <li key={index}>{point}</li>)
                      ) : (
                        <li>{t.noneCaptured}</li>
                      )}
                    </ul>
                  </section>

                  <section className="workspace-section">
                    <h3>{t.decisions}</h3>
                    <ul>
                      {selected.decisions.length > 0 ? (
                        selected.decisions.map((decision, index) => <li key={index}>{decision}</li>)
                      ) : (
                        <li>{t.noneCaptured}</li>
                      )}
                    </ul>
                  </section>
                </div>

                <section className="workspace-section">
                  <h3>{t.actionItems}</h3>
                  <div className="actions-list">
                    {selected.action_items.length ? (
                      selected.action_items.map((item, index) => (
                        <div className="action-row" key={index}>
                          <span className="action-checkbox">✓</span>
                          <div className="action-details">
                            <strong>{item.task}</strong>
                            <p>{[item.owner, item.due].filter(Boolean).join(" · ") || t.ownerDueNotSpecified}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="muted" style={{ margin: 0 }}>{t.noActionItems}</p>
                    )}
                  </div>
                </section>

                {/* Related recordings list links */}
                {relatedMeetings.length > 0 && (
                  <section className="workspace-section">
                    <h3>🔗 {t.relatedRecordings}</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {relatedMeetings.map((meet) => (
                        <button
                          key={meet.id}
                          onClick={() => {
                            const matched = meetings.find((m) => m.id === meet.id);
                            if (matched) setSelected(matched);
                          }}
                          style={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius)",
                            padding: "8px 12px",
                            fontSize: "13px",
                            color: "var(--ink)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                          aria-label={`Switch to related meeting ${meet.title}`}
                        >
                          <strong>{meet.title}</strong>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            ({meet.shared_count} {meet.shared_count === 1 ? "shared" : "shared"})
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Readable transcript section - clean styled container replacing toggles */}
                {selected.transcript && (
                  <section className="workspace-section">
                    <h3>{t.viewFullTranscript}</h3>
                    <div ref={transcriptRef} className="transcript-container" tabIndex={0} aria-label="Readable meeting transcript content">
                      {selected.transcript}
                    </div>
                  </section>
                )}
              </div>
            </>
          )
        )}
      </main>

      {/* Divider resizer handle for AI chat */}
      {!chatHidden && <div className="resizer" onMouseDown={initChatResize} />}

      {/* Right AI Assistant Panel */}
      <aside className={`workspace-chat ${chatHidden ? "hidden" : ""}`} style={{ width: `${chatWidth}px` }} aria-label="AI Grounded Assistant Panel">
        <div className="chat-header">
          <h3>✦ {t.chatHeader}</h3>
        </div>

        {/* Quick Actions Toolbar */}
        {selected && selected.transcript && (
          <div className="quick-actions-bar">
            <button
              onClick={triggerCreateEmail}
              disabled={chatLoading || emailGenerating}
              className="quick-action-btn"
              aria-label="Generate professional email summary using AI"
            >
              ✉️ {emailGenerating ? t.processingMeeting : t.createEmail}
            </button>
            
            <button
              onClick={copySummaryToClipboard}
              disabled={!selected.summary}
              className="quick-action-btn"
              aria-label="Copy summary text to clipboard"
            >
              📋 {copiedSummary ? t.copied : t.copySummary}
            </button>

            <a
              href={`${API_URL}/meetings/${selected.id}/pdf?lang=${lang}`}
              download={`meeting-${selected.id}.pdf`}
              className="quick-action-btn"
              style={{ textDecoration: "none" }}
              aria-label="Export PDF copy of meeting summary"
            >
              📄 {t.exportPdf}
            </a>

            <button className="quick-action-btn" disabled title="Coming soon: Starred Quiz decks">
              🃏 {t.flashcards}
            </button>
            <button className="quick-action-btn" disabled title="Coming soon: Workspace questions">
              📝 {t.quiz}
            </button>
            <button className="quick-action-btn" disabled title="Coming soon: Concept Study guides">
              📚 {t.studyGuide}
            </button>
          </div>
        )}

        {/* Chat message bubbles scroll window */}
        <div ref={chatHistoryRef} className="chat-history" tabIndex={0} aria-label="AI conversation log history">
          {selected && selected.transcript ? (
            <>
              {chatMessages.length === 0 ? (
                <p className="muted" style={{ margin: "auto", textAlign: "center", maxWidth: "240px", fontSize: "13px" }}>
                  {t.chatPlaceholder}
                </p>
              ) : (
                chatMessages.map((msg, index) => {
                  const isEmailDraft = msg.role === "assistant" && (msg.text.includes("Subject:") || msg.text.includes("Dear") || msg.text.includes("Hi "));
                  return (
                    <div
                      key={index}
                      className={`chat-bubble ${msg.role} ${isEmailDraft ? "email" : ""}`}
                    >
                      {msg.text}
                    </div>
                  );
                })
              )}
              {chatLoading && (
                <div style={{ alignSelf: "flex-start", color: "var(--muted)", fontSize: "13px", fontStyle: "italic", paddingLeft: "6px" }}>
                  {t.processingMeeting}
                </div>
              )}
              {chatError && (
                <div style={{ alignSelf: "flex-start", color: "#a5342f", fontSize: "13px", paddingLeft: "6px" }}>
                  {chatError}
                </div>
              )}
            </>
          ) : (
            <p className="muted" style={{ margin: "auto", textAlign: "center", padding: "20px" }}>
              {t.chatNoTranscript}
            </p>
          )}
        </div>

        {/* Footer containing global chat scope toggle, suggested questions chips, and text input bar */}
        {selected && selected.transcript && (
          <div className="chat-footer">
            {/* Search Across All Recordings Toggle Checkbox */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "6px", borderBottom: "1px solid var(--border)", marginBottom: "4px" }}>
              <input
                id="global-chat-checkbox"
                type="checkbox"
                checked={globalChatEnabled}
                onChange={(e) => setGlobalChatEnabled(e.target.checked)}
                style={{ width: "13px", height: "13px", cursor: "pointer" }}
              />
              <label htmlFor="global-chat-checkbox" style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", cursor: "pointer" }}>
                🌐 {t.searchScopeGlobal}
              </label>
            </div>

            <div className="chat-chips-container">
              {[
                { id: "decisions", label: t.chatChipDecisions },
                { id: "actions", label: t.chatChipActions },
                { id: "topics", label: t.chatChipTopics },
                { id: "who", label: t.chatChipWho },
                { id: "deadlines", label: t.chatChipDeadlines }
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => void sendChatMessage(chip.label)}
                  disabled={chatLoading}
                  className="chat-chip"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="chat-input-row">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void sendChatMessage();
                }}
                placeholder={t.chatPlaceholder}
                disabled={chatLoading}
                aria-label="Type message to AI assistant"
              />
              <button
                onClick={() => void sendChatMessage()}
                disabled={chatLoading || !chatInput.trim()}
                aria-label="Send message to AI assistant"
              >
                {t.chatSend}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
