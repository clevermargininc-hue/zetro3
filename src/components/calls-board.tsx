"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DeleteCallButton } from "@/components/delete-call-button";
import { auditLabel, auditStatus, formatDate, formatDuration, languageLabel, verdictLabel } from "@/lib/format";
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

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

const Icons = {
  document: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  emptyBox: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/40">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  play: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
};

export function CallsBoard({ initialCalls, teamScope }: { initialCalls: CallRow[], teamScope: string[] }) {
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
        .in("user_id", teamScope)
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
      {/* Operational KPI Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg p-5 border border-line shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Total Logged Calls</span>
            <span className="text-3xl font-bold tracking-tight tabular-nums text-ink">{calls.length}</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-muted font-medium">
            Complete workspace registry
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-line shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Scored & Audited</span>
            <span className="text-3xl font-bold tracking-tight tabular-nums text-emerald-600">{counts.audited}</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-muted font-medium">
            Completed QA evaluations
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-line shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Transcribed Ready</span>
            <span className="text-3xl font-bold tracking-tight tabular-nums text-blue">{counts.transcribed}</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-muted font-medium">
            Awaiting scorecard scoring
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-line shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">In Pipeline / Processing</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-amber-600">{counts.processing}</span>
              {counts.failed > 0 && (
                <span className="text-[11px] font-semibold text-rose bg-rose/10 px-2 py-0.5 rounded border border-rose/20">
                  {counts.failed} failed
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-muted font-medium">
            Active background queues
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg max-w-fit border border-slate-200">
        {(
          [
            ["all", `All (${calls.length})`],
            ["audited", `Scored (${counts.audited})`],
            ["transcribed", `Transcribed (${counts.transcribed})`],
            ["processing", `Processing (${counts.processing})`],
            ["failed", `Failed (${counts.failed})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
              filter === id
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-ink hover:bg-white/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-line shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Call Title / Duration</th>
                <th className="px-6 py-3">Representative</th>
                <th className="px-6 py-3">Language</th>
                <th className="px-6 py-3">Pipeline Status</th>
                <th className="px-6 py-3 text-right">QA Score</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {visible.map((call) => {
                const score = scoreOf(call);
                return (
                  <tr key={call.id} className="hover:bg-slate-50 transition-colors">
                    {/* Call Title & Date */}
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-ink line-clamp-1 max-w-xs">{call.title || call.file_name || "Audio Recording"}</div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        <span>{formatDate(call.created_at)}</span>
                        <span>•</span>
                        <span>{formatDuration(call.duration_seconds)}</span>
                      </div>
                    </td>

                    {/* Agent */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {getInitials(call.agents?.name || "Unassigned")}
                        </div>
                        <span className="font-medium text-slate-700 text-[13px]">
                          {call.agents?.name || <span className="text-slate-400 italic">Unassigned</span>}
                        </span>
                      </div>
                    </td>

                    {/* Language */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {languageLabel(call.detected_language || call.language_mode)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <StatusBadge status={call.status} />
                      {call.error_message ? (
                        <p className="mt-1 text-[11px] text-rose font-medium max-w-xs truncate">
                          {call.error_message}
                        </p>
                      ) : null}
                    </td>

                    {/* Score */}
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      {score ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-bold text-[13px] tabular-nums border ${
                            score.overall_score >= 80
                              ? "bg-good/10 text-good border-good/20"
                              : score.overall_score >= 60
                              ? "bg-warn/10 text-warn border-warn/20"
                              : "bg-rose/10 text-rose border-rose/20"
                          }`}
                        >
                          {score.overall_score}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[12px]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {call.status === "completed" ? (
                          <Link
                            href={`/calls/${call.id}/score`}
                            className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[12px] px-3 py-1.5 font-medium"
                          >
                            View Scorecard →
                          </Link>
                        ) : call.status === "transcribed" ? (
                          <Link
                            href={`/calls/${call.id}/transcribe`}
                            className="btn bg-blue hover:bg-blue-2 text-white text-[12px] px-3 py-1.5 font-semibold"
                          >
                            Audit / Score
                          </Link>
                        ) : call.status === "transcribing" ? (
                          <Link
                            href={`/calls/${call.id}/transcribe`}
                            className="btn bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-[12px] px-3 py-1.5"
                          >
                            View Progress
                          </Link>
                        ) : (
                          <Link
                            href={`/calls/${call.id}/transcribe`}
                            className="btn bg-blue hover:bg-blue-2 text-white text-[12px] px-3 py-1.5 font-semibold"
                          >
                            Transcribe
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
            <div className="py-16 text-center">
              <div className="inline-flex p-4 rounded-full bg-slate-50 mb-3">{Icons.emptyBox}</div>
              <h3 className="text-[15px] font-bold text-ink">
                {calls.length ? "No recordings matching this filter" : "Call inventory is empty"}
              </h3>
              <p className="mt-1 text-[13px] text-muted max-w-sm mx-auto">
                Upload customer recordings to begin transcription, speaker diarization, and automated quality auditing.
              </p>
              <Link href="/upload" className="mt-5 btn btn-blue text-[13px] px-5 py-2 inline-flex font-semibold">
                Upload Call Recordings
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CallStatus }) {
  const bucket = auditStatus(status);

  if (bucket === "audited") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Audited & Scored
      </span>
    );
  }

  if (bucket === "transcribed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue" />
        Transcript Ready
      </span>
    );
  }

  if (bucket === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Processing Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      {status === "transcribing" ? "Transcribing Audio…" : "Scoring Agent…"}
    </span>
  );
}
