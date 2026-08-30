"use client";

import Link from "next/link";
import { useQaReadiness } from "@/components/use-qa-readiness";
import { QA_KIND_LABELS, type QaKind } from "@/lib/qa-kinds";

const REQUIRED: QaKind[] = ["scorecard", "compliance", "document"];

export function StandardsFilesPanel({
  title = "Company files the model will read",
}: {
  title?: string;
}) {
  const { readiness, blocked, blockedMessage } = useQaReadiness();

  return (
    <aside className="surface p-5 h-fit space-y-4">
      <div>
        <p className="page-kicker">Scoring source</p>
        <h2 className="mt-2 text-[15px] font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-[12px] text-muted leading-relaxed">
          Scores come from these uploaded files, not from a generic QA checklist.
        </p>
      </div>

      {!readiness ? (
        <p className="text-[13px] text-muted">Checking Standards…</p>
      ) : (
        <ul className="space-y-2">
          {REQUIRED.map((kind) => {
            const files = readiness.documents.filter((doc) => doc.kind === kind && doc.has_text);
            const ok = files.length > 0;
            return (
              <li key={kind} className="border border-line px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-ink capitalize">
                    {QA_KIND_LABELS[kind]}
                  </span>
                  <span className={ok ? "chip chip-ok" : "chip chip-bad"}>
                    {ok ? "Readable" : "Missing"}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted truncate">
                  {ok ? files.map((doc) => doc.title || doc.file_name).join(", ") : "Upload this in Standards"}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {blocked ? (
        <p className="text-[12px] text-rose leading-relaxed">{blockedMessage}</p>
      ) : readiness?.ready ? (
        <p className="text-[12px] text-good leading-relaxed">
          Ready. Score will cite these file names in the audit.
        </p>
      ) : null}

      <Link href="/standards" className="btn btn-ghost w-full text-[13px]">
        {blocked ? "Upload company files" : "Review Standards"}
      </Link>
    </aside>
  );
}
