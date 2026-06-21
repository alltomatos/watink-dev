import React, { useRef, useEffect, useState, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

const LS_RATE = "audioMessageRate";

interface AudioProps {
  url: string;
  mimetype?: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const RATES: number[] = [1, 1.5, 2, 0.5];

const Audio: React.FC<AudioProps> = ({ url, mimetype }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rateIdx, setRateIdx] = useState(() => {
    const saved = parseFloat(localStorage.getItem(LS_RATE) ?? "1");
    return RATES.indexOf(saved) !== -1 ? RATES.indexOf(saved) : 0;
  });

  const rate = RATES[rateIdx];
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = rate;
    localStorage.setItem(LS_RATE, String(rate));
  }, [rate]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onDurationChange = () => setDuration(el.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("loadedmetadata", onDurationChange);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("loadedmetadata", onDurationChange);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play().catch(() => {});
  }, [playing]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    const bar = progressRef.current;
    if (!el || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
  }, [duration]);

  const cycleRate = useCallback(() => {
    setRateIdx((i) => (i + 1) % RATES.length);
  }, []);

  const resolvedMime = mimetype ?? "audio/ogg";

  return (
    <div className="flex items-center gap-2 w-full max-w-[280px] py-1">
      <audio ref={audioRef} preload="metadata">
        <source src={url} type={resolvedMime} />
        <source src={url} />
      </audio>

      <button
        onClick={togglePlay}
        className={cn(
          "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full",
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
          "hover:opacity-90 transition-opacity"
        )}
        aria-label={playing ? "Pausar" : "Reproduzir"}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>

      <div className="flex flex-col flex-1 min-w-0 gap-1">
        <div
          ref={progressRef}
          onClick={handleSeek}
          className="relative h-1.5 rounded-full bg-[hsl(var(--muted))] cursor-pointer group"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[hsl(var(--primary))] transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[hsl(var(--primary))] shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={cycleRate}
        className="flex-shrink-0 h-6 px-1.5 text-[10px] font-medium"
        aria-label={`Velocidade ${rate}x`}
      >
        {rate}x
      </Button>
    </div>
  );
};

Audio.displayName = "Audio";

export default Audio;
