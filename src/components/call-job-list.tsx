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
}: {
  initialCalls: CallRow[];
  action: "transcribe" | "score";
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
        .eq("user_id", user.id)
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
      {error ? <p className="alert-error">{error}</p> : null}
      <div className="panel overflow-x-auto rounded-xl">
        <table className="data-table">
          <thead>
            <tr>
              <th>Call</th>
              <th>Agent</th>
              <th>Language</th>
              {action === "score" ? <th>Score</th> : null}
              <th>Status</th>
              <th>Process</th>
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
              return (
                <tr key={call.id}>
                  <td>
                    <Link href={href} className="font-medium text-ink hover:text-blue">
                      {call.title}
                    </Link>
                    <p className="text-xs text-muted">{formatDate(call.created_at)}</p>
                  </td>
                  <td className="text-ink">{call.agents?.name || "—"}</td>
                  <td className="text-ink">
                    {languageLabel(call.detected_language || call.language_mode)}
                  </td>
                  {action === "score" ? (
                    <td className="tabular-nums text-ink">
                      {score
                        ? `${score.overall_score} · ${verdictLabel(score.verdict)}${
                            score.audit_mode === "automatic" ? " · auto" : score.audit_mode === "documents" ? " · docs" : ""
                          }`
                        : "—"}
                    </td>
                  ) : null}
                  <td>
                    <span className="badge bg-blue-soft text-blue">{statusLabel(call.status)}</span>
                    {call.error_message ? (
                      <p className="mt-1 text-xs text-rose">{call.error_message}</p>
                    ) : null}
                  </td>
                  <td>
                    {action === "transcribe" ? (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void startTranscribe(call)}
                        className="btn btn-blue"
                      >
                        {working ? "Preparing…" : "Prepare for audit"}
                      </button>
                    ) : (
                      <AuditActions callId={call.id} status={call.status} compact />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!calls.length && (
          <p className="px-5 py-10 text-center text-sm text-muted">
            {action === "score"
              ? "No prepared calls yet. Prepare a call first."
              : "No recordings yet."}
          </p>
        )}
      </div>
    </div>
  );
}
