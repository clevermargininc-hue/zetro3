"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { pipelineQueueCounts } from "@/lib/format";
import type { CallStatus } from "@/lib/types";

const STEPS = [
  {
    id: "upload" as const,
    href: "/upload",
    n: "1",
    title: "Upload",
    hint: "Add call recordings",
  },
  {
    id: "prepare" as const,
    href: "/upload/prepare",
    n: "2",
    title: "Prepare",
    hint: "Make audio ready to score",
  },
  {
    id: "score" as const,
    href: "/upload/score",
    n: "3",
    title: "Score",
    hint: "Audit against company files",
  },
];

type StepId = (typeof STEPS)[number]["id"];

function currentStep(pathname: string): StepId {
  if (pathname.startsWith("/upload/score")) return "score";
  if (pathname.startsWith("/upload/prepare")) return "prepare";
  return "upload";
}

function callIdFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "upload" && (parts[1] === "prepare" || parts[1] === "score") && parts[2]) {
    return parts[2];
  }
  return null;
}

function stepHref(id: StepId, pathname: string) {
  const callId = callIdFromPath(pathname);
  if (id === "score") return callId ? `/upload/score/${callId}` : "/upload/score";
  if (id === "prepare") return callId ? `/upload/prepare/${callId}` : "/upload/prepare";
  return "/upload";
}

function stepClass(id: StepId, active: StepId) {
  if (id === active) return "audit-step audit-step-active";
  if (
    (active === "prepare" && id === "upload") ||
    (active === "score" && id !== "score")
  ) {
    return "audit-step audit-step-done";
  }
  return "audit-step";
}

function detailNote(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "upload" && parts[1] === "prepare" && parts[2]) {
    return "Preparing one recording. Listen here, then continue to Score.";
  }
  if (parts[0] === "upload" && parts[1] === "score" && parts[2]) {
    return "Scoring one recording. The model reads your company files before it assigns any mark.";
  }
  return null;
}

export function UploadSectionNav({
  prepareCount,
  scoreCount,
  teamScope,
}: {
  prepareCount: number;
  scoreCount: number;
  teamScope: string[];
}) {
  const pathname = usePathname();
  const active = currentStep(pathname);
  const [counts, setCounts] = useState({ prepare: prepareCount, score: scoreCount });
  const note = detailNote(pathname);

  useEffect(() => {
    setCounts({ prepare: prepareCount, score: scoreCount });
  }, [prepareCount, scoreCount]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const res = await authFetch("/api/calls");
      const body = (await res.json().catch(() => ({}))) as { calls?: { status?: string }[] };
      if (cancelled || !res.ok || !Array.isArray(body.calls)) return;
      setCounts(pipelineQueueCounts(body.calls.map((row) => (row.status || "") as CallStatus)));
    }

    void refresh();
    const poll = window.setInterval(() => {
      void refresh();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [teamScope]);

  return (
    <nav aria-label="Quality audit steps" className="audit-pipeline no-print">
      <div className="audit-pipeline-head">
        <div>
          <p className="page-kicker">Quality audit</p>
          <p className="mt-1 text-[14px] font-semibold text-ink">Three steps. One recording at a time.</p>
          <p className="mt-0.5 text-[12px] text-muted max-w-xl">
            Upload files, prepare the audio, then score against the scorecard and compliance files in Standards.
          </p>
        </div>
        <Link href="/standards" className="text-[12px] font-semibold text-blue hover:underline">
          Company files
        </Link>
      </div>
      <div className="audit-steps">
        {STEPS.map((step) => {
          const waiting =
            step.id === "prepare"
              ? counts.prepare
              : step.id === "score"
                ? counts.score
                : null;
          return (
            <Link
              key={step.id}
              href={stepHref(step.id, pathname)}
              prefetch={step.id === "score" ? false : undefined}
              className={stepClass(step.id, active)}
            >
              <span className="audit-step-index" aria-hidden>
                {step.n}
              </span>
              <span className="min-w-0">
                <span className="audit-step-title">{step.title}</span>
                <span className="audit-step-hint">{step.hint}</span>
                {waiting != null ? (
                  <span className="audit-step-meta">
                    {waiting === 0 ? "Queue clear" : `${waiting} waiting`}
                  </span>
                ) : (
                  <span className="audit-step-meta">Start here</span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
      {note ? <p className="audit-pipeline-note">{note}</p> : null}
    </nav>
  );
}
