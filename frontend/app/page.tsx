"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type ActionItem = { task: string; owner: string | null; due: string | null };
type Meeting = {
  id: number;
  title: string;
  status: string;
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
    noMeetingsYet: "No meetings yet. Record or upload your first one above.",
    emptyStateTitle: "Your meeting notes will appear here.",
    emptyStateDesc: "Start a recording to turn talk into momentum.",
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
    emptyStateDesc: "Starten Sie eine Aufnahme, um Gespräche in Taten umzusetzen.",
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
    uploadFailed: "Upload fehlgeschlagen.",
    exportPdf: "PDF exportieren",
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
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  // Load settings on mount to avoid Next.js hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("meeting-ai-lang");
    if (saved === "en" || saved === "de") {
      setLang(saved);
    }
  }, []);

  function changeLanguage(newLang: "en" | "de") {
    setLang(newLang);
    localStorage.setItem("meeting-ai-lang", newLang);
  }

  const t = translations[lang];

  async function loadMeetings() {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/meetings`);
      if (!response.ok) throw new Error(t.loadMeetingsError);
      const data: Meeting[] = await response.json();
      setMeetings(data);
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  return (
    <main>
      <header>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <a className="brand" href="#top"><span>✦</span> Meeting AI</a>
          <p style={{ margin: 0 }}>{t.tagline}</p>
        </div>
        <div className="language-selector">
          <select
            value={lang}
            onChange={(e) => changeLanguage(e.target.value as "en" | "de")}
            aria-label="Select language"
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              background: "var(--card)",
              color: "var(--ink)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
      </header>
      <section className="hero" id="top">
        <div>
          <span className="eyebrow">{t.eyebrow}</span>
          <h1>{t.headingNormal}<br /><em>{t.headingEm}</em></h1>
          <p className="lede">{t.lede}</p>
        </div>
        <div className="capture card">
          <div className={`record-dot ${recording ? "live" : ""}`} />
          <h2>{recording ? t.recordingNow : t.readyToCapture}</h2>
          <p>{recording ? t.recordingDesc : file ? file.name : t.readyDesc}</p>
          <div className="controls">
            <button className={recording ? "stop" : "record"} onClick={() => void toggleRecording()}>
              {recording ? t.stopRecording : t.recordMeeting}
            </button>
            <label className="upload">{t.chooseFile}<input type="file" accept="audio/*,.webm,.mp4" onChange={chooseFile} /></label>
          </div>
          {file && <button className="process" onClick={() => void upload()} disabled={uploading}>{uploading ? t.processingMeeting : t.transcribeSummarize}</button>}
          {error && <p className="error">{error}</p>}
        </div>
      </section>
      <section className="workspace">
        <aside className="meetings card">
          <div className="section-heading"><h2>{t.recentMeetings}</h2><button onClick={() => void loadMeetings()} aria-label="Refresh meetings">↻</button></div>
          {loading ? <p className="muted">{t.loadingMeetings}</p> : meetings.length === 0 ? <p className="muted">{t.noMeetingsYet}</p> : (
            <div className="meeting-list">{meetings.map((meeting) => <button key={meeting.id} className={selected?.id === meeting.id ? "meeting active" : "meeting"} onClick={() => setSelected(meeting)}><strong>{meeting.title}</strong><span>{formatDate(meeting.created_at, lang)}</span></button>)}</div>
          )}
        </aside>
        <section className="details">
          {!selected ? <div className="empty card"><span>⌁</span><h2>{t.emptyStateTitle}</h2><p>{t.emptyStateDesc}</p></div> : (
            <>
              <div className="details-title">
                <span className="eyebrow">{formatDate(selected.created_at, lang)}</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" }}>
                  <h2 style={{ margin: 0 }}>{selected.title}</h2>
                  {selected.status !== "transcribing" && selected.status !== "summarizing" && (
                    <a
                      href={`${API_URL}/meetings/${selected.id}/pdf?lang=${lang}`}
                      download={`meeting-${selected.id}.pdf`}
                      className="process"
                      style={{
                        width: "auto",
                        marginTop: 0,
                        textDecoration: "none",
                        display: "inline-block",
                        fontSize: "14px",
                        padding: "8px 16px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.exportPdf}
                    </a>
                  )}
                </div>
              </div>
              <article className="summary card">
                <h3>{t.summary}</h3>
                <p>
                  {selected.status === "failed"
                    ? t.processingFailed
                    : selected.summary || t.processingStatus}
                </p>
              </article>
              <div className="grid">
                <article className="card">
                  <h3>{t.keyPoints}</h3>
                  <ul>
                    {selected.key_points.length > 0 ? (
                      selected.key_points.map((point, index) => <li key={index}>{point}</li>)
                    ) : (
                      <li>{t.noneCaptured}</li>
                    )}
                  </ul>
                </article>
                <article className="card">
                  <h3>{t.decisions}</h3>
                  <ul>
                    {selected.decisions.length > 0 ? (
                      selected.decisions.map((decision, index) => <li key={index}>{decision}</li>)
                    ) : (
                      <li>{t.noneCaptured}</li>
                    )}
                  </ul>
                </article>
              </div>
              <article className="card actions">
                <h3>{t.actionItems}</h3>
                {selected.action_items.length ? (
                  selected.action_items.map((item, index) => (
                    <div className="action" key={index}>
                      <span>✓</span>
                      <div>
                        <strong>{item.task}</strong>
                        <p>{[item.owner, item.due].filter(Boolean).join(" · ") || t.ownerDueNotSpecified}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">{t.noActionItems}</p>
                )}
              </article>
              {selected.transcript && <details className="card transcript"><summary>{t.viewFullTranscript}</summary><p>{selected.transcript}</p></details>}
            </>
          )}
        </section>
      </section>
    </main>
  );
}

