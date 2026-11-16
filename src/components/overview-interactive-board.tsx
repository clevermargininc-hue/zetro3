"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { Donut } from "@/components/admin-charts";
import { scoreChipClass } from "@/components/ui";
import { formatDate, formatDuration, statusLabel } from "@/lib/format";
import type { CallStatus } from "@/lib/types";
import type {
  OverviewCallItem,
  OverviewGapItem,
  OverviewLanguageSlice,
  OverviewSentimentSummary,
} from "@/lib/overview-analytics";

type FilterTab = "all" | "attention" | "scored" | "pipeline";
type SortMode = "latest" | "lowest" | "highest";

const PAGE_SIZE = 12;

function isAttentionCall(call: OverviewCallItem): boolean {
  if (call.status === "failed") return true;
  if (call.autoZeroApplied) return true;
  if (call.failedComplianceCount > 0) return true;
  return call.overallScore !== null && call.overallScore < 70;
}

function isInPipeline(call: OverviewCallItem): boolean {
  return call.status !== "completed" && call.status !== "failed";
}

function stanceBadgeClass(stance: string | null): string {
  switch ((stance || "").toLowerCase()) {
    case "satisfied":
      return "chip chip-ok";
    case "frustrated":
      return "chip chip-bad";
    case "mixed":
      return "chip chip-wait";
    case "neutral":
      return "chip chip-info";
    default:
      return "chip";
  }
}

function GapPill({ kind, critical }: { kind: OverviewGapItem["kind"]; critical: boolean }) {
  if (kind === "compliance") {
    return critical ? (
      <span className="chip chip-bad shrink-0 text-[11px]">Critical rule</span>
    ) : (
      <span className="chip chip-wait shrink-0 text-[11px]">Compliance miss</span>
    );
  }
  return <span className="chip chip-info shrink-0 text-[11px]">Rubric</span>;
}

