"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Search } from "lucide-react";
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
  emptyBox: <FolderOpen className="h-10 w-10 text-muted/40" strokeWidth={1.5} />,
  search: <Search className="h-3.5 w-3.5 text-slate-400" />,
};

export function CallsBoard({ initialCalls, teamScope }: { initialCalls: CallRow[]; teamScope: string[] }) {
  const [calls, setCalls] = useState(initialCalls);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const hasActiveJobs = useMemo(
    () =>
      calls.some(
        (c) =>
          c.status === "queued" ||
          c.status === "transcribing" ||
          c.status === "analyzing",
      ),
    [calls],
  );

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

    const poll = hasActiveJobs
      ? window.setInterval(() => {
          void refresh();
        }, 6000)
      : null;

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
      if (poll !== null) window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [teamScope, hasActiveJobs]);

  const counts = useMemo(() => {
    let audited = 0;
    for (const call of calls) {
      if (isCallAudited(call.status)) audited += 1;
    }
    return { audited, notYet: calls.length - audited };
  }, [calls]);

  const visible = useMemo(() => {
    const byTab =
      filter === "all"
        ? calls
        : calls.filter((call) =>
            filter === "audited" ? isCallAudited(call.status) : !isCallAudited(call.status),
          );
    const q = search.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((call) => {
      const agent = agentLabel(call).toLowerCase();
      const title = (call.title || "").toLowerCase();
      const file = (call.file_name || "").toLowerCase();
      const lang = languageLabel(call.detected_language || call.language_mode).toLowerCase();
      return agent.includes(q) || title.includes(q) || file.includes(q) || lang.includes(q);
    });
  }, [calls, filter, search]);

  return (
    <div className="space-y-5">
      <KpiStrip
        items={[
          { label: "Logged calls", value: String(calls.length), hint: "Workspace inventory" },
          { label: "Audited", value: String(counts.audited), hint: "Already scored" },
          { label: "Not yet", value: String(counts.notYet), hint: "Still in prepare or score" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-2 sm:pb-0">
        <div className="flex flex-wrap items-center gap-1">
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
              className={`px-3 py-2 text-[12px] font-semibold border-b-2 -mb-px transition-colors ${
                filter === id
                  ? "border-navy text-ink"
                  : "border-transparent text-slate-500 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 sm:pb-1.5">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 sm:-mt-0.5">
            {Icons.search}
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agent, file, or language…"
            aria-label="Search calls"
            className="field py-1.5 pl-8 pr-3 text-[12px]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent ID</th>
                <th>Language</th>
                <th>Audit status</th>
                <th className="text-right">QA Score</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((call) => {
                const score = scoreOf(call);
                return (
                  <tr key={call.id} className="transition-colors">
                    {/* Agent ID & Date */}
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

                    {/* Status */}
                    <td className="whitespace-nowrap">
                      <StatusBadge status={call.status} />
                      {call.error_message ? (
                        <p className="mt-1 text-[11px] text-rose font-medium max-w-xs truncate">
                          {call.error_message}
                        </p>
                      ) : null}
                    </td>

                    {/* Score */}
                    <td className="text-right whitespace-nowrap">
                      {score ? (
                        <span className={`${scoreChipClass(score.overall_score)} tabular-nums`}>
                          {score.overall_score}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[12px]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {call.status === "completed" ? (
                          <>
                            <CallDownloads callId={call.id} compact />
                            <Link
                              href={`/upload/score/${call.id}`}
                              className="btn btn-ghost text-[12px] px-3 py-1.5 font-medium"
                            >
                              Scorecard
                            </Link>
                          </>
                        ) : call.status === "transcribed" || call.status === "analyzing" ? (
                          <>
                            <CallDownloads callId={call.id} compact />
                            <Link
                              href={`/upload/prepare/${call.id}`}
                              className="btn btn-ghost text-[12px] px-3 py-1.5 font-medium"
                            >
                              Recording
                            </Link>
                            <Link
                              href={`/upload/score/${call.id}`}
                              className="btn btn-blue text-[12px] px-3 py-1.5 font-semibold"
                            >
                              Score
                            </Link>
                          </>
                        ) : call.status === "transcribing" ? (
                          <>
                            <CallDownloads callId={call.id} compact />
                            <Link
                              href={`/upload/prepare/${call.id}`}
                              className="btn btn-ghost text-[12px] px-3 py-1.5"
                            >
                              View Progress
                            </Link>
                          </>
                        ) : (
                          <>
                            <CallDownloads callId={call.id} compact />
                            <Link
                              href={`/upload/prepare/${call.id}`}
                              className="btn btn-blue text-[12px] px-3 py-1.5 font-semibold"
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
                {search.trim()
                  ? "Try clearing your search query or switching filter tabs."
                  : "Upload a recording, prepare it, then score it when you are ready."}
              </p>
              {search.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-4 btn btn-ghost text-[12px]"
                >
                  Clear search
                </button>
              ) : (
                <Link href="/upload" className="mt-5 btn btn-blue text-[13px] px-5 py-2 inline-flex font-semibold">
                  Upload calls
                </Link>
              )}
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
