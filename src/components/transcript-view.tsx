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
    <section className="surface p-6">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">Transcript</h2>
          <p className="text-[13px] text-muted mt-1">
            Speech-to-text from the recording. Click a line to hear that moment. This is not rewritten by AI.
          </p>
        </div>

        <div className="flex border border-line">
          <button
            type="button"
            onClick={() => setRole("agent")}
            className={`px-3.5 py-1.5 text-[12px] font-medium ${
              role === "agent" ? "bg-blue-soft text-blue" : "text-muted hover:text-ink"
            }`}
          >
            Agent
          </button>
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`px-3.5 py-1.5 text-[12px] font-medium border-x border-line ${
              role === "customer" ? "bg-blue-soft text-blue" : "text-muted hover:text-ink"
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setRole("both")}
            className={`px-3.5 py-1.5 text-[12px] font-medium ${
              role === "both" ? "bg-blue-soft text-blue" : "text-muted hover:text-ink"
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
        <div className="py-16 text-center">
          <p className="text-[15px] font-semibold text-ink">No script yet</p>
          <p className="mt-2 text-[13px] text-muted max-w-sm mx-auto">
            Press Prepare for audit to generate the conversation transcript.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
          {visibleUtterances.map((u) => {
            const isAgent = resolvedRoles.get(u.speaker_label) === "agent";
            const isActive = u.id === activeId;

            return (
              <div key={u.id} className="flex w-full justify-start">
                <button
                  type="button"
                  onClick={() => playFrom(u.start_ms)}
                  disabled={!audioUrl}
                  className={`w-full max-w-3xl px-4 py-3 text-left surface ${
                    isAgent ? "border-l-2 border-blue" : "border-l-2 border-slate-400"
                  } ${isActive ? "bg-blue-soft" : ""} ${audioUrl ? "cursor-pointer hover:bg-slate-50" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                      {isAgent ? "Agent" : "Customer"}
                    </span>
                    <span className="text-[11px] text-muted">{formatClock(u.start_ms)}</span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-ink">{u.text}</p>
                </button>
              </div>
            );
          })}
          {!visibleUtterances.length && (
            <p className="py-12 text-center text-[13px] text-muted">
              No lines found for this speaker.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
