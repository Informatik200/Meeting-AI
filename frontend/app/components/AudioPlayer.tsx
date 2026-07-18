"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  ariaLabel?: string;
}

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const BAR_COUNT = 64;
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function AudioPlayer({ src, ariaLabel = "Play audio recording" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loading, setLoading] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || audioError) return;
    if (playing) audio.pause();
    else void audio.play().catch(() => setAudioError(true));
  };

  const seekRelative = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  };

  // Waveform: deterministic fallback, upgraded to a real decode when small enough.
  useEffect(() => {
    const fallback = () => {
      const bars: number[] = [];
      let hash = 0;
      for (let i = 0; i < src.length; i++) hash = src.charCodeAt(i) + ((hash << 5) - hash);
      for (let i = 0; i < BAR_COUNT; i++) bars.push(Math.abs(Math.sin(hash + i * 1.3)) * 0.7 + 0.25);
      setWaveform(bars);
    };
    fallback();

    const AudioCtx =
      typeof window !== "undefined"
        ? window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : null;
    if (!AudioCtx) return;
    const controller = new AbortController();

    (async () => {
      try {
        const head = await fetch(src, { method: "HEAD", signal: controller.signal }).catch(() => null);
        const len = head?.headers.get("Content-Length");
        if (len && parseInt(len, 10) > 15_000_000) return;
        const res = await fetch(src, { signal: controller.signal });
        const buf = await res.arrayBuffer();
        const ctx = new AudioCtx();
        const decoded = await ctx.decodeAudioData(buf);
        const data = decoded.getChannelData(0);
        const step = Math.floor(data.length / BAR_COUNT);
        const peaks: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          let max = 0;
          for (let j = i * step; j < (i + 1) * step; j++) if (data[j] > max) max = data[j];
          peaks.push(Math.min(1, max * 1.6) * 0.85 + 0.15);
        }
        setWaveform(peaks);
        await ctx.close();
      } catch {
        /* keep fallback */
      }
    })();

    return () => controller.abort();
  }, [src]);

  // Audio element lifecycle
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);
    setAudioError(false);
    audio.load();

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => {
      if (isFinite(audio.duration) && !isNaN(audio.duration)) setDuration(audio.duration);
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
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDur);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDur);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  // Keyboard shortcuts (ignored while typing in a field)
  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;
  const seekRef = useRef(seekRelative);
  seekRef.current = seekRelative;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = document.activeElement;
      if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.hasAttribute("contenteditable"))) return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlayRef.current();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekRef.current(-10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekRef.current(10);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const seekToBar = (index: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const target = (index / BAR_COUNT) * audio.duration;
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const filledBars = Math.round(progress * BAR_COUNT);

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(playbackRate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-soft text-text-primary" aria-label={ariaLabel}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={audioError}
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-accent-lime text-black shadow-glow transition-transform hover:scale-105 cursor-pointer disabled:opacity-50"
          aria-label={playing ? "Pause" : "Play"}
          title={playing ? "Pause (Space)" : "Play (Space)"}
        >
          {loading ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : playing ? (
            <Pause className="h-4.5 w-4.5 fill-current" />
          ) : (
            <Play className="h-4.5 w-4.5 translate-x-0.5 fill-current" />
          )}
        </button>

        {/* Waveform */}
        <div className="flex h-10 min-w-0 flex-1 items-center gap-[2px]" role="slider" aria-label="Audio scrubber" aria-valuenow={Math.round(currentTime)} aria-valuemax={Math.round(duration)}>
          {waveform.map((h, i) => (
            <button
              key={i}
              onClick={() => seekToBar(i)}
              className="group flex h-full flex-1 items-center cursor-pointer"
              tabIndex={-1}
              aria-hidden="true"
            >
              <span
                className={`w-full rounded-full transition-colors ${
                  i < filledBars ? "bg-accent-lime" : "bg-border-strong group-hover:bg-text-muted"
                }`}
                style={{ height: `${Math.max(8, h * 100)}%` }}
              />
            </button>
          ))}
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <button
            onClick={cycleSpeed}
            className="rounded border border-border-subtle px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Playback speed"
          >
            {playbackRate}x
          </button>
          <span className="font-mono text-[10px] text-text-muted">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {audioError && (
        <p className="mt-2 text-xs text-rose-400" role="alert">
          ⚠︎ Audio failed to load
        </p>
      )}
    </div>
  );
}