function InsightCard({
  title,
  subtitle,
  href,
  linkLabel,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-bold tracking-tight text-[#0A1A3F]">
            {title}
          </h2>
          <p className="mt-0.5 text-[12px] text-[#5A6882]">{subtitle}</p>
        </div>
        <Link
          href={href}
          className="shrink-0 text-[12.5px] font-semibold text-[#2459E8] hover:underline"
        >
          {linkLabel} →
        </Link>
      </div>
      {children}
    </section>
  );
}

function CallInspectionDrawer({
  call,
  onClose,
}: {
  call: OverviewCallItem;
  onClose: () => void;
}) {
  const isScored = call.status === "completed" && call.overallScore !== null;
  const targetHref = isScored ? `/upload/score/${call.id}` : `/upload/prepare/${call.id}`;
  const targetLabel = isScored ? "Open full audit breakdown" : "Inspect call in pipeline";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0A1A3F]/30 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-call-title"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-[460px] flex-col border-l border-[#E3E9F5] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E3E9F5] bg-[#F8FAFF] px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {call.overallScore !== null ? (
                <span className={scoreChipClass(call.overallScore)}>{call.overallScore}%</span>
              ) : (
                <span className="chip chip-info text-[11px]">{statusLabel(call.status as CallStatus)}</span>
              )}
              {call.autoZeroApplied ? (
                <span className="chip chip-bad text-[11px]">Auto-zero rule</span>
              ) : null}
              {call.verdict ? (
                <span className="chip text-[11px] capitalize">{call.verdict}</span>
              ) : null}
            </div>
            <h2
              id="drawer-call-title"
              className="mt-2 truncate font-display text-[17px] font-bold tracking-tight text-[#0A1A3F]"
            >
              {call.title}
            </h2>
            {call.fileName && call.fileName !== call.title ? (
              <p className="mt-0.5 truncate text-[12px] text-[#5A6882]">{call.fileName}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspection panel"
            className="rounded-lg border border-[#E3E9F5] bg-white p-1.5 text-[#5A6882] transition-colors hover:border-[#C7D6F5] hover:text-[#0A1A3F]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-[13px] text-[#16233F]">
          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-[#E3E9F5] bg-[#F8FAFF] p-3.5 text-[12px]">
            <div>
              <dt className="text-[#5A6882]">Agent</dt>
              <dd className="mt-0.5 truncate font-semibold text-[#0A1A3F]">{call.agentName}</dd>
            </div>
            <div>
              <dt className="text-[#5A6882]">Language</dt>
              <dd className="mt-0.5 font-semibold text-[#0A1A3F]">{call.languageLabel}</dd>
            </div>
            <div>
              <dt className="text-[#5A6882]">Duration</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-[#0A1A3F]">
                {call.durationSeconds ? formatDuration(call.durationSeconds) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[#5A6882]">{call.auditedAt ? "Audited" : "Uploaded"}</dt>
              <dd className="mt-0.5 font-semibold text-[#0A1A3F]">
                {formatDate(call.auditedAt || call.createdAt)}
              </dd>
            </div>
          </dl>

          {call.summary ? (
            <section>
              <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-[#5A6882]">
                AI Audit Summary
              </h3>
              <p className="mt-1.5 leading-relaxed text-[#16233F]">{call.summary}</p>
            </section>
          ) : null}

          {call.scoreDimensions.length > 0 ? (
            <section>
              <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-[#5A6882]">
                Scorecard Breakdown
              </h3>
              <div className="mt-2 space-y-2">
                {call.scoreDimensions.map((dim) => {
                  const barColor =
                    dim.score >= 85
                      ? "bg-[#16A34A]"
                      : dim.score >= 70
                        ? "bg-[#2F6BFF]"
                        : "bg-[#DC2626]";
                  return (
                    <div key={dim.key}>
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="font-medium text-[#16233F]">{dim.label}</span>
                        <span className="font-semibold tabular-nums text-[#0A1A3F]">{dim.score}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#EEF3FF]">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${Math.max(4, Math.min(100, dim.score))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {call.complianceChecks.length > 0 || call.complianceFindings.length > 0 ? (
            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-[#5A6882]">
                  Compliance Checks
                </h3>
                {call.complianceRatePct !== null ? (
                  <span className="text-[12px] font-semibold tabular-nums text-[#0A1A3F]">
                    {call.complianceRatePct}% followed
                  </span>
                ) : null}
              </div>

              {call.complianceChecks.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {call.complianceChecks.map((check, i) => (
                    <li
                      key={`${check.rule}-${i}`}
                      className="rounded-lg border border-[#E3E9F5] bg-white p-2.5 text-[12.5px]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-[#0A1A3F]">{check.rule}</span>
                        <span
                          className={
                            check.result === "fail"
                              ? "chip chip-bad shrink-0 text-[11px]"
                              : check.result === "pass"
                                ? "chip chip-ok shrink-0 text-[11px]"
                                : "chip shrink-0 text-[11px]"
                          }
                        >
                          {check.result === "fail" ? "Missed" : check.result === "pass" ? "Followed" : "N/A"}
                        </span>
                      </div>
                      {check.note ? (
                        <p className="mt-1 text-[12px] text-[#5A6882]">{check.note}</p>
                      ) : null}
                      {check.quote ? (
                        <blockquote className="mt-1.5 border-l-2 border-[#2F6BFF]/40 pl-2.5 text-[11.5px] italic text-[#475569]">
                          “{check.quote}”
                        </blockquote>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.5px] text-[#475569]">
                  {call.complianceFindings.map((finding, i) => (
                    <li key={i}>{finding}</li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {call.strengths.length > 0 || call.improvements.length > 0 ? (
            <section className="grid grid-cols-1 gap-3">
              {call.strengths.length > 0 ? (
                <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4]/60 p-3">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[#15803D]">
                    Strengths
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[12.5px] text-[#166534]">
                    {call.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {call.improvements.length > 0 ? (
                <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB]/70 p-3">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[#B45309]">
                    Coaching Improvements
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[12.5px] text-[#92400E]">
                    {call.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {call.customerStance || call.customerNote || call.customerQuote ? (
            <section className="rounded-xl border border-[#E3E9F5] bg-[#F8FAFF] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-[#5A6882]">
                  Customer Voice
                </h3>
                {call.customerStance ? (
                  <span className={`${stanceBadgeClass(call.customerStance)} capitalize text-[11px]`}>
                    {call.customerStance}
                  </span>
                ) : null}
              </div>
              {call.customerNote ? (
                <p className="mt-1.5 text-[12.5px] text-[#16233F]">{call.customerNote}</p>
              ) : null}
              {call.customerQuote ? (
                <blockquote className="mt-1.5 border-l-2 border-[#2F6BFF]/40 pl-2.5 text-[12px] italic text-[#475569]">
                  “{call.customerQuote}”
                </blockquote>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="border-t border-[#E3E9F5] bg-white px-5 py-3.5">
          <Link href={targetHref} className="btn btn-blue w-full justify-center">
            <span>{targetLabel}</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </aside>
    </div>
  );
}

export function OverviewInteractiveBoard({
  calls,
  gaps,
  sentiment,
  languageMix,
  rangeLabel,
  hasActiveJobs,
  totalWorkspaceCalls,
}: {
  calls: OverviewCallItem[];
  gaps: OverviewGapItem[];
  sentiment: OverviewSentimentSummary;
  languageMix: OverviewLanguageSlice[];
  rangeLabel: string;
  hasActiveJobs: boolean;
  totalWorkspaceCalls?: number;
}) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [page, setPage] = useState(1);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Gently poll server data while recordings are queued/transcribing/scoring.
  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = window.setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, 8000);
    return () => window.clearInterval(timer);
  }, [hasActiveJobs, router]);

  // Close drawer cleanly on Escape key press.
  useEffect(() => {
    if (!selectedCallId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedCallId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCallId]);

  const agentOptions = useMemo(() => {
    const names = new Set<string>();
    for (const c of calls) {
      if (c.agentName && c.agentName !== "Unknown") {
        names.add(c.agentName);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [calls]);

  const tabCounts = useMemo(() => {
    let attention = 0;
    let scored = 0;
    let pipeline = 0;
    for (const c of calls) {
      if (isAttentionCall(c)) attention += 1;
      if (c.status === "completed" && c.overallScore !== null) scored += 1;
      if (isInPipeline(c)) pipeline += 1;
    }
    return {
      all: calls.length,
      attention,
      scored,
      pipeline,
    };
  }, [calls]);

  const filteredCalls = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = calls.filter((call) => {
      if (tab === "attention" && !isAttentionCall(call)) return false;
      if (tab === "scored" && !(call.status === "completed" && call.overallScore !== null)) return false;
      if (tab === "pipeline" && !isInPipeline(call)) return false;

      if (agentFilter !== "all" && call.agentName !== agentFilter) return false;

      if (q) {
        const haystack = [call.title, call.fileName || "", call.agentName, call.summary || ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortMode === "lowest") {
      return [...list].sort((a, b) => (a.overallScore ?? 999) - (b.overallScore ?? 999));
    }
    if (sortMode === "highest") {
      return [...list].sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1));
    }
    return list;
  }, [calls, tab, agentFilter, search, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visibleCalls = filteredCalls.slice(pageStart, pageStart + PAGE_SIZE);

  const selectedCall = useMemo(
    () => (selectedCallId ? calls.find((c) => c.id === selectedCallId) ?? null : null),
    [calls, selectedCallId],
  );

  const callsById = useMemo(() => new Set(calls.map((c) => c.id)), [calls]);

  const sentimentSlices = [
    { label: "Satisfied", value: sentiment.counts.satisfied, color: "#16A34A" },
    { label: "Neutral", value: sentiment.counts.neutral, color: "#2F6BFF" },
    { label: "Mixed", value: sentiment.counts.mixed, color: "#D97706" },
    { label: "Frustrated", value: sentiment.counts.frustrated, color: "#DC2626" },
  ];

  const totalLangCalls = languageMix.reduce((acc, item) => acc + item.count, 0);

  function handleTabChange(next: FilterTab) {
    setTab(next);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleAgentChange(value: string) {
    setAgentFilter(value);
    setPage(1);
  }

  function handleSortChange(value: SortMode) {
    setSortMode(value);
    setPage(1);
  }

  function handleManualRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Intelligence & Gap Insights Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InsightCard
          title="Top compliance & rubric gaps"
          subtitle={`${rangeLabel} · rules missed or dimensions below 85%`}
          href="/scorecard"
          linkLabel="Scorecard"
        >
          {gaps.length === 0 ? (
            <div className="flex min-h-[156px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E3E9F5] bg-[#F8FAFF] px-5 py-6 text-center">
              <ShieldAlert className="h-5 w-5 text-[#5A6882]" />
              <p className="mt-2 text-[13.5px] font-semibold text-[#0A1A3F]">
                {tabCounts.scored > 0 ? "No compliance or rubric gaps flagged" : "No gap data yet"}
              </p>
              <p className="mt-1 max-w-sm text-[12.5px] text-[#5A6882]">
                {tabCounts.scored > 0
                  ? "All evaluated rules followed cleanly and scored rubric parameters averaged 85%+ in this period."
                  : "Upload and score recordings to surface missed compliance rules and rubric coaching priorities."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EEF3FF]">
              {gaps.map((gap) => {
                const canOpenDrawer = gap.sampleCallId && callsById.has(gap.sampleCallId);
                return (
                  <div
                    key={gap.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <GapPill kind={gap.kind} critical={gap.critical} />
                        <span className="truncate text-[13.5px] font-semibold text-[#0A1A3F]">
                          {gap.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-[#5A6882]">{gap.detail}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      {gap.kind === "compliance" ? (
                        <span className="text-[12.5px] font-bold tabular-nums text-[#0A1A3F]">
                          {gap.failCount}/{gap.totalEvaluated} missed
                        </span>
                      ) : (
                        <span className={scoreChipClass(gap.avgScore)}>{gap.avgScore}% avg</span>
                      )}
                      {canOpenDrawer && gap.sampleCallId ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCallId(gap.sampleCallId)}
                          className="rounded-lg border border-[#E3E9F5] bg-[#F8FAFF] px-2.5 py-1 text-[11.5px] font-semibold text-[#2459E8] transition-colors hover:border-[#2459E8]/40 hover:bg-[#EEF3FF]"
                        >
                          Inspect
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </InsightCard>

        <InsightCard
          title="Customer sentiment & languages"
          subtitle={`${rangeLabel} · customer stance & call audio mix`}
          href="/customers"
          linkLabel="Customer Intelligence"
        >
          <div className="space-y-4">
            {sentiment.totalWithVoice > 0 ? (
              <Donut centerLabel="analyzed" slices={sentimentSlices} />
            ) : (
              <div className="rounded-xl border border-dashed border-[#E3E9F5] bg-[#F8FAFF] px-4 py-5 text-center">
                <Sparkles className="mx-auto h-5 w-5 text-[#5A6882]" />
                <p className="mt-1.5 text-[13px] font-semibold text-[#0A1A3F]">
                  No customer voice breakdown yet
                </p>
                <p className="mt-0.5 text-[12px] text-[#5A6882]">
                  Score calls to populate real caller sentiment and friction themes.
                </p>
              </div>
            )}

            {(sentiment.frustrationThemes.length > 0 || sentiment.satisfactionThemes.length > 0) && (
              <div className="grid grid-cols-1 gap-2.5 border-t border-[#E3E9F5] pt-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6882]">
                    Friction signals
                  </p>
                  {sentiment.frustrationThemes.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {sentiment.frustrationThemes.map((t) => (
                        <span key={t.theme} className="chip chip-bad text-[11px]">
                          {t.theme} · {t.count}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-[12px] text-[#5A6882]">None flagged</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6882]">
                    Positive themes
                  </p>
                  {sentiment.satisfactionThemes.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {sentiment.satisfactionThemes.map((t) => (
                        <span key={t.theme} className="chip chip-ok text-[11px]">
                          {t.theme} · {t.count}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-[12px] text-[#5A6882]">None extracted</p>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-[#E3E9F5] pt-3">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="font-semibold uppercase tracking-wider text-[#5A6882]">
                  Language distribution
                </span>
                <span className="tabular-nums text-[#5A6882]">
                  {totalLangCalls} call{totalLangCalls === 1 ? "" : "s"}
                </span>
              </div>
              {languageMix.length === 0 ? (
                <p className="mt-1.5 text-[12px] text-[#5A6882]">No recordings in selected timeframe.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {languageMix.map((lang) => {
                    const pct = totalLangCalls > 0 ? Math.round((lang.count / totalLangCalls) * 100) : 0;
                    return (
                      <span
                        key={lang.mode}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E9F5] bg-[#F8FAFF] px-2.5 py-1 text-[12px] font-medium text-[#0A1A3F]"
                      >
                        <span className="h-2 w-2 rounded-full bg-[#2F6BFF]" />
                        <span>{lang.label}</span>
                        <span className="font-semibold tabular-nums text-[#5A6882]">
                          {lang.count} ({pct}%)
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </InsightCard>
      </div>

      {/* Interactive Calls & Scores Table */}
      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E9F5] px-5 py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-[15px] font-bold tracking-tight text-[#0A1A3F]">
              Workspace calls & scores
            </h2>
            <span className="rounded-full border border-[#E3E9F5] bg-[#F8FAFF] px-2.5 py-0.5 text-[11.5px] font-semibold tabular-nums text-[#5A6882]">
              {filteredCalls.length} of {calls.length}
            </span>
            {hasActiveJobs ? (
              <span className="chip chip-info text-[11px]">
                <Clock className="h-3 w-3 animate-pulse" />
                Live queue updating
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[#E3E9F5] bg-[#F8FAFF] p-0.5 text-[12px]">
              {(
                [
                  ["all", "All", tabCounts.all],
                  ["attention", "Needs attention", tabCounts.attention],
                  ["scored", "Scored", tabCounts.scored],
                  ["pipeline", "In pipeline", tabCounts.pipeline],
                ] as const
              ).map(([key, label, count]) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTabChange(key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${
                      active
                        ? "bg-[#0A1A3F] text-white shadow-xs"
                        : "text-[#5A6882] hover:text-[#0A1A3F]"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`tabular-nums text-[11px] ${
                        active ? "text-white/75" : "text-[#94A3B8]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3E9F5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0A1A3F] transition-colors hover:bg-[#F8FAFF] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E3E9F5] bg-[#F8FAFF]/60 px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search recording, agent, or audit summary..."
              className="h-9 w-full rounded-lg border border-[#D7E0F2] bg-white pr-8 pl-8.5 text-[13px] text-[#0A1A3F] placeholder-[#94A3B8] focus:border-[#2F6BFF] focus:outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[#94A3B8] hover:text-[#0A1A3F]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <select
            aria-label="Filter by agent"
            value={agentFilter}
            onChange={(e) => handleAgentChange(e.target.value)}
            className="h-9 rounded-lg border border-[#D7E0F2] bg-white px-3 text-[12.5px] font-medium text-[#0A1A3F] focus:border-[#2F6BFF] focus:outline-none"
          >
            <option value="all">All agents</option>
            {agentOptions.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort calls"
            value={sortMode}
            onChange={(e) => handleSortChange(e.target.value as SortMode)}
            className="h-9 rounded-lg border border-[#D7E0F2] bg-white px-3 text-[12.5px] font-medium text-[#0A1A3F] focus:border-[#2F6BFF] focus:outline-none"
          >
            <option value="latest">Latest first</option>
            <option value="lowest">Lowest score first</option>
            <option value="highest">Highest score first</option>
          </select>
        </div>

        {visibleCalls.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[14px] font-semibold text-[#0A1A3F]">
              {calls.length === 0 && (totalWorkspaceCalls ?? 0) > 0
                ? `No calls recorded in ${rangeLabel}`
                : "No calls match the current filter"}
            </p>
            <p className="mt-1 text-[12.5px] text-[#5A6882]">
              {calls.length === 0 && (totalWorkspaceCalls ?? 0) > 0
                ? `Your workspace has ${totalWorkspaceCalls} call${totalWorkspaceCalls === 1 ? "" : "s"} outside this timeframe.`
                : calls.length === 0
                  ? "Upload call recordings to begin scoring and compliance tracking."
                  : "Try clearing the search query or switching back to All calls."}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {calls.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setTab("all");
                    setAgentFilter("all");
                    setSearch("");
                    setPage(1);
                  }}
                  className="rounded-lg border border-[#E3E9F5] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#0A1A3F] hover:bg-[#F8FAFF]"
                >
                  Reset filters
                </button>
              ) : (totalWorkspaceCalls ?? 0) > 0 ? (
                <Link
                  href="/dashboard"
                  className="rounded-lg border border-[#E3E9F5] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#2459E8] hover:bg-[#EEF3FF]"
                >
                  View all time ({totalWorkspaceCalls})
                </Link>
              ) : (
                <Link href="/upload" className="btn btn-blue text-[12.5px]">
                  Upload first call
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E3E9F5] bg-[#F8FAFF]/70 text-[11px] font-semibold uppercase tracking-wider text-[#5A6882]">
                  <th className="px-5 py-2.5">Call recording</th>
                  <th className="px-3 py-2.5">Agent</th>
                  <th className="px-3 py-2.5">Language</th>
                  <th className="px-3 py-2.5">Duration</th>
                  <th className="px-3 py-2.5">Score</th>
                  <th className="px-3 py-2.5">Compliance</th>
                  <th className="px-3 py-2.5">Status / Date</th>
                  <th className="px-5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF3FF]">
                {visibleCalls.map((call) => {
                  const selected = selectedCall?.id === call.id;
                  return (
                    <tr
                      key={call.id}
                      onClick={() => setSelectedCallId(call.id)}
                      className={`cursor-pointer transition-colors ${
                        selected ? "bg-[#EEF3FF]/70" : "hover:bg-[#F8FAFF]"
                      }`}
                    >
                      <td className="max-w-[260px] px-5 py-3">
                        <p className="truncate font-semibold text-[#0A1A3F]">{call.title}</p>
                        {call.summary ? (
                          <p className="mt-0.5 truncate text-[11.5px] text-[#5A6882]">
                            {call.summary}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-medium text-[#16233F]">{call.agentName}</td>
                      <td className="px-3 py-3 text-[12.5px] text-[#5A6882]">
                        {call.languageLabel}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[12.5px] text-[#5A6882]">
                        {call.durationSeconds ? formatDuration(call.durationSeconds) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {call.overallScore !== null ? (
                          <div className="flex items-center gap-1.5">
                            <span className={scoreChipClass(call.overallScore)}>
                              {call.overallScore}%
                            </span>
                            {call.autoZeroApplied ? (
                              <span className="chip chip-bad text-[10.5px]">Auto-0</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {call.failedComplianceCount > 0 ? (
                          <span className="chip chip-bad text-[11px]">
                            {call.failedComplianceCount} missed
                          </span>
                        ) : call.complianceRatePct !== null ? (
                          <span className="chip chip-ok text-[11px] tabular-nums">
                            {call.complianceRatePct}% followed
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[12px]">
                        {call.status === "completed" ? (
                          <span className="text-[#5A6882]">
                            {formatDate(call.auditedAt || call.createdAt)}
                          </span>
                        ) : call.status === "failed" ? (
                          <span className="chip chip-bad text-[11px]">Failed</span>
                        ) : (
                          <span className="chip chip-info text-[11px]">
                            {statusLabel(call.status as CallStatus)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCallId(call.id);
                          }}
                          className="rounded-lg border border-[#E3E9F5] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#2459E8] transition-colors hover:border-[#2459E8]/40 hover:bg-[#EEF3FF]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E9F5] bg-[#F8FAFF]/60 px-5 py-3 text-[12px] text-[#5A6882]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="tabular-nums">
              {filteredCalls.length === 0
                ? "0 results"
                : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filteredCalls.length)} of ${filteredCalls.length}`}
            </span>
            <Link href="/calls" className="font-semibold text-[#2459E8] hover:underline">
              Open full Calls library →
            </Link>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E3E9F5] bg-white px-2.5 py-1 font-semibold text-[#0A1A3F] disabled:opacity-45"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <span className="px-2 font-semibold tabular-nums text-[#0A1A3F]">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E3E9F5] bg-white px-2.5 py-1 font-semibold text-[#0A1A3F] disabled:opacity-45"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {selectedCall ? (
        <CallInspectionDrawer call={selectedCall} onClose={() => setSelectedCallId(null)} />
      ) : null}
    </div>
  );
}
