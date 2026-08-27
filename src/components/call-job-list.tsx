"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "@/lib/supabase/client";
import { formatDate, languageLabel, statusLabel, verdictLabel } from "@/lib/format";
import { AuditActions } from "@/components/audit-actions";
import type { Call, CallScore, CallStatus } from "@/lib/types";

export type CallRow = Call & {
  agents?: { name: string } | null;
  call_scores?: CallScore[] | CallScore | null;
};

function scoreOf(call: CallRow) {
  return Array.isArray(call.call_scores) ? call.call_scores[0] : call.call_scores;
}

export function CallJobList({
  initialCalls,
  action,
  teamScope,
}: {
  initialCalls: CallRow[];
  action: "transcribe" | "score";
  teamScope: string[];
}) {
  const router = useRouter();
  const [calls, setCalls] = useState(initialCalls);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("calls")
        .select("*, agents(name), call_scores(overall_score, verdict, audit_mode)")
        .in("user_id", teamScope)
        .order("created_at", { ascending: false });
      if (!data) return;
      const rows = data as CallRow[];
      setCalls(
        action === "score"
          ? rows.filter((call) =>
              ["transcribed", "analyzing", "completed"].includes(call.status),
            )
          : rows,
      );
    }

    const poll = window.setInterval(() => {
      void refresh();
    }, 2500);

    const channel = supabase
      .channel(`call-jobs-${action}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [action]);

  async function startTranscribe(call: CallRow) {
    setError(null);
    setPendingId(call.id);
    setCalls((rows) =>
      rows.map((row) =>
        row.id === call.id
          ? {
              ...row,
              status: "transcribing" as CallStatus,
              error_message: null,
            }
          : row,
      ),
    );
    try {
      const res = await authFetch(`/api/calls/${call.id}/transcribe`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not transcribe");
      router.push(`/calls/${call.id}/transcribe`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {error ? <p className="alert-error mb-4 shadow-sm rounded-lg">{error}</p> : null}
      <div className="panel overflow-x-auto rounded-3xl shadow-sm border border-line/40">
        <table className="data-table w-full text-left">
          <thead className="bg-surface/50 text-[12px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-6 py-5 font-bold">Call</th>
              <th className="px-6 py-5 font-bold">Agent</th>
              <th className="px-6 py-5 font-bold">Language</th>
              {action === "score" ? <th className="px-6 py-5 font-bold">Score</th> : null}
              <th className="px-6 py-5 font-bold">Status</th>
              <th className="px-6 py-5 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {calls.map((call) => {
              const score = scoreOf(call);
              const href =
                action === "transcribe"
                  ? `/calls/${call.id}/transcribe`
                  : `/calls/${call.id}/score`;
              const working =
                pendingId === call.id ||
                (action === "transcribe"
                  ? call.status === "transcribing"
                  : call.status === "analyzing");
              return (
                <tr key={call.id} className="hover:bg-surface-2/30 transition-colors group">
                  <td className="px-6 py-5">
                    <Link href={href} className="text-[14px] font-bold text-ink group-hover:text-blue transition-colors">
                      {call.title}
                    </Link>
                    <p className="mt-1 text-[12px] font-medium text-muted">{formatDate(call.created_at)}</p>
                  </td>
                  <td className="px-6 py-5 text-[14px] font-medium text-ink">{call.agents?.name || "—"}</td>
                  <td className="px-6 py-5 text-[13px] font-medium text-ink">
                    {languageLabel(call.detected_language || call.language_mode)}
                  </td>
                  {action === "score" ? (
                    <td className="px-6 py-5">
                      {score ? (
                        <span className={`font-bold tabular-nums ${score.overall_score >= 80 ? 'text-good' : score.overall_score >= 60 ? 'text-warn' : 'text-rose'}`}>
                          {score.overall_score} <span className="opacity-40 text-ink mx-1">|</span> <span className="capitalize">{verdictLabel(score.verdict)}</span>
                          <span className="block mt-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
                            {score.audit_mode === "automatic" ? "Auto" : score.audit_mode === "documents" ? "Docs" : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted text-[13px] font-bold">—</span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-6 py-5">
                    <span className="badge border shadow-sm bg-blue-soft text-blue border-blue/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                      {statusLabel(call.status)}
                    </span>
                    {call.error_message ? (
                      <p className="mt-2 text-[12px] font-medium text-rose max-w-[150px] leading-relaxed">{call.error_message}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-5 text-right">
                    {action === "transcribe" ? (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void startTranscribe(call)}
                        className={`btn px-5 py-2 text-[13px] rounded-lg shadow-sm transition-all ${
                          working 
                            ? "bg-surface-2 text-muted border border-line cursor-not-allowed" 
                            : "btn-blue shadow-blue/20 hover:-translate-y-0.5 active:translate-y-0"
                        }`}
                      >
                        {working ? "Preparing…" : "Prepare for audit"}
                      </button>
                    ) : (
                      <div className="flex justify-end">
                        <AuditActions callId={call.id} status={call.status} compact />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!calls.length && (
          <div className="px-6 py-20 text-center bg-surface/30">
            <div className="h-16 w-16 rounded-full bg-surface-2 mx-auto flex items-center justify-center mb-5 shadow-inner">
              <span className="text-2xl opacity-50">{action === "score" ? "📊" : "🎙️"}</span>
            </div>
            <p className="text-[16px] font-bold tracking-tight text-ink">
              {action === "score"
                ? "No prepared calls yet"
                : "No recordings yet"}
            </p>
            <p className="mt-2 text-[14px] text-muted max-w-[250px] mx-auto">
              {action === "score"
                ? "Go to the Transcribe page to prepare a call for auditing first."
                : "Upload a recording to begin transcribing."}
            </p>
            {action === "score" ? (
              <Link href="/transcribe" className="btn btn-blue mt-6 text-[13px] shadow-md shadow-blue/20">
                Go to preparation
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
