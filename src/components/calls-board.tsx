"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DeleteCallButton } from "@/components/delete-call-button";
import { auditLabel, auditStatus, formatDate, languageLabel, verdictLabel } from "@/lib/format";
import type { AuditStatus } from "@/lib/format";
import type { Call, CallScore, CallStatus } from "@/lib/types";

type CallRow = Call & {
  agents?: { name: string } | null;
  call_scores?: CallScore[] | CallScore | null;
};

type Filter = "all" | AuditStatus;

function scoreOf(call: CallRow) {
  return Array.isArray(call.call_scores) ? call.call_scores[0] : call.call_scores;
}

export function CallsBoard({ initialCalls }: { initialCalls: CallRow[] }) {
  const [calls, setCalls] = useState(initialCalls);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("calls")
        .select("*, agents(name), call_scores(overall_score, verdict)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setCalls(data as CallRow[]);
    }

    const poll = window.setInterval(() => {
      void refresh();
    }, 2500);

    const channel = supabase
      .channel("all-calls")
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
  }, []);

  const counts = useMemo(() => {
    const next = { processing: 0, transcribed: 0, audited: 0, failed: 0 };
    for (const call of calls) next[auditStatus(call.status)] += 1;
    return next;
  }, [calls]);

  const visible = filter === "all" ? calls : calls.filter((call) => auditStatus(call.status) === filter);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Processing" value={counts.processing} />
        <Stat label="Transcribed" value={counts.transcribed} />
        <Stat label="Scored / Audited" value={counts.audited} />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {(
          [
            ["all", `All (${calls.length})`],
            ["processing", `Processing (${counts.processing})`],
            ["transcribed", `Transcribed (${counts.transcribed})`],
            ["audited", `Scored / Audited (${counts.audited})`],
            ["failed", `Failed (${counts.failed})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`btn rounded-full px-4 text-[13px] font-bold tracking-wide transition-all ${
              filter === id 
                ? "bg-blue text-white shadow-md shadow-blue/20 hover:-translate-y-0.5" 
                : "bg-surface-2 text-muted hover:bg-line/40 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="panel overflow-x-auto rounded-3xl shadow-sm">
        <table className="data-table w-full text-left">
          <thead className="bg-surface/50 text-[12px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-6 py-4 font-bold">Call</th>
              <th className="px-6 py-4 font-bold">Agent</th>
              <th className="px-6 py-4 font-bold">Language</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold">Score</th>
              <th className="px-6 py-4 font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {visible.map((call) => {
              const score = scoreOf(call);
              return (
                <tr key={call.id} className="hover:bg-surface-2/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-[14px] font-bold text-ink">{call.title}</p>
                    <p className="mt-1 text-[12px] font-medium text-muted">{formatDate(call.created_at)}</p>
                  </td>
                  <td className="px-6 py-4 text-[14px] font-medium text-ink">{call.agents?.name || "—"}</td>
                  <td className="px-6 py-4 text-[13px] font-medium text-ink">
                    {languageLabel(call.detected_language || call.language_mode)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={call.status} />
                    {call.error_message ? (
                      <p className="mt-2 text-xs text-rose font-medium max-w-[150px] leading-relaxed">{call.error_message}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    {score ? (
                      <span className={`font-bold tabular-nums ${score.overall_score >= 80 ? 'text-good' : score.overall_score >= 60 ? 'text-warn' : 'text-rose'}`}>
                        {score.overall_score} <span className="opacity-40 text-ink mx-1">|</span> <span className="capitalize">{verdictLabel(score.verdict)}</span>
                      </span>
                    ) : (
                       <span className="text-muted text-[13px] font-bold">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {call.status === "queued" || call.status === "failed" ? (
                        <Link href={`/calls/${call.id}/transcribe`} className="btn btn-blue shadow-md shadow-blue/20 hover:-translate-y-0.5 active:translate-y-0">
                          Transcribe call
                        </Link>
                      ) : call.status === "transcribing" ? (
                        <Link href={`/calls/${call.id}/transcribe`} className="btn btn-ghost border border-line bg-surface-2 hover:-translate-y-0.5 active:translate-y-0 shadow-sm">
                          View progress
                        </Link>
                      ) : call.status === "completed" ? (
                        <Link href={`/calls/${call.id}/score`} className="btn btn-ghost border border-line hover:bg-surface-2 hover:-translate-y-0.5 active:translate-y-0 shadow-sm">
                          View Score
                        </Link>
                      ) : (
                        <Link href={`/calls/${call.id}/transcribe`} className="btn bg-blue-soft text-blue hover:bg-blue/10 hover:-translate-y-0.5 active:translate-y-0 shadow-sm">
                          Audit / Score
                        </Link>
                      )}
                      <DeleteCallButton
                        callId={call.id}
                        title={call.title}
                        status={call.status}
                        compact
                        onDeleted={() =>
                          setCalls((rows) => rows.filter((row) => row.id !== call.id))
                        }
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length && (
          <div className="px-6 py-16 text-center">
             <div className="h-16 w-16 rounded-full bg-surface-2 mx-auto flex items-center justify-center mb-4">
                <span className="text-2xl opacity-50">📋</span>
             </div>
             <p className="text-[15px] font-bold text-ink">{calls.length ? "No calls in this status" : "Inventory is empty"}</p>
             <p className="mt-2 text-[14px] text-muted max-w-[250px] mx-auto">Upload a recording to begin transcribing and scoring your calls.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel rounded-3xl p-6 bg-gradient-to-br from-surface to-surface-2 hover:shadow-md transition-shadow">
      <p className="text-[13px] font-bold text-muted uppercase tracking-wider">{label}</p>
      <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums text-ink">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: CallStatus }) {
  const bucket = auditStatus(status);
  const color =
    bucket === "audited"
      ? "bg-good/10 text-good border-good/20"
      : bucket === "transcribed"
        ? "bg-blue-soft text-blue border-blue/10"
        : bucket === "failed"
          ? "bg-rose/10 text-rose border-rose/20"
          : "bg-line/40 text-ink border-line";
  return <span className={`badge border shadow-sm ${color}`}>{auditLabel(status)}</span>;
}
