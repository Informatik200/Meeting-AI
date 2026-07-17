"use client";

import { useState, useEffect, useRef } from "react";

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

interface RecordingFlowProps {
  lang: string;
  apiUrl: string;
  onUploadComplete: (meeting: Meeting) => void;
  onError: (msg: string) => void;
}

type RecordingState = "idle" | "recording" | "paused" | "processing";

export default function RecordingFlow({
  lang,
  apiUrl,
  onUploadComplete,
  onError,
}: RecordingFlowProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0); // 0 to 1
  const [uploadProgressStep, setUploadProgressStep] = useState(0);
  const [uploadError, setUploadError] = useState("");

  // References for MediaRecorder and Web Audio API
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  // Progress simulation steps
  const steps = [
    { en: "Upload Audio", de: "Audiodatei hochladen" },
    { en: "Speech Recognition", de: "Spracherkennung" },
    { en: "Generating Summary", de: "Zusammenfassung erstellen" },
    { en: "Extracting Topics", de: "Themen extrahieren" },
    { en: "Building Memory Graph", de: "Gedächtnis-Graph erstellen" },
  ];

  // Format Elapsed Time
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Web Audio microphone volume tracker
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
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Normalize volume to range 0.05 - 1.0
        const norm = Math.max(0.05, Math.min(1.0, average / 120));
        setMicLevel(norm);

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
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    setMicLevel(0);
  };

  // Timer logic
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Recording Controls
  const startRecording = async () => {
    setUploadError("");
    onError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        const recordedFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
          type: audioBlob.type,
        });
        void performUpload(recordedFile);
      };

      recorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setState("recording");
      setElapsedSeconds(0);
      startTimer();
      startVolumeTracker(stream);
    } catch {
      const blockedMsg =
        lang === "de"
          ? "Mikrofonzugriff blockiert. Bitte in Browsereinstellungen erlauben."
          : "Microphone access blocked. Please allow it in browser settings.";
      onError(blockedMsg);
      setUploadError(blockedMsg);
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
      if (streamRef.current) {
        startVolumeTracker(streamRef.current);
      }
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
      recorderRef.current.onstop = null; // Discard blob on stop
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
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Upload trigger (audio file choose or recorded audio finish)
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setState("processing");
      void performUpload(selectedFile);
    }
  };

  // The backend now processes uploads in the background and returns before
  // transcription/summarization finish (status "transcribing"/"summarizing").
  // Poll until it reaches a terminal state. If the response already came
  // back "done"/"failed" (e.g. a mocked or synchronous backend), skip
  // polling entirely and use it as-is.
  const pollMeetingStatus = async (meetingId: number): Promise<Meeting> => {
    const POLL_INTERVAL_MS = 2000;
    const MAX_POLL_ATTEMPTS = 150; // ~5 minute safety cap

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (!isMountedRef.current) {
        throw new Error("cancelled");
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const res = await fetch(`${apiUrl}/meetings/${meetingId}`);
      if (!res.ok) continue;

      const data: Meeting = await res.json();
      if (data.status === "done" || data.status === "failed") {
        return data;
      }
    }

    throw new Error(lang === "de" ? "Verarbeitung dauert zu lange." : "Processing is taking longer than expected.");
  };

  const performUpload = async (audioFile: File) => {
    setUploadProgressStep(0);
    setUploadError("");

    // Simulate timeline progress steps while we wait for the pipeline
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

      const response = await fetch(`${apiUrl}/meetings/upload`, {
        method: "POST",
        body: form,
      });

      const payload = await response.json();

      if (!response.ok) {
        clearInterval(interval);
        throw new Error(payload.detail ?? (lang === "de" ? "Fehler beim Upload" : "Upload failed"));
      }

      const finalMeeting: Meeting =
        payload.status === "done" || payload.status === "failed" ? payload : await pollMeetingStatus(payload.id);

      clearInterval(interval);
      if (!isMountedRef.current) return;

      if (finalMeeting.status === "failed") {
        throw new Error(lang === "de" ? "Verarbeitung fehlgeschlagen." : "Processing failed.");
      }

      // Fast-forward simulation to completion
      setUploadProgressStep(steps.length);
      setTimeout(() => {
        if (!isMountedRef.current) return;
        onUploadComplete(finalMeeting);
        setState("idle");
      }, 500);
    } catch (err: unknown) {
      clearInterval(interval);
      if (!isMountedRef.current) return;
      const errMsg = (err as Error)?.message || (lang === "de" ? "Upload failed" : "Upload failed");
      setUploadError(errMsg);
      onError(errMsg);
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
    <div className="rf-container">
      {/* ── IDLE STATE ── */}
      {state === "idle" && (
        <div className="rf-idle-view">
          <div className="rf-header-area">
            <h1>{lang === "de" ? "Neue Aufnahme" : "New Recording"}</h1>
            <p>
              {lang === "de"
                ? "Nehmen Sie das Gespräch live auf oder wählen Sie eine Audiodatei."
                : "Record your conversation live or choose an audio file."}
            </p>
          </div>

          <div className="rf-mic-trigger-wrapper">
            <button
              className="rf-mic-btn"
              onClick={startRecording}
              aria-label="Start recording"
            >
              <div className="rf-mic-btn-pulse" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                <path d="M19 10a1 1 0 00-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7 7 0 006 6.92V21a1 1 0 102 0v-4.08A7 7 0 0019 10z" />
              </svg>
            </button>
            <span className="rf-mic-label">{lang === "de" ? "Aufnehmen" : "Record"}</span>
          </div>

          <div className="rf-upload-section">
            <button
              className="rf-upload-trigger-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload audio file"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: "6px" }}>
                <path d="M.5 9.9a.5.5 0 01.5.5v3.9a1 1 0 001 1h12a1 1 0 001-1v-3.9a.5.5 0 011 0v3.9a2 2 0 01-2 2H2a2 2 0 01-2-2v-3.9a.5.5 0 01.5-.5z"/>
                <path d="M7.646 1.146a.5.5 0 01.708 0l3 3a.5.5 0 01-.708.708L8.5 2.707V11.5a.5.5 0 01-1 0V2.707L5.354 4.854a.5.5 0 11-.708-.708l3-3z"/>
              </svg>
              {lang === "de" ? "Audiodatei auswählen" : "Choose audio file"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.webm,.mp4"
              onChange={onFileSelect}
              style={{ display: "none" }}
            />
          </div>
          {uploadError && <p className="rf-error-message">{uploadError}</p>}
        </div>
      )}

      {/* ── RECORDING / PAUSED STATE ── */}
      {(state === "recording" || state === "paused") && (
        <div className="rf-recording-view">
          <div className="rf-status-indicator">
            <span className={`rf-status-dot ${state === "recording" ? "pulsing" : ""}`} />
            <span className="rf-status-text">
              {state === "recording"
                ? lang === "de"
                  ? "Aufnahme läuft…"
                  : "Listening…"
                : lang === "de"
                ? "Aufnahme pausiert"
                : "Recording paused"}
            </span>
          </div>

          <div className="rf-timer-display">{formatTime(elapsedSeconds)}</div>

          {/* Animated audio amplitude bars */}
          <div className="rf-live-visualizer">
            {Array.from({ length: 24 }).map((_, idx) => {
              const jitter = Math.sin((idx + elapsedSeconds) * 0.8) * 0.3 + 0.7;
              const heightMultiplier = state === "recording" ? micLevel * jitter : 0.05;
              const height = Math.max(4, Math.round(56 * heightMultiplier));
              return (
                <span
                  key={idx}
                  className="rf-visualizer-bar"
                  style={{
                    height: `${height}px`,
                    backgroundColor: state === "recording" ? "var(--brand)" : "var(--muted)",
                  }}
                />
              );
            })}
          </div>

          <div className="rf-controls-row">
            <button
              className="rf-control-btn rf-btn-cancel"
              onClick={cancelRecording}
              aria-label="Cancel recording"
            >
              {lang === "de" ? "Verwerfen" : "Cancel"}
            </button>

            {state === "recording" ? (
              <button
                className="rf-control-btn rf-btn-pause"
                onClick={pauseRecording}
                aria-label="Pause recording"
              >
                {lang === "de" ? "Pause" : "Pause"}
              </button>
            ) : (
              <button
                className="rf-control-btn rf-btn-resume"
                onClick={resumeRecording}
                aria-label="Resume recording"
              >
                {lang === "de" ? "Fortsetzen" : "Resume"}
              </button>
            )}

            <button
              className="rf-control-btn rf-btn-finish"
              onClick={finishRecording}
              aria-label="Finish recording and save"
            >
              {lang === "de" ? "Fertigstellen" : "Finish"}
            </button>
          </div>
        </div>
      )}

      {/* ── PROCESSING / LOADING STATE ── */}
      {state === "processing" && (
        <div className="rf-processing-view">
          <div className="rf-processing-header">
            <h2>{lang === "de" ? "Aufnahme wird verarbeitet" : "Processing Recording"}</h2>
            <p>
              {lang === "de"
                ? "Wir transkribieren das Gespräch und fassen es zusammen."
                : "We are transcribing the conversation and building summaries."}
            </p>
          </div>

          {/* Timeline checklist */}
          <div className="rf-timeline">
            {steps.map((step, idx) => {
              const isCompleted = uploadProgressStep > idx;
              const isActive = uploadProgressStep === idx;
              return (
                <div
                  key={idx}
                  className={`rf-timeline-item ${isCompleted ? "completed" : ""} ${
                    isActive ? "active" : ""
                  }`}
                >
                  <div className="rf-timeline-icon">
                    {isCompleted ? (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z" />
                      </svg>
                    ) : isActive ? (
                      <span className="rf-timeline-pulse" />
                    ) : (
                      <span className="rf-timeline-dot" />
                    )}
                  </div>
                  <div className="rf-timeline-label">
                    {lang === "de" ? step.de : step.en}
                  </div>
                </div>
              );
            })}
          </div>

          {uploadError ? (
            <div className="rf-processing-error">
              <p className="rf-error-message">{uploadError}</p>
              <button
                className="btn-primary btn-ghost"
                style={{ marginTop: "16px" }}
                onClick={() => setState("idle")}
              >
                {lang === "de" ? "Zurück" : "Back"}
              </button>
            </div>
          ) : (
            <div className="rf-processing-status-spinner">
              <div className="rf-spinner" />
              <span>{lang === "de" ? "Bitte warten…" : "Please wait…"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
