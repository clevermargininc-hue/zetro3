"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RefreshCw, Volume2 } from "lucide-react";
import { formatClock } from "@/lib/format";
import { useCallAudioUrlQuery } from "@/features/calls/api/queries";
import type { DashboardCopy } from "@/lib/i18n/dashboard";
import { SkeletonBlock } from "@/components/dashboard/primitives";

type CallAudioPlayerProps = {
  callId: string;
  hasAudio: boolean;
  durationSeconds: number | null;
  seekToSeconds: number | null;
  copy: DashboardCopy["drawer"];
};

const BAR_COUNT = 56;

async function decodeRealWaveformPeaks(url: string, signal: AbortSignal): Promise<number[] | null> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const blockSize = Math.max(1, Math.floor(channelData.length / BAR_COUNT));
      const peaks: number[] = [];
      let maxPeak = 0;

      for (let i = 0; i < BAR_COUNT; i++) {
        const start = i * blockSize;
        const end = Math.min(channelData.length, start + blockSize);
        let peak = 0;
        for (let j = start; j < end; j++) {
          const abs = Math.abs(channelData[j]);
          if (abs > peak) peak = abs;
        }
        peaks.push(peak);
        if (peak > maxPeak) maxPeak = peak;
      }

      if (maxPeak <= 0) return null;
      return peaks.map((p) => Math.max(0.12, Number((p / maxPeak).toFixed(3))));
    } finally {
      await ctx.close().catch(() => undefined);
    }
  } catch {
    return null;
  }
}

export function CallAudioPlayer({
  callId,
  hasAudio,
  durationSeconds,
  seekToSeconds,
  copy,
}: CallAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [decodedWaveform, setDecodedWaveform] = useState<{
    url: string;
    peaks: number[] | null;
  } | null>(null);
  const [expiredUrl, setExpiredUrl] = useState<string | null>(null);

  const audioUrlQuery = useCallAudioUrlQuery(callId, hasAudio);
  const signedUrl = audioUrlQuery.data?.signedUrl ?? null;
  const expiresAt = audioUrlQuery.data?.expiresAt ?? null;
  const peaks = signedUrl && decodedWaveform?.url === signedUrl ? decodedWaveform.peaks : null;
  const decodingWaveform = Boolean(signedUrl && decodedWaveform?.url !== signedUrl);
  const mediaExpired = Boolean(signedUrl && expiredUrl === signedUrl);

  // Decode authentic PCM amplitudes from the signed audio URL (never fake random bars)
  useEffect(() => {
    if (!signedUrl) return;
    const controller = new AbortController();
    void decodeRealWaveformPeaks(signedUrl, controller.signal).then((decoded) => {
      if (!controller.signal.aborted) {
        setDecodedWaveform({ url: signedUrl, peaks: decoded });
      }
    });
    return () => controller.abort();
  }, [signedUrl]);

  // Handle external seek requests from transcript / AI highlights
  useEffect(() => {
    if (seekToSeconds == null || !audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, seekToSeconds);
    void audioRef.current.play().catch(() => undefined);
  }, [seekToSeconds]);

  // Flag expiration proactively if signed URL TTL passes while drawer remains open
  useEffect(() => {
    if (!expiresAt || !signedUrl) return;
    const msLeft = Math.max(0, Date.parse(expiresAt) - Date.now());
    const timer = window.setTimeout(() => setExpiredUrl(signedUrl), msLeft);
    return () => window.clearTimeout(timer);
  }, [expiresAt, signedUrl]);

  if (!hasAudio) {
    return (
      <div className="rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] px-3.5 py-3 text-[12.5px] text-[var(--z-ink-muted)] flex items-center gap-2">
        <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{copy.noAudioAvailable}</span>
      </div>
    );
  }

  if (audioUrlQuery.isPending) {
    return <SkeletonBlock className="h-20 w-full" />;
  }

  if (audioUrlQuery.isError || !signedUrl || mediaExpired) {
    return (
      <div className="rounded-[var(--z-radius-control)] border border-[color-mix(in_srgb,var(--z-warn)_35%,var(--z-border))] bg-[var(--z-warn-tint)] px-3.5 py-3 flex items-center justify-between gap-3 text-[12.5px]">
        <span className="font-medium text-[var(--z-ink)]">
          {mediaExpired ? copy.audioExpired : "Could not load recording stream."}
        </span>
        <button
          type="button"
          onClick={() => {
            setExpiredUrl(null);
            void audioUrlQuery.refetch();
          }}
          className="z-focus inline-flex items-center gap-1.5 rounded-[var(--z-radius-control)] border border-[var(--z-border-strong)] bg-[var(--z-surface)] px-2.5 py-1 text-[12px] font-semibold text-[var(--z-ink)]"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{copy.refreshAudio}</span>
        </button>
      </div>
    );
  }

  const effectiveDuration = Math.max(duration, 1);
  const progressRatio = Math.min(1, Math.max(0, currentTime / effectiveDuration));

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => {
        if (signedUrl) setExpiredUrl(signedUrl);
      });
    } else {
      el.pause();
    }
  }

  function handleScrub(ratio: number) {
    const target = ratio * effectiveDuration;
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
    setCurrentTime(target);
  }

  return (
    <div className="rounded-[var(--z-radius-card)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] p-3.5 space-y-3">
      <audio
        ref={audioRef}
        src={signedUrl}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onSeeked={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => {
          const d = audioRef.current?.duration;
          if (d && Number.isFinite(d)) setDuration(d);
        }}
        onError={() => {
          setPlaying(false);
          if (signedUrl) setExpiredUrl(signedUrl);
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause call audio" : "Play call audio"}
          className="z-focus flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--z-accent)] text-white hover:bg-[var(--z-accent-hover)] transition-colors"
        >
          {playing ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" aria-hidden="true" />
          )}
        </button>

        {/* Real decoded PCM waveform when available; honest progress scrub track otherwise */}
        <div className="flex-1 min-w-0">
          {peaks ? (
            <div
              role="slider"
              tabIndex={0}
              aria-label="Audio waveform seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(effectiveDuration)}
              aria-valuenow={Math.round(currentTime)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.min(
                  1,
                  Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)),
                );
                handleScrub(ratio);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") handleScrub(Math.min(1, progressRatio + 0.05));
                if (e.key === "ArrowLeft") handleScrub(Math.max(0, progressRatio - 0.05));
              }}
              className="z-focus h-10 flex items-center gap-[2px] cursor-pointer rounded"
            >
              {peaks.map((amp, i) => {
                const barRatio = (i + 0.5) / peaks.length;
                const played = barRatio <= progressRatio;
                return (
                  <span
                    key={i}
                    style={{ height: `${Math.round(amp * 100)}%` }}
                    className={`flex-1 rounded-full transition-colors ${
                      played ? "bg-[var(--z-accent)]" : "bg-[var(--z-border-strong)]"
                    }`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              <input
                type="range"
                aria-label="Audio playback progress"
                min={0}
                max={effectiveDuration}
                step={0.5}
                value={currentTime}
                onChange={(e) => handleScrub(Number(e.target.value) / effectiveDuration)}
                className="w-full accent-[var(--z-accent)] cursor-pointer"
              />
              {decodingWaveform ? (
                <div className="text-[11px] text-[var(--z-ink-muted)]">
                  Analyzing real audio waveform…
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="text-[11.5px] font-medium text-[var(--z-ink-secondary)] z-tabular shrink-0">
          {formatClock(currentTime * 1000)} / {formatClock(effectiveDuration * 1000)}
        </div>
      </div>
    </div>
  );
}
