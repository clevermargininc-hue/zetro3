"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { statusLabel } from "@/lib/format";
import type { Call, CallScore, CallStatus } from "@/lib/types";

type LiveCall = Call & { agents?: { name: string } | null };

export function useCallLive(
  initialCall: LiveCall,
  initialScore: CallScore | null,
) {
  const [call, setCall] = useState(initialCall);
  // Dummy list: preserves Fast Refresh hook order after transcripts left the UI,
  // and keeps leftover `.length` reads from crashing.
  const [utterances] = useState<unknown[]>([]);
  const [score, setScore] = useState(initialScore);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.storage
      .from("call-audio")
      .createSignedUrl(initialCall.audio_path, 3600)
      .then(({ data }) => setAudioUrl(data?.signedUrl || null));

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
      return latest?.status as CallStatus | undefined;
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
      .subscribe();

    const poll = window.setInterval(() => {
      void refresh();
    }, 3000);

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [initialCall.id, initialCall.audio_path]);

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
