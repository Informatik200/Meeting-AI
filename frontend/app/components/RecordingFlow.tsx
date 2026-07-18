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
  autoStart?: boolean;
  onStarted?: () => void;
}

type RecordingState = "idle" | "recording" | "paused" | "processing";

export default function RecordingFlow({
  lang,
  apiUrl,
  onUploadComplete,
  onError,
  autoStart = false,
  onStarted,
}: RecordingFlowProps) {
  const t = (en: string, de: string) => (lang === "de" ? de : en);
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [uploadProgressStep, setUploadProgressStep] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Title and duration of the recording during processing
  const [processingTitle, setProcessingTitle] = useState("");
  const [processingDuration, setProcessingDuration] = useState<number | null>(null);

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
        const timeString = new Date().toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
        setProcessingTitle(`Recording at ${timeString}`);
        setProcessingDuration(elapsedSeconds);
        setState("processing");
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
      setProcessingTitle(f.name);
      setProcessingDuration(null);
      setState("processing");
      void performUpload(f);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setProcessingTitle(f.name);
      setProcessingDuration(null);
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

  // Implement Auto-Start workflow when autoStart is triggered
  useEffect(() => {
    if (autoStart && state === "idle") {
      void startRecording();
      onStarted?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, state]);

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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 text-text-primary">
      {/* IDLE STATE */}
      {state === "idle" && (
        <div className="animate-rise space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{t("New recording", "Neue Aufnahme")}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {t("Record a conversation live, or drop in an audio file.", "Nehmen Sie ein Gespräch live auf oder laden Sie eine Audiodatei hoch.")}
            </p>
          </div>

          {/* Record */}
          <div className="flex flex-col items-center rounded-xl border border-border-subtle bg-surface-card p-10 shadow-soft">
            <button
              onClick={startRecording}
              className="group relative grid h-20 w-20 place-items-center rounded-full bg-accent-lime text-black shadow-glow transition-transform hover:scale-105 cursor-pointer"
              aria-label="Start recording"
            >
              <span className="absolute inset-0 rounded-full bg-accent-lime/20 opacity-0 transition-opacity group-hover:animate-ping group-hover:opacity-100" />
              <Mic className="h-7 w-7 text-black" />
            </button>
            <span className="mt-4 text-[10px] font-bold uppercase tracking-wider text-text-muted">{t("Record", "Aufnehmen")}</span>
          </div>

          {/* Upload dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? "border-accent-lime bg-accent-lime-dim/10" : "border-border-subtle bg-surface-card/40"
            }`}
          >
            <CloudUpload className="mx-auto h-8 w-8 text-text-muted" />
            <p className="mt-3 text-sm text-text-secondary">
              {t("Drag & drop an audio file, or", "Audiodatei hierher ziehen, oder")}{" "}
              <button
                className="rf-upload-trigger-btn font-semibold text-accent-lime hover:underline cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {t("choose a file", "Datei auswählen")}
              </button>
            </p>
            <p className="mt-1 text-xs text-text-muted font-mono">MP3 · WAV · M4A · WEBM · OGG · MP4</p>
            <input ref={fileInputRef} type="file" accept="audio/*,.webm,.mp4" onChange={onFileSelect} className="hidden" />
          </div>

          {uploadError && (
            <p className="rf-error-message rounded-lg bg-rose-950/20 border border-rose-500/20 px-3 py-2 text-sm text-rose-400" role="alert">
              {uploadError}
            </p>
          )}
        </div>
      )}

      {/* RECORDING / PAUSED STATE */}
      {(state === "recording" || state === "paused") && (
        <div className="animate-rise flex flex-col items-center rounded-xl border border-border-subtle bg-surface-card p-10 shadow-soft space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <span className={`h-2 w-2 rounded-full ${state === "recording" ? "bg-rose-500" : "bg-text-muted"}`} style={state === "recording" ? { animation: "pulseDot 1.2s ease-in-out infinite" } : undefined} />
            {state === "recording" ? t("Listening…", "Aufnahme läuft…") : t("Paused", "Pausiert")}
          </div>
          <div className="font-mono text-5xl font-bold tracking-tight text-text-primary">{formatTime(elapsedSeconds)}</div>

          {/* Visualizer */}
          <div className="flex h-12 items-center gap-[3px] w-full max-w-sm justify-center">
            {Array.from({ length: 28 }).map((_, i) => {
              const jitter = Math.sin((i + elapsedSeconds) * 0.7) * 0.3 + 0.7;
              const h = state === "recording" ? Math.max(6, micLevel * jitter * 48) : 6;
              return <span key={i} className={`w-1 rounded-full transition-all ${state === "recording" ? "bg-accent-lime" : "bg-border-strong"}`} style={{ height: `${h}px` }} />;
            })}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={cancelRecording} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-card px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer" aria-label="Cancel recording">
              <X className="h-4 w-4" /> {t("Cancel", "Verwerfen")}
            </button>
            {state === "recording" ? (
              <button onClick={pauseRecording} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-card px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer" aria-label="Pause recording">
                <Pause className="h-4 w-4" /> {t("Pause", "Pause")}
              </button>
            ) : (
              <button onClick={resumeRecording} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-card px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer" aria-label="Resume recording">
                <Play className="h-4 w-4" /> {t("Resume", "Fortsetzen")}
              </button>
            )}
            <button onClick={finishRecording} className="flex items-center gap-2 rounded-lg bg-accent-lime px-4 py-2 text-xs font-semibold text-black hover:bg-opacity-95 transition-colors cursor-pointer" aria-label="Finish recording">
              <Square className="h-4 w-4 fill-current text-black" /> {t("Finish", "Fertig")}
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING STATE */}
      {state === "processing" && (
        <div className="rf-processing-view animate-rise rounded-xl border border-border-subtle bg-surface-card p-8 shadow-soft space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{t("Processing recording", "Aufnahme wird verarbeitet")}</h2>
            <div className="mt-2 text-xs text-text-secondary space-y-1 font-mono">
              <p className="truncate"><span className="text-text-muted">{t("Title: ", "Titel: ")}</span>{processingTitle}</p>
              {processingDuration !== null && (
                <p><span className="text-text-muted">{t("Duration: ", "Dauer: ")}</span>{formatTime(processingDuration)}</p>
              )}
            </div>
          </div>

          {/* Animated Horizontal Progress Bar */}
          <div className="w-full bg-border-subtle h-2 rounded-full overflow-hidden relative">
            <div
              className="bg-accent-lime h-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(10, (uploadProgressStep / steps.length) * 100))}%` }}
            />
          </div>

          <div className="space-y-1">
            {steps.map((step, idx) => {
              const isDone = uploadProgressStep > idx;
              const isActive = uploadProgressStep === idx;
              return (
                <div key={idx} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors duration-300 ${isActive ? "bg-bg-active" : ""}`}>
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-accent-lime scale-110 transition-transform duration-300" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-accent-lime" />
                  ) : (
                    <Circle className="h-4 w-4 flex-shrink-0 text-text-muted" />
                  )}
                  <span className={isDone || isActive ? "font-semibold text-text-primary" : "text-text-muted"}>{lang === "de" ? step.de : step.en}</span>
                </div>
              );
            })}
          </div>

          <span className="animate-pulse text-xs text-text-muted block text-center mt-2">
            {t("Processing continues automatically. Please keep this tab open.", "Die Verarbeitung läuft automatisch weiter. Bitte lassen Sie diesen Tab geöffnet.")}
          </span>

          {uploadError ? (
            <div className="mt-2 pt-2 border-t border-border-subtle">
              <p className="rf-error-message flex items-center gap-2 rounded-lg bg-rose-950/20 border border-rose-500/20 px-3 py-2 text-sm text-rose-400" role="alert">
                <AlertCircle className="h-4 w-4" /> {uploadError}
              </p>
              <button onClick={() => setState("idle")} className="mt-4 rounded-lg border border-border-subtle bg-surface-card px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer">
                {t("Back", "Zurück")}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
