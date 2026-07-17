"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Circle, CloudUpload, Loader2, Mic, Pause, Play, Square, X } from "lucide-react";
import { apiFetch } from "../lib/auth";
import type { Lang, Meeting } from "../lib/types";

interface RecordingFlowProps {
  lang: Lang;
  apiUrl: string;
  onUploadComplete: (meeting: Meeting) => void;
  onError: (msg: string) => void;
}

type RecordingState = "idle" | "recording" | "paused" | "processing";

export default function RecordingFlow({ lang, apiUrl, onUploadComplete, onError }: RecordingFlowProps) {
  const t = (en: string, de: string) => (lang === "de" ? de : en);
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [uploadProgressStep, setUploadProgressStep] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  const steps = [
    { en: "Uploading audio", de: "Audiodatei hochladen" },
    { en: "Speech recognition", de: "Spracherkennung" },
    { en: "Generating summary", de: "Zusammenfassung erstellen" },
    { en: "Extracting topics", de: "Themen extrahieren" },
    { en: "Building memory graph", de: "Gedächtnis-Graph erstellen" },
  ];

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const startVolumeTracker = (stream: MediaStream) => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        setMicLevel(Math.max(0.05, Math.min(1, sum / bufferLength / 120)));
        animationRef.current = requestAnimationFrame(checkVolume);
      };
      animationRef.current = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.warn("Could not start volume tracker", e);
    }
  };

  const stopVolumeTracker = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") void audioContextRef.current.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    setMicLevel(0);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsedSeconds((p) => p + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    setUploadError("");
    onError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        const recordedFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: audioBlob.type });
        void performUpload(recordedFile);
      };
      recorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setState("recording");
      setElapsedSeconds(0);
      startTimer();
      startVolumeTracker(stream);
    } catch {
      const msg = t("Microphone access blocked. Please allow it in browser settings.", "Mikrofonzugriff blockiert. Bitte in Browsereinstellungen erlauben.");
      onError(msg);
      setUploadError(msg);
    }
  };

  const pauseRecording = () => {
    if (recorderRef.current && state === "recording") {
      recorderRef.current.pause();
      setState("paused");
      stopTimer();
      stopVolumeTracker();
    }
  };
  const resumeRecording = () => {
    if (recorderRef.current && state === "paused") {
      recorderRef.current.resume();
      setState("recording");
      startTimer();
      if (streamRef.current) startVolumeTracker(streamRef.current);
    }
  };
  const finishRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      cleanupMediaStream();
      stopTimer();
      stopVolumeTracker();
      setState("processing");
    }
  };
  const cancelRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    cleanupMediaStream();
    stopTimer();
    stopVolumeTracker();
    setElapsedSeconds(0);
    setState("idle");
  };
  const cleanupMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setState("processing");
      void performUpload(f);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setState("processing");
      void performUpload(f);
    }
  };

  const pollMeetingStatus = async (meetingId: number): Promise<Meeting> => {
    const POLL_INTERVAL_MS = 2000;
    const MAX_POLL_ATTEMPTS = 150;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (!isMountedRef.current) throw new Error("cancelled");
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const res = await apiFetch(`${apiUrl}/meetings/${meetingId}`);
      if (!res.ok) continue;
      const data: Meeting = await res.json();
      if (data.status === "done" || data.status === "failed") return data;
    }
    throw new Error(t("Processing is taking longer than expected.", "Verarbeitung dauert zu lange."));
  };

  const performUpload = async (audioFile: File) => {
    setUploadProgressStep(0);
    setUploadError("");
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep += 1;
        setUploadProgressStep(currentStep);
      }
    }, 2500);
    try {
      const form = new FormData();
      form.append("file", audioFile);
      const response = await apiFetch(`${apiUrl}/meetings/upload`, { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) {
        clearInterval(interval);
        throw new Error(payload.detail ?? t("Upload failed", "Fehler beim Upload"));
      }
      const finalMeeting: Meeting =
        payload.status === "done" || payload.status === "failed" ? payload : await pollMeetingStatus(payload.id);
      clearInterval(interval);
      if (!isMountedRef.current) return;
      if (finalMeeting.status === "failed") throw new Error(t("Processing failed.", "Verarbeitung fehlgeschlagen."));
      setUploadProgressStep(steps.length);
      setTimeout(() => {
        if (!isMountedRef.current) return;
        onUploadComplete(finalMeeting);
        setState("idle");
      }, 500);
    } catch (err: unknown) {
      clearInterval(interval);
      if (!isMountedRef.current) return;
      const msg = (err as Error)?.message || t("Upload failed", "Upload failed");
      setUploadError(msg);
      onError(msg);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupMediaStream();
      stopTimer();
      stopVolumeTracker();
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
      {/* IDLE */}
      {state === "idle" && (
        <div className="animate-rise">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t("New recording", "Neue Aufnahme")}</h1>
          <p className="mt-1 text-slate-500">
            {t("Record a conversation live, or drop in an audio file.", "Nehmen Sie ein Gespräch live auf oder laden Sie eine Audiodatei hoch.")}
          </p>

          {/* Record */}
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-10 shadow-soft">
            <button
              onClick={startRecording}
              className="group relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-purple-500 text-white shadow-glow transition-transform hover:scale-105"
              aria-label="Start recording"
            >
              <span className="absolute inset-0 rounded-full bg-brand-400/40 opacity-0 transition-opacity group-hover:animate-ping group-hover:opacity-100" />
              <Mic className="h-8 w-8" />
            </button>
            <span className="mt-4 text-sm font-semibold uppercase tracking-wider text-slate-400">{t("Record", "Aufnehmen")}</span>
          </div>

          {/* Upload dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`mt-4 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-white/50"
            }`}
          >
            <CloudUpload className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm text-slate-500">
              {t("Drag & drop an audio file, or", "Audiodatei hierher ziehen, oder")}{" "}
              <button
                className="rf-upload-trigger-btn font-medium text-brand-600 hover:text-brand-700"
                onClick={() => fileInputRef.current?.click()}
              >
                {t("choose a file", "Datei auswählen")}
              </button>
            </p>
            <p className="mt-1 text-xs text-slate-400">MP3 · WAV · M4A · WEBM · OGG · MP4</p>
            <input ref={fileInputRef} type="file" accept="audio/*,.webm,.mp4" onChange={onFileSelect} className="hidden" />
          </div>

          {uploadError && (
            <p className="rf-error-message mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
              {uploadError}
            </p>
          )}
        </div>
      )}

      {/* RECORDING / PAUSED */}
      {(state === "recording" || state === "paused") && (
        <div className="animate-rise flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-10 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className={`h-2.5 w-2.5 rounded-full ${state === "recording" ? "bg-rose-500" : "bg-slate-300"}`} style={state === "recording" ? { animation: "pulseDot 1.2s ease-in-out infinite" } : undefined} />
            {state === "recording" ? t("Listening…", "Aufnahme läuft…") : t("Paused", "Pausiert")}
          </div>
          <div className="mt-4 font-mono text-5xl font-bold tracking-tight text-slate-900">{formatTime(elapsedSeconds)}</div>

          {/* Visualizer */}
          <div className="mt-6 flex h-16 items-center gap-1">
            {Array.from({ length: 28 }).map((_, i) => {
              const jitter = Math.sin((i + elapsedSeconds) * 0.7) * 0.3 + 0.7;
              const h = state === "recording" ? Math.max(6, micLevel * jitter * 60) : 6;
              return <span key={i} className={`w-1.5 rounded-full ${state === "recording" ? "bg-brand-500" : "bg-slate-200"}`} style={{ height: `${h}px` }} />;
            })}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button onClick={cancelRecording} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50" aria-label="Cancel recording">
              <X className="h-4 w-4" /> {t("Cancel", "Verwerfen")}
            </button>
            {state === "recording" ? (
              <button onClick={pauseRecording} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50" aria-label="Pause recording">
                <Pause className="h-4 w-4" /> {t("Pause", "Pause")}
              </button>
            ) : (
              <button onClick={resumeRecording} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50" aria-label="Resume recording">
                <Play className="h-4 w-4" /> {t("Resume", "Fortsetzen")}
              </button>
            )}
            <button onClick={finishRecording} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 hover:bg-brand-700" aria-label="Finish recording">
              <Square className="h-4 w-4 fill-current" /> {t("Finish", "Fertig")}
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING */}
      {state === "processing" && (
        <div className="rf-processing-view animate-rise rounded-2xl border border-slate-100 bg-white p-8 shadow-soft">
          <h2 className="text-xl font-bold text-slate-900">{t("Processing recording", "Aufnahme wird verarbeitet")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("We're transcribing and summarizing your conversation.", "Wir transkribieren und fassen Ihr Gespräch zusammen.")}
          </p>

          <div className="mt-6 space-y-1">
            {steps.map((step, idx) => {
              const isDone = uploadProgressStep > idx;
              const isActive = uploadProgressStep === idx;
              return (
                <div key={idx} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-brand-50" : ""}`}>
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-brand-500" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-brand-500" />
                  ) : (
                    <Circle className="h-5 w-5 flex-shrink-0 text-slate-300" />
                  )}
                  <span className={isDone || isActive ? "font-medium text-slate-800" : "text-slate-400"}>{lang === "de" ? step.de : step.en}</span>
                </div>
              );
            })}
          </div>

          {uploadError ? (
            <div className="mt-4">
              <p className="rf-error-message flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
                <AlertCircle className="h-4 w-4" /> {uploadError}
              </p>
              <button onClick={() => setState("idle")} className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                {t("Back", "Zurück")}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">{t("Please wait…", "Bitte warten…")}</p>
          )}
        </div>
      )}
    </div>
  );
}
