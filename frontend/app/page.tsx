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

function formatDate(value: string | null) {
  if (!value) return "Processing";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function Home() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function loadMeetings() {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/meetings`);
      if (!response.ok) throw new Error("Could not load meetings.");
      const data: Meeting[] = await response.json();
      setMeetings(data);
      setSelected((current) => data.find((meeting) => meeting.id === current?.id) ?? data[0] ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reach the API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadMeetings(); }, []);

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
      setError("Microphone access was blocked. Allow it in your browser settings, or upload an audio file instead.");
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
      if (!response.ok) throw new Error(payload.detail ?? "Upload failed.");
      setMeetings((current) => [payload, ...current]);
      setSelected(payload);
      setFile(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main>
      <header>
        <a className="brand" href="#top"><span>✦</span> Meeting AI</a>
        <p>Your private meeting memory</p>
      </header>
      <section className="hero" id="top">
        <div>
          <span className="eyebrow">RECORD · TRANSCRIBE · ACT</span>
          <h1>Every meeting,<br /><em>remembered.</em></h1>
          <p className="lede">Capture a conversation, then get a clean summary, decisions, and the next steps — without writing notes.</p>
        </div>
        <div className="capture card">
          <div className={`record-dot ${recording ? "live" : ""}`} />
          <h2>{recording ? "Recording now" : "Ready to capture"}</h2>
          <p>{recording ? "Speak naturally. Stop when the meeting ends." : file ? file.name : "Use your microphone or choose an audio file."}</p>
          <div className="controls">
            <button className={recording ? "stop" : "record"} onClick={() => void toggleRecording()}>
              {recording ? "Stop recording" : "Record meeting"}
            </button>
            <label className="upload">Choose file<input type="file" accept="audio/*,.webm,.mp4" onChange={chooseFile} /></label>
          </div>
          {file && <button className="process" onClick={() => void upload()} disabled={uploading}>{uploading ? "Processing meeting…" : "Transcribe & summarize →"}</button>}
          {error && <p className="error">{error}</p>}
        </div>
      </section>
      <section className="workspace">
        <aside className="meetings card">
          <div className="section-heading"><h2>Recent meetings</h2><button onClick={() => void loadMeetings()} aria-label="Refresh meetings">↻</button></div>
          {loading ? <p className="muted">Loading your meetings…</p> : meetings.length === 0 ? <p className="muted">No meetings yet. Record or upload your first one above.</p> : (
            <div className="meeting-list">{meetings.map((meeting) => <button key={meeting.id} className={selected?.id === meeting.id ? "meeting active" : "meeting"} onClick={() => setSelected(meeting)}><strong>{meeting.title}</strong><span>{formatDate(meeting.created_at)}</span></button>)}</div>
          )}
        </aside>
        <section className="details">
          {!selected ? <div className="empty card"><span>⌁</span><h2>Your meeting notes will appear here.</h2><p>Start a recording to turn talk into momentum.</p></div> : (
            <>
              <div className="details-title"><span className="eyebrow">{formatDate(selected.created_at)}</span><h2>{selected.title}</h2></div>
              <article className="summary card"><h3>Summary</h3><p>{selected.summary || "This meeting is still being processed."}</p></article>
              <div className="grid">
                <article className="card"><h3>Key points</h3><ul>{selected.key_points.map((point, index) => <li key={index}>{point}</li>) || <li>None captured</li>}</ul></article>
                <article className="card"><h3>Decisions</h3><ul>{selected.decisions.map((decision, index) => <li key={index}>{decision}</li>) || <li>None captured</li>}</ul></article>
              </div>
              <article className="card actions"><h3>Action items</h3>{selected.action_items.length ? selected.action_items.map((item, index) => <div className="action" key={index}><span>✓</span><div><strong>{item.task}</strong><p>{[item.owner, item.due].filter(Boolean).join(" · ") || "Owner and due date not specified"}</p></div></div>) : <p className="muted">No action items captured.</p>}</article>
              {selected.transcript && <details className="card transcript"><summary>View full transcript</summary><p>{selected.transcript}</p></details>}
            </>
          )}
        </section>
      </section>
    </main>
  );
}
