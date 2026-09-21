"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DeleteCallButton } from "@/components/delete-call-button";
import { CallDownloads } from "@/components/call-downloads";
import {
  agentLabel,
  formatDate,
  formatDuration,
  isCallAudited,
  languageLabel,
  statusLabel,
} from "@/lib/format";
import type { Call, CallScore, CallStatus } from "@/lib/types";
import { KpiStrip, scoreChipClass } from "@/components/ui";

type CallRow = Call & {
  agents?: { name: string } | null;
  call_scores?: CallScore[] | CallScore | null;
};

type Filter = "all" | "audited" | "not_yet";

function scoreOf(call: CallRow) {
  return Array.isArray(call.call_scores) ? call.call_scores[0] : call.call_scores;
}

const Icons = {
  emptyBox: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/40">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
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
  }, [teamScope]);

  const counts = useMemo(() => {
    let audited = 0;
    for (const call of calls) {
      if (isCallAudited(call.status)) audited += 1;
    }
    return { audited, notYet: calls.length - audited };
  }, [calls]);

  const visible =
    filter === "all"
      ? calls
      : calls.filter((call) =>
          filter === "audited" ? isCallAudited(call.status) : !isCallAudited(call.status),
        );

  return (
    <div className="space-y-5">
      <KpiStrip
        items={[
          { label: "Logged calls", value: String(calls.length), hint: "Workspace inventory" },
          { label: "Audited", value: String(counts.audited), hint: "Already scored" },
          { label: "Not yet", value: String(counts.notYet), hint: "Still in prepare or score" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-1 border-b border-line">
        {(
          [
            ["all", `All (${calls.length})`],
            ["audited", `Audited (${counts.audited})`],
            ["not_yet", `Not yet (${counts.notYet})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`px-3 py-2 text-[12px] font-medium border-b-2 -mb-px ${
              filter === id
                ? "border-blue text-ink"
                : "border-transparent text-slate-500 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Agent ID</th>
                <th className="px-6 py-3">Language</th>
                <th className="px-6 py-3">Audit status</th>
                <th className="px-6 py-3 text-right">QA Score</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {visible.map((call) => {
                const score = scoreOf(call);
                return (
                  <tr key={call.id} className="hover:bg-slate-50 transition-colors">
                    {/* Agent ID & Date */}
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-ink tabular-nums">
                        {agentLabel(call)}
                      </div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        <span>{formatDate(call.created_at)}</span>
                        <span>•</span>
                        <span>{formatDuration(call.duration_seconds)}</span>
                      </div>
                    </td>

                    {/* Language */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="chip">
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
                        <span className={`${scoreChipClass(score.overall_score)} tabular-nums`}>
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
                          <>
                            <CallDownloads
                              callId={call.id}
                              compact
                            />
                            <Link
                              href={`/upload/score/${call.id}`}
                              className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[12px] px-3 py-1.5 font-medium"
                            >
                              Scorecard
                            </Link>
                          </>
                        ) : call.status === "transcribed" || call.status === "analyzing" ? (
                          <>
                            <CallDownloads
                              callId={call.id}
                              compact
                            />
                            <Link
                              href={`/upload/prepare/${call.id}`}
                              className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[12px] px-3 py-1.5 font-medium"
                            >
                              Recording
                            </Link>
                            <Link
                              href={`/upload/score/${call.id}`}
                              className="btn bg-blue hover:bg-blue-2 text-white text-[12px] px-3 py-1.5 font-semibold"
                            >
                              Score
                            </Link>
                          </>
                        ) : call.status === "transcribing" ? (
                          <>
                            <CallDownloads callId={call.id} compact />
                            <Link
                              href={`/upload/prepare/${call.id}`}
                              className="btn bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-[12px] px-3 py-1.5"
                            >
                              View Progress
                            </Link>
                          </>
                        ) : (
                          <>
                            <CallDownloads callId={call.id} compact />
                            <Link
                              href={`/upload/prepare/${call.id}`}
                              className="btn bg-blue hover:bg-blue-2 text-white text-[12px] px-3 py-1.5 font-semibold"
                            >
                              Prepare
                            </Link>
                          </>
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
                {calls.length ? "No recordings match this filter" : "No calls yet"}
              </h3>
              <p className="mt-1 text-[13px] text-muted max-w-sm mx-auto">
                Upload a recording, prepare it, then score it when you are ready.
              </p>
              <Link href="/upload" className="mt-5 btn btn-blue text-[13px] px-5 py-2 inline-flex font-semibold">
                Upload calls
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CallStatus }) {
  if (isCallAudited(status)) {
    return <span className="chip chip-ok">Audited</span>;
  }

  return (
    <div>
      <span className="chip">Not yet</span>
      <p className="mt-1 text-[11px] text-muted">{statusLabel(status)}</p>
    </div>
  );
}
