"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "@/lib/supabase/client";
import { formatDate, languageLabel, statusLabel, verdictLabel, auditStatus } from "@/lib/format";
import { AuditActions } from "@/components/audit-actions";
import { scoreChipClass } from "@/components/ui";
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
    <div className="space-y-3">
      {error ? <p className="alert-error mb-4">{error}</p> : null}
      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
        <table className="data-table w-full text-left">
          <thead>
            <tr>
              <th>Call</th>
              <th>Agent</th>
              <th>Language</th>
              {action === "score" ? <th>Score</th> : null}
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
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
              const bucket = auditStatus(call.status);
              return (
                <tr key={call.id}>
                  <td>
                    <Link href={href} className="text-[14px] font-medium text-ink hover:text-blue">
                      {call.title}
                    </Link>
                    <p className="mt-1 text-[12px] text-muted">{formatDate(call.created_at)}</p>
                  </td>
                  <td className="text-[14px] font-medium text-ink">{call.agents?.name || "—"}</td>
                  <td className="text-[13px] text-ink">
                    {languageLabel(call.detected_language || call.language_mode)}
                  </td>
                  {action === "score" ? (
                    <td>
                      {score ? (
                        <span className={`${scoreChipClass(score.overall_score)} tabular-nums`}>
                          {score.overall_score}% · {verdictLabel(score.verdict)}
                          {score.audit_mode ? (
                            <span className="ml-1 text-muted font-normal">
                              {score.audit_mode === "automatic" ? "Auto" : score.audit_mode === "documents" ? "Docs" : ""}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-muted text-[13px]">—</span>
                      )}
                    </td>
                  ) : null}
                  <td>
                    <span
                      className={
                        bucket === "audited"
                          ? "chip chip-ok"
                          : bucket === "failed"
                            ? "chip chip-bad"
                            : bucket === "transcribed"
                              ? "chip"
                              : "chip chip-wait"
                      }
                    >
                      {statusLabel(call.status)}
                    </span>
                    {call.error_message ? (
                      <p className="mt-2 text-[12px] text-rose max-w-[150px] leading-relaxed">{call.error_message}</p>
                    ) : null}
                  </td>
                  <td className="text-right">
                    {action === "transcribe" ? (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void startTranscribe(call)}
                        className={`btn px-5 py-2 text-[13px] ${
                          working
                            ? "bg-surface-2 text-muted border border-line cursor-not-allowed"
                            : "btn-blue"
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
        </div>
        {!calls.length && (
          <div className="px-6 py-16 text-center">
            <p className="text-[15px] font-semibold text-ink">
              {action === "score"
                ? "No prepared calls yet"
                : "No recordings yet"}
            </p>
            <p className="mt-2 text-[13px] text-muted max-w-[250px] mx-auto">
              {action === "score"
                ? "Prepare a call for auditing first."
                : "Upload a recording to begin an audit."}
            </p>
            {action === "score" ? (
              <Link href="/transcribe" className="btn btn-blue mt-6 text-[13px]">
                Go to preparation
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
