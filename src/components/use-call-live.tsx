"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "@/lib/supabase/client";
import { statusLabel } from "@/lib/format";
import type { Call, CallScore, CallStatus } from "@/lib/types";

type LiveCall = Call & { agents?: { name: string } | null };

const IN_PROGRESS = new Set<CallStatus>(["queued", "transcribing", "analyzing"]);

export function useCallLive(
  initialCall: LiveCall,
  initialScore: CallScore | null,
  initialHasTranscript = false,
) {
  const [call, setCall] = useState(initialCall);
  const [hasTranscript, setHasTranscript] = useState(initialHasTranscript);
  const [score, setScore] = useState(initialScore);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const hasTranscriptRef = useRef(initialHasTranscript);
  const [seenCallId, setSeenCallId] = useState(initialCall.id);
  if (seenCallId !== initialCall.id) {
    setSeenCallId(initialCall.id);
    setCall(initialCall);
    setScore(initialScore);
    setHasTranscript(initialHasTranscript);
  }

  useEffect(() => {
    hasTranscriptRef.current = hasTranscript;
  }, [hasTranscript]);

  useEffect(() => {
    const supabase = createClient();
    supabase.storage
      .from("call-audio")
      .createSignedUrl(initialCall.audio_path, 3600)
      .then(({ data }) => setAudioUrl(data?.signedUrl || null))
      .catch(() => setAudioUrl(null));

    async function refreshTranscriptFlag() {
      try {
        const res = await authFetch(`/api/calls/${initialCall.id}`);
        const body = (await res.json().catch(() => ({}))) as {
          has_transcript?: boolean;
          utterance_count?: number;
        };
        if (res.ok) {
          const next =
            typeof body.has_transcript === "boolean"
              ? body.has_transcript
              : (body.utterance_count ?? 0) > 0;
          hasTranscriptRef.current = next;
          setHasTranscript(next);
        }
      } catch {
        // Network blips while polling must not surface as TypeError: fetch failed.
      }
    }

    async function refresh() {
      try {
        const [{ data: sc }, { data: latest }] = await Promise.all([
          supabase
            .from("call_scores")
            .select("*")
            .eq("call_id", initialCall.id)
            .maybeSingle(),
          supabase
            .from("calls")
            .select("*, agents(name)")
            .eq("id", initialCall.id)
            .single(),
        ]);
        setScore((sc as CallScore | null) || null);
        if (latest) setCall(latest as LiveCall);
        const status = latest?.status as CallStatus | undefined;
        if (!status || IN_PROGRESS.has(status) || !hasTranscriptRef.current) {
          await refreshTranscriptFlag();
        }
        return status;
      } catch {
        return undefined;
      }
    }

    const channel = supabase
      .channel(`call-live-${initialCall.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls", filter: `id=eq.${initialCall.id}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_scores",
          filter: `call_id=eq.${initialCall.id}`,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "utterances",
          filter: `call_id=eq.${initialCall.id}`,
        },
        () => void refreshTranscriptFlag(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialCall.id, initialCall.audio_path]);

  useEffect(() => {
    if (!IN_PROGRESS.has(call.status)) return;
    const supabase = createClient();
    let cancelled = false;

    async function tick() {
      try {
        const [{ data: sc }, { data: latest }] = await Promise.all([
          supabase
            .from("call_scores")
            .select("*")
            .eq("call_id", call.id)
            .maybeSingle(),
          supabase.from("calls").select("*, agents(name)").eq("id", call.id).single(),
        ]);
        if (cancelled) return;
        setScore((sc as CallScore | null) || null);
        if (latest) setCall(latest as LiveCall);
        const status = latest?.status as CallStatus | undefined;
        if (!status || IN_PROGRESS.has(status) || !hasTranscriptRef.current) {
          const res = await authFetch(`/api/calls/${call.id}`);
          const body = (await res.json().catch(() => ({}))) as {
            has_transcript?: boolean;
            utterance_count?: number;
          };
          if (!cancelled && res.ok) {
            const next =
              typeof body.has_transcript === "boolean"
                ? body.has_transcript
                : (body.utterance_count ?? 0) > 0;
            hasTranscriptRef.current = next;
            setHasTranscript(next);
          }
        }
      } catch {
        // Ignore transient poll failures.
      }
    }

    const poll = window.setInterval(() => {
      void tick();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [call.id, call.status]);

  return { call, setCall, score, audioUrl, hasTranscript };
}

export function StatusPill({
  status,
  error,
}: {
  status: string;
  error: string | null;
}) {
  return (
    <span className="badge bg-blue-soft text-blue">
      {status === "failed" ? error || "Failed" : statusLabel(status as CallStatus)}
    </span>
  );
}
