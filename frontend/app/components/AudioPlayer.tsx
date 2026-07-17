"use client";

import { useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  src: string;
  ariaLabel?: string;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({
  src,
  ariaLabel = "Play audio recording",
  audioRef: externalAudioRef,
}: AudioPlayerProps) {
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const audioRef = externalAudioRef || localAudioRef;
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([]);

  // Refs for tracking playback state in global keyboard handler without re-binding
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || audioError) return;
    if (playing) {
      audio.pause();
    } else {
      void audio.play().catch(() => setAudioError(true));
    }
  };

  const seekRelative = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  };

  // Generate waveform from audio dynamically with size-safe decoding limits
  useEffect(() => {
    const generateFallbackWaveform = () => {
      const bars: number[] = [];
      let hash = 0;
      for (let i = 0; i < src.length; i++) {
        hash = src.charCodeAt(i) + ((hash << 5) - hash);
      }
      for (let i = 0; i < 80; i++) {
        const val = Math.abs(Math.sin(hash + i) * 22) + 6;
        bars.push(Math.round(val));
      }
      setWaveform(bars);
    };

    generateFallbackWaveform();

    const AudioContextClass = typeof window !== "undefined"
      ? (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : null;

    if (!AudioContextClass) {
      return;
    }

    const controller = new AbortController();

    const fetchAndDecodeAudio = async () => {
      try {
        // Fetch only headers first to check Content-Length to avoid OOM crash on giant files
        const headRes = await fetch(src, { method: "HEAD", signal: controller.signal }).catch(() => null);
        const contentLength = headRes?.headers.get("Content-Length");
        
        // If content length > 15MB, do not decode. Keep beautiful fallback waveform.
        if (contentLength && parseInt(contentLength, 10) > 15000000) {
          return;
        }

        const res = await fetch(src, { signal: controller.signal });
        const arrayBuffer = await res.arrayBuffer();
        
        const audioCtx = new AudioContextClass();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const step = Math.floor(channelData.length / 80);
        const peaks: number[] = [];
        
        for (let i = 0; i < 80; i++) {
          let maxVal = 0;
          const start = i * step;
          const end = start + step;
          for (let j = start; j < end; j++) {
            if (channelData[j] > maxVal) {
              maxVal = channelData[j];
            }
          }
          const scaled = Math.round(maxVal * 22) + 6;
          peaks.push(scaled);
        }
        
        setWaveform(peaks);
        await audioCtx.close();
      } catch (err) {
        console.warn("Could not generate waveform from file, using fallback:", err);
      }
    };

    void fetchAndDecodeAudio();

    return () => {
      controller.abort();
    };
  }, [src]);

  // Setup event listeners for robust audio lifecycle
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset player state on new source
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);
    setAudioError(false);
    audio.load();

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (isFinite(audio.duration) && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onCanPlay = () => setLoading(false);
    const onWaiting = () => setLoading(true);
    const onError = () => {
      setAudioError(true);
      setLoading(false);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("error", onError);
    };
  }, [src, audioRef]);

  // Refs for tracking handler methods to avoid effect re-binding
  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;

  const seekRelativeRef = useRef(seekRelative);
  seekRelativeRef.current = seekRelative;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.hasAttribute("contenteditable"))
      ) {
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        togglePlayRef.current();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekRelativeRef.current(-10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekRelativeRef.current(10);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const targetTime = parseFloat(e.target.value);
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    audio.volume = val;
    audio.muted = val === 0;
    setMuted(val === 0);
  };

  const handleMuteToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !muted;
    audio.muted = nextMuted;
    setMuted(nextMuted);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rate = parseFloat(e.target.value);
    setPlaybackRate(rate);
    audio.playbackRate = rate;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const filledBars = Math.round((progressPercentage / 100) * waveform.length);

  return (
    <div className="ap-root" aria-label={ariaLabel}>
      {/* Native audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Main Control Panel Row */}
      <div className="ap-main-row">
        {/* Play/Pause */}
        <button
          className="ap-play-btn"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          title={playing ? "Pause (Space)" : "Play (Space)"}
          disabled={audioError}
          style={{ width: "42px", height: "42px" }}
        >
          {loading ? (
            <span className="ap-loading-spinner" />
          ) : playing ? (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1.5" />
              <rect x="9" y="2" width="4" height="12" rx="1.5" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5a.5.5 0 01.765-.424l8 5.5a.5.5 0 010 .848l-8 5.5A.5.5 0 014 13.5v-11z" />
            </svg>
          )}
        </button>

        {/* Scrubber and simulated waveform */}
        <div className="ap-scrubber-container" style={{ flex: 1, position: "relative" }}>
          <div className="ap-waveform-bg">
            {waveform.map((h, i) => (
              <span
                key={i}
                className={`ap-bar ${i < filledBars ? "ap-bar-filled" : ""}`}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          <input
            type="range"
            className="ap-scrubber"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            disabled={loading || audioError || duration === 0}
            aria-label="Audio scrubber"
            style={{ "--progress-pct": `${progressPercentage}%` } as React.CSSProperties}
          />
        </div>

        {/* Time Tracking */}
        <span className="ap-time" aria-live="off">
          {formatTime(currentTime)} <span className="ap-duration">/ {formatTime(duration)}</span>
        </span>

        {/* Playback Speed Rate Selector */}
        <div className="ap-rate-wrapper">
          <select
            className="ap-rate-select"
            value={playbackRate}
            onChange={handleRateChange}
            aria-label="Playback speed"
            title="Playback Speed"
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>

        {/* Mute button */}
        <button
          className="ap-mute-btn"
          onClick={handleMuteToggle}
          aria-label={muted ? "Unmute" : "Mute"}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted || volume === 0 ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.717 3.55A.5.5 0 017 4v8a.5.5 0 01-.812.39L3.825 10.5H2a.5.5 0 01-.5-.5v-4a.5.5 0 01.5-.5h1.825L6.188 3.61a.5.5 0 01.529-.06zM13.354 6.646a.5.5 0 00-.708.708l.707.707-.707.707a.5.5 0 00.708.708L14.06 9.06l.708.708a.5.5 0 00.707-.708L14.768 8.353l.707-.707a.5.5 0 00-.707-.708L14.06 7.646l-.707-.707z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.536 14.01A8.473 8.473 0 0014.5 8a8.473 8.473 0 00-2.964-6.01l-.703.71A7.476 7.476 0 0113.5 8c0 2.09-.84 3.986-2.197 5.375l.703.71zm-2.218-2.218l-.703-.71A5.476 5.476 0 0010.5 8a5.476 5.476 0 00-1.62-3.928l-.657.752A4.48 4.48 0 019.5 8a4.48 4.48 0 01-1.182 3z" />
              <path d="M6.717 3.55A.5.5 0 017 4v8a.5.5 0 01-.812.39L3.825 10.5H2a.5.5 0 01-.5-.5v-4a.5.5 0 01.5-.5h1.825L6.188 3.61a.5.5 0 01.529-.06z" />
            </svg>
          )}
        </button>

        {/* Volume Scrub */}
        <input
          className="ap-volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          aria-label="Volume"
        />

        {/* Download Audio */}
        <a
          className="ap-download-btn"
          href={src}
          download
          title="Download Audio"
          aria-label="Download audio file"
          style={{
            color: "var(--muted)",
            background: "none",
            border: "none",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            transition: "color 0.2s ease"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
      </div>

      {/* Buffering/Error Notices */}
      {audioError && (
        <span className="ap-error-notice" role="alert">
          ⚠️ {lang === "de" ? "Audio-Ladefehler" : "Audio load failed"}
        </span>
      )}
    </div>
  );
}

// Simple lang check mapping
const lang = typeof window !== "undefined" ? localStorage.getItem("meeting-ai-lang") || "en" : "en";
