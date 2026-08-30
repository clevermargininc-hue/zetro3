"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import {
  formatDate,
  languageLabel,
  statusLabel,
  verdictLabel,
  auditStatus,
  PREPARE_QUEUE_STATUSES,
  SCORE_QUEUE_STATUSES,
} from "@/lib/format";
import { CallDownloads } from "@/components/call-downloads";
import { scoreChipClass } from "@/components/ui";
import type { Call, CallScore } from "@/lib/types";

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
  const [calls, setCalls] = useState(initialCalls);

  useEffect(() => {
    setCalls(initialCalls);
  }, [initialCalls]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const res = await authFetch("/api/calls");
      const body = (await res.json().catch(() => ({}))) as { calls?: CallRow[] };
      if (cancelled || !res.ok || !Array.isArray(body.calls)) return;
      setCalls(
        action === "score"
          ? body.calls.filter((call) => SCORE_QUEUE_STATUSES.includes(call.status))
          : body.calls.filter((call) => PREPARE_QUEUE_STATUSES.includes(call.status)),
      );
    }

    void refresh();
    const poll = window.setInterval(() => {
      void refresh();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [action, teamScope]);

  const isScore = action === "score";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-muted">
          {calls.length === 0
            ? isScore
              ? "No calls in the score queue"
              : "No calls in the prepare queue"
            : `${calls.length} in this step`}
        </p>
        <Link href="/calls" className="text-[12px] font-semibold text-blue hover:underline">
          Call inventory
        </Link>
      </div>
      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left">
            <thead>
              <tr>
                <th>Recording</th>
                <th>Agent</th>
                <th>Language</th>
                {isScore ? <th>Score</th> : null}
                <th>Status</th>
                <th className="text-right">Next</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => {
                const score = scoreOf(call);
                const href = isScore ? `/upload/score/${call.id}` : `/upload/prepare/${call.id}`;
                const bucket = auditStatus(call.status);
                const actionLabel = isScore
                  ? call.status === "analyzing"
                    ? "Open scoring"
                    : "Open and score"
                  : call.status === "failed"
                    ? "Retry prepare"
                    : "Open and prepare";
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
                    {isScore ? (
                      <td>
                        {score ? (
                          <span className={`${scoreChipClass(score.overall_score)} tabular-nums`}>
                            {score.overall_score}% · {verdictLabel(score.verdict)}
                          </span>
                        ) : (
                          <span className="text-muted text-[13px]">Waiting</span>
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
                        <p className="mt-2 text-[12px] text-rose max-w-[180px] leading-relaxed">
                          {call.error_message}
                        </p>
                      ) : null}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <CallDownloads callId={call.id} compact />
                        <Link href={href} className="btn btn-blue px-4 py-2 text-[13px]">
                          {actionLabel}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!calls.length && (
          <div className="px-6 py-14 text-center">
            <p className="text-[15px] font-semibold text-ink">
              {isScore ? "Nothing is waiting to score" : "Nothing is waiting to prepare"}
            </p>
            <p className="mt-2 text-[13px] text-muted max-w-sm mx-auto leading-relaxed">
              {isScore
                ? "Finish Prepare first. After a score is saved, the call moves to Call inventory."
                : "New uploads appear here. Open a recording to prepare it, then continue to Score."}
            </p>
            <Link
              href={isScore ? "/upload/prepare" : "/upload"}
              className="btn btn-blue mt-5 text-[13px]"
            >
              {isScore ? "Go to Prepare" : "Go to Upload"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
