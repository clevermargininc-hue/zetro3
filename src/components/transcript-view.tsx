"use client";

import { useMemo, useRef, useState } from "react";
import { formatClock } from "@/lib/format";
import type { SpeakerRole, Utterance } from "@/lib/types";

type RoleView = "agent" | "customer" | "both";

export function TranscriptView({
  utterances,
  audioUrl,
}: {
  utterances: Utterance[];
  audioUrl?: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [role, setRole] = useState<RoleView>("both");
  const [currentMs, setCurrentMs] = useState(0);

  const resolvedRoles = useMemo(() => {
    const map = new Map<string, SpeakerRole>();

    for (const u of utterances) {
      if (u.role === "agent" || u.role === "customer") {
        map.set(u.speaker_label, u.role);
      }
    }

    const uniqueLabels = [...new Set(utterances.map((u) => u.speaker_label))];
    if (!map.has(uniqueLabels[0]) && uniqueLabels[0]) map.set(uniqueLabels[0], "agent");
    if (!map.has(uniqueLabels[1]) && uniqueLabels[1]) map.set(uniqueLabels[1], "customer");

    return map;
  }, [utterances]);

  const visibleUtterances = useMemo(() => {
    if (role === "both") return utterances;
    return utterances.filter((u) => resolvedRoles.get(u.speaker_label) === role);
  }, [utterances, role, resolvedRoles]);

  const activeId = useMemo(() => {
    let id: string | null = null;
    for (const u of utterances) {
      if ((u.start_ms ?? 0) <= currentMs) id = u.id;
    }
    return id;
  }, [utterances, currentMs]);

  function playFrom(startMs: number | null) {
    const audio = audioRef.current;
    if (!audio || startMs == null) return;
    audio.currentTime = Math.max(0, startMs / 1000);
    void audio.play();
  }

  return (
    <section className="panel rounded-3xl p-6 sm:p-8 shadow-sm">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight text-ink">Speaker script</h2>
          <p className="text-[14px] text-muted mt-1">
            Verbatim transcript. Click a line to hear that moment in the original recording.
          </p>
        </div>

        <div className="flex bg-surface-2 p-1 rounded-full border border-line/50 shadow-inner">
          <button
            type="button"
            onClick={() => setRole("agent")}
            className={`px-5 py-2 rounded-full text-[13px] font-bold tracking-wide transition-all ${
              role === "agent" ? "bg-white text-blue shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            Agent
          </button>
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`px-5 py-2 rounded-full text-[13px] font-bold tracking-wide transition-all ${
              role === "customer" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setRole("both")}
            className={`px-5 py-2 rounded-full text-[13px] font-bold tracking-wide transition-all ${
              role === "both" ? "bg-blue text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            Both
          </button>
        </div>
      </div>

      {audioUrl ? (
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          className="mb-6 w-full"
          onTimeUpdate={(event) => setCurrentMs(event.currentTarget.currentTime * 1000)}
        />
      ) : null}

      {!utterances.length ? (
        <div className="py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-surface-2 mx-auto flex items-center justify-center mb-4 text-2xl opacity-50">
            💬
          </div>
          <p className="text-[15px] font-bold text-ink">No script yet</p>
          <p className="mt-2 text-[14px] text-muted max-w-sm mx-auto">
            Press the transcribe button above to generate the conversation transcript.
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[800px] overflow-y-auto pr-4 custom-scrollbar">
          {visibleUtterances.map((u, i) => {
            const isAgent = resolvedRoles.get(u.speaker_label) === "agent";
            const prev = i > 0 ? visibleUtterances[i - 1] : null;
            const isConsecutive =
              prev && resolvedRoles.get(prev.speaker_label) === resolvedRoles.get(u.speaker_label);
            const isActive = u.id === activeId;

            return (
              <div
                key={u.id}
                className={`flex w-full ${isAgent && role === "both" ? "justify-end" : "justify-start"} ${isConsecutive ? "-mt-4" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => playFrom(u.start_ms)}
                  disabled={!audioUrl}
                  className={`max-w-[85%] sm:max-w-[75%] px-5 py-4 text-left transition-colors ${
                    isAgent
                      ? `bg-gradient-to-br from-blue to-blue-2 text-white shadow-md shadow-blue/20 ${isConsecutive ? "rounded-2xl rounded-tr-md" : "rounded-3xl rounded-tr-sm"}`
                      : `bg-surface-2 text-ink border border-line/40 shadow-sm ${isConsecutive ? "rounded-2xl rounded-tl-md" : "rounded-3xl rounded-tl-sm"}`
                  } ${isActive ? "ring-2 ring-offset-2 ring-blue" : ""} ${audioUrl ? "cursor-pointer hover:opacity-95" : ""}`}
                >
                  {!isConsecutive && (
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${isAgent ? "text-white/90" : "text-muted"}`}
                      >
                        {isAgent ? "Agent" : "Customer"}
                      </span>
                      <span className={`text-[11px] font-medium ${isAgent ? "text-white/60" : "text-muted/60"}`}>
                        {formatClock(u.start_ms)}
                      </span>
                    </div>
                  )}
                  <p className={`text-[15px] leading-relaxed ${isAgent ? "font-medium text-white/95" : "text-ink/90"}`}>
                    {u.text}
                  </p>
                </button>
              </div>
            );
          })}
          {!visibleUtterances.length && (
            <p className="py-12 text-center text-[14px] text-muted italic">
              No lines found for this speaker.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
