"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
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
      const page = await fetchAllRows<CallRow>((from, to) =>
        supabase
          .from("calls")
          .select("*, agents(name), call_scores(overall_score, verdict)")
          .in("user_id", teamScope)
          .order("created_at", { ascending: false })
          .range(from, to),
      );
      if (page.data) setCalls(page.data);
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

      <div className="tabs" role="tablist" aria-label="Call status">
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
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={filter === id ? "is-active" : ""}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Language</th>
                <th>Audit status</th>
                <th className="text-right">QA score</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((call) => {
                const score = scoreOf(call);
                return (
                  <tr key={call.id}>
                    <td>
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
                    <td className="whitespace-nowrap">
                      <span className="chip">
                        {languageLabel(call.detected_language || call.language_mode)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap">
                      <StatusBadge status={call.status} />
                      {call.error_message ? (
                        <p className="mt-1 text-[11px] text-rose font-medium max-w-xs truncate">
                          {call.error_message}
                        </p>
                      ) : null}
                    </td>

                    {/* Score */}
                    <td className="whitespace-nowrap text-right">
                      {score ? (
                        <span className={`${scoreChipClass(score.overall_score)} tabular-nums`}>
                          {score.overall_score}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[12px]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {call.status === "completed" ? (
                          <>
                            <CallDownloads
                              callId={call.id}
                              compact
                            />
                            <Link
                              href={`/upload/score/${call.id}`}
                              className="btn btn-ghost px-3 py-1.5 text-[12px]"
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
                              className="btn btn-ghost px-3 py-1.5 text-[12px]"
                            >
                              Recording
                            </Link>
                            <Link
                              href={`/upload/score/${call.id}`}
                              className="btn btn-blue px-3 py-1.5 text-[12px]"
                            >
                              Score
                            </Link>
                          </>
                        ) : call.status === "transcribing" ? (
                          <>
                            <CallDownloads callId={call.id} compact />
                            <Link
                              href={`/upload/prepare/${call.id}`}
                              className="btn btn-ghost px-3 py-1.5 text-[12px]"
                            >
                              View Progress
                            </Link>
                          </>
                        ) : (
                          <>
                            <CallDownloads callId={call.id} compact />
                            <Link
                              href={`/upload/prepare/${call.id}`}
                              className="btn btn-blue px-3 py-1.5 text-[12px]"
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
            <div className="empty-state">
              <div className="empty-state-icon">{Icons.emptyBox}</div>
              <h3>{calls.length ? "No recordings match this filter" : "No calls yet"}</h3>
              <p>Upload a recording, prepare it, then score it when you are ready.</p>
              <Link href="/upload" className="btn btn-blue mt-4 text-[13px]">
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
