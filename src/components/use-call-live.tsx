"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "@/lib/supabase/client";
import { statusLabel } from "@/lib/format";
import type { Call, CallScore, CallStatus, Utterance } from "@/lib/types";

type LiveCall = Call & { agents?: { name: string } | null };

const IN_PROGRESS = new Set<CallStatus>(["queued", "transcribing", "analyzing"]);

export function useCallLive(
  initialCall: LiveCall,
  initialScore: CallScore | null,
  initialUtterances: Utterance[] = [],
) {
  const [call, setCall] = useState(initialCall);
  const [utterances, setUtterances] = useState<Utterance[]>(initialUtterances);
  const [score, setScore] = useState(initialScore);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const utteranceCount = useRef(initialUtterances.length);
  utteranceCount.current = utterances.length;

  useEffect(() => {
    setCall(initialCall);
    setScore(initialScore);
    setUtterances(initialUtterances);
    utteranceCount.current = initialUtterances.length;
  }, [initialCall.id]);

  useEffect(() => {
    const supabase = createClient();
    supabase.storage
      .from("call-audio")
      .createSignedUrl(initialCall.audio_path, 3600)
      .then(({ data }) => setAudioUrl(data?.signedUrl || null));

    async function refreshUtterances() {
      const res = await authFetch(`/api/calls/${initialCall.id}`);
      const body = (await res.json().catch(() => ({}))) as { utterances?: Utterance[] };
      if (res.ok && Array.isArray(body.utterances)) {
        utteranceCount.current = body.utterances.length;
        setUtterances(body.utterances);
      }
    }

    async function refresh() {
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
      if (!status || IN_PROGRESS.has(status) || utteranceCount.current === 0) {
        await refreshUtterances();
      }
      return status;
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
        () => void refreshUtterances(),
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
      if (!status || IN_PROGRESS.has(status) || utteranceCount.current === 0) {
        const res = await authFetch(`/api/calls/${call.id}`);
        const body = (await res.json().catch(() => ({}))) as { utterances?: Utterance[] };
        if (!cancelled && res.ok && Array.isArray(body.utterances)) {
          utteranceCount.current = body.utterances.length;
          setUtterances(body.utterances);
        }
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

  return { call, setCall, score, audioUrl, utterances };
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
