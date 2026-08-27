"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { scoreTone, verdictLabel } from "@/lib/format";
import {
  formatHandlingTime,
  type AnalyticsAgentRow,
  type AnalyticsPeriodMode,
  type WorkspaceAnalytics,
} from "@/lib/analytics";
import { REPORT_PERIODS, todayInNairobi, type ReportPeriod } from "@/lib/reports";

const PERIOD_LABEL: Record<AnalyticsPeriodMode, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  annually: "Annually",
  custom: "Custom Range",
};

const DIMENSIONS: { key: keyof WorkspaceAnalytics["dimensions"]; label: string }[] = [
  { key: "greeting", label: "Greeting & Identity" },
  { key: "empathy", label: "Empathy & Active Listening" },
  { key: "professionalism", label: "Professional Demeanor" },
  { key: "resolution", label: "Issue Resolution" },
  { key: "communication", label: "Communication Clarity" },
  { key: "language_handling", label: "Language Mix Handling" },
];

const Icons = {
  calendar: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  download: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  upload: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  filter: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  alertCircle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  user: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

export function AnalyticsBoard() {
  const [period, setPeriod] = useState<AnalyticsPeriodMode>("monthly");
  const [date, setDate] = useState(todayInNairobi);
  const [from, setFrom] = useState(todayInNairobi);
  const [to, setTo] = useState(todayInNairobi);
  const [allAgents, setAllAgents] = useState(true);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [includeUnassigned, setIncludeUnassigned] = useState(false);
  const [agentOptions, setAgentOptions] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<WorkspaceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (period === "custom") {
      params.set("from", from);
      params.set("to", to);
    } else {
      params.set("date", date);
    }
    if (allAgents) {
      params.set("agents", "all");
    } else {
      const ids = [...selectedAgentIds];
      if (includeUnassigned) ids.push("unassigned");
      params.set("agents", ids.length ? ids.join(",") : "none");
    }
    return params.toString();
  }, [period, date, from, to, allAgents, selectedAgentIds, includeUnassigned]);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        setLoading(true);
        try {
          const res = await authFetch(`/api/analytics?${query}`);
          const body = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (!res.ok) throw new Error(body.error || "Could not load analytics");
          setData(body.analytics as WorkspaceAnalytics);
          if (Array.isArray(body.agents)) setAgentOptions(body.agents);
          setError(null);
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Could not load analytics");
          setData(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  function toggleAgent(id: string) {
    setAllAgents(false);
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function selectAllAgents() {
    setAllAgents(true);
    setSelectedAgentIds([]);
    setIncludeUnassigned(false);
  }

  const auditCoverage =
    data && data.uploaded > 0 ? Math.round((data.audited / data.uploaded) * 100) : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="pb-5 border-b border-line/60">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Analytics & Performance</h1>
        <p className="mt-1 text-[13px] text-muted">
          Cross-sectional evaluation metrics, QA compliance trends, handle times, and coaching priorities.
        </p>
      </div>

      {/* Filter Control Bar */}
      <section className="bg-white rounded-lg p-5 border border-line shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
            <span className="text-blue">{Icons.filter}</span>
            <span>Analytics Filters</span>
          </div>
          {data?.filter && (
            <div className="text-[12px] text-muted flex items-center gap-1.5">
              <span>Scope:</span>
              <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {data.filter.period_label}
              </span>
              {loading && <span className="text-blue font-medium animate-pulse ml-1">Updating…</span>}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3 items-end">
          {/* Period selector */}
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Period Type
            </label>
            <select
              className="field bg-slate-50/70 border-slate-200 text-ink text-[13px] font-medium"
              value={period}
              onChange={(event) => setPeriod(event.target.value as AnalyticsPeriodMode)}
            >
              {REPORT_PERIODS.map((item) => (
                <option key={item} value={item}>
                  {PERIOD_LABEL[item as ReportPeriod]}
                </option>
              ))}
              <option value="custom">{PERIOD_LABEL.custom}</option>
            </select>
          </div>

          {/* Date Range inputs */}
          {period === "custom" ? (
            <>
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  className="field bg-slate-50/70 border-slate-200 text-ink text-[13px]"
                  value={from}
                  onChange={(event) => {
                    if (event.target.value) setFrom(event.target.value);
                  }}
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  className="field bg-slate-50/70 border-slate-200 text-ink text-[13px]"
                  value={to}
                  onChange={(event) => {
                    if (event.target.value) setTo(event.target.value);
                  }}
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Reference Date (Africa/Nairobi)
              </label>
              <input
                type="date"
                className="field bg-slate-50/70 border-slate-200 text-ink text-[13px] max-w-sm"
                value={date}
                onChange={(event) => {
                  if (event.target.value) setDate(event.target.value);
                }}
              />
            </div>
          )}
        </div>


      </section>

      {error && <p className="alert-error">{error}</p>}

      {loading && !data && (
        <div className="p-12 text-center text-muted text-[14px]">
          <span className="animate-pulse">Loading analytics dataset…</span>
        </div>
      )}

      {data && (
        <>
          {/* Top 4 Executive KPI Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1: Quality Score */}
            <StatCard
              label="Team QA Score"
              value={data.avg_score != null ? `${data.avg_score}%` : "—"}
              tone={scoreTone(data.avg_score)}
              subtitle={data.avg_score != null ? verdictLabel(scoreTone(data.avg_score)) : "No score available"}
              footer={`Coverage: ${auditCoverage != null ? `${auditCoverage}%` : "0%"} of uploaded calls`}
            />

            {/* KPI 2: Evaluated Volume */}
            <StatCard
              label="Audited Volume"
              value={String(data.audited)}
              subtitle={`${data.uploaded} calls total`}
              footer={`${data.not_audited} pending in queue`}
            />

            {/* KPI 3: Compliance Rate */}
            <StatCard
              label="Compliance Pass Rate"
              value={data.compliance_rate != null ? `${data.compliance_rate}%` : "—"}
              tone={scoreTone(data.compliance_rate)}
              subtitle={data.compliance_issues > 0 ? `${data.compliance_issues} calls flagged` : "Zero compliance breaches"}
              footer="Based on organization SOP rules"
            />

            {/* KPI 4: Handling Time */}
            <StatCard
              label="Avg Handle Time (AHT)"
              value={formatHandlingTime(data.avg_handling_seconds)}
              subtitle={`Total: ${formatHandlingTime(data.total_handling_seconds)}`}
              footer="Audited audio interaction duration"
            />
          </section>

          {/* Core Visual Breakdown: Dimensions & Verdict Mix */}
          <section className="grid gap-6 lg:grid-cols-12">
            {/* Left 7 cols: Category Performance (6 Dimensions) */}
            <div className="lg:col-span-7">
              <Panel
                title="Quality Dimensions Benchmark"
                subtitle="Evaluation score breakdown across the 6 core customer service pillars"
              >
                {data.audited > 0 ? (
                  <div className="space-y-4 pt-1">
                    {DIMENSIONS.map((dim) => {
                      const value = data.dimensions[dim.key];
                      const dimTone = value != null ? scoreTone(value) : undefined;
                      const barColor =
                        dimTone === "excellent" || dimTone === "good"
                          ? "bg-emerald-500"
                          : dimTone === "warn"
                          ? "bg-amber-500"
                          : dimTone === "poor"
                          ? "bg-rose-500"
                          : "bg-slate-200";

                      return (
                        <div key={dim.key} className="space-y-1.5">
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="font-medium text-slate-700">{dim.label}</span>
                            <span className="font-bold tabular-nums text-ink">{value != null ? `${value}/100` : "—"}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor} transition-all duration-500`}
                              style={{ width: `${value ?? 0}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty text="Dimension averages will appear after calls are scored." href="/calls" cta="Open Call Audits" />
                )}
              </Panel>
            </div>

            {/* Right 5 cols: Verdict Mix & Audit Paths */}
            <div className="lg:col-span-5 space-y-6">
              {/* Verdict Distribution */}
              <Panel title="Score Verdict Distribution" subtitle="Proportion of calls by quality band">
                {data.audited > 0 ? (
                  <div className="space-y-3 pt-1">
                    {(
                      [
                        ["excellent", data.verdicts.excellent, "bg-emerald-500"],
                        ["good", data.verdicts.good, "bg-blue-500"],
                        ["needs_improvement", data.verdicts.needs_improvement, "bg-amber-500"],
                        ["poor", data.verdicts.poor, "bg-rose-500"],
                      ] as const
                    ).map(([key, count, color]) => {
                      const pct = data.audited > 0 ? Math.round((count / data.audited) * 100) : 0;
                      return (
                        <div key={key}>
                          <div className="mb-1 flex items-center justify-between text-[12px]">
                            <span className="font-medium text-slate-700">{verdictLabel(key)}</span>
                            <span className="tabular-nums font-bold text-ink">
                              {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty text="No audited calls found for this filter." href="/upload" cta="Upload Call" />
                )}
              </Panel>

              {/* Audit Methods & Language Breakdown */}
              <Panel title="Evaluation Methodology & Languages" subtitle="Breakdown of audit paths and language context">
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">SOP Document Audits</span>
                      <span className="text-xl font-bold tabular-nums text-ink">{data.documents_audits}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Standard AI Audits</span>
                      <span className="text-xl font-bold tabular-nums text-ink">{data.automatic_audits}</span>
                    </div>
                  </div>

                  {data.languages.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Detected Language Mix</span>
                      <div className="flex flex-wrap gap-2">
                        {data.languages.map((lang) => (
                          <span
                            key={lang.label}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            <span>{lang.label}:</span>
                            <span className="font-bold">{lang.count} calls</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </section>


        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  footer,
  tone,
}: {
  label: string;
  value: string;
  subtitle?: string;
  footer?: string;
  tone?: ReturnType<typeof scoreTone>;
}) {
  const isGood = tone === "excellent" || tone === "good";
  const isWarn = tone === "warn";
  const isPoor = tone === "poor";

  const color = isGood
    ? "text-good"
    : isWarn
    ? "text-warn"
    : isPoor
    ? "text-rose"
    : "text-ink";

  return (
    <div className="bg-white rounded-lg p-5 border border-line shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">{label}</span>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold tracking-tight tabular-nums ${color}`}>{value}</span>
        </div>
        {subtitle && <p className="mt-1 text-[12px] font-medium text-slate-600">{subtitle}</p>}
      </div>
      {footer && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-muted font-medium truncate">
          {footer}
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg border border-line shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
        <p className="text-[12px] text-muted mt-0.5">{subtitle}</p>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function CohortList({
  rows,
  empty,
  mode,
}: {
  rows: AnalyticsAgentRow[];
  empty: string;
  mode: "top" | "coach";
}) {
  if (!rows.length) {
    return <p className="text-[13px] text-muted py-4 text-center">{empty}</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {rows.map((row, index) => (
        <div key={row.id} className="py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${
                mode === "top" ? "bg-slate-900 text-white" : "bg-rose/10 text-rose border border-rose/20"
              }`}
            >
              {index + 1}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink truncate">{row.name}</p>
              <p className="text-[11px] text-muted">
                {row.call_count} audited · {row.excellent} excellent
                {mode === "coach" && row.needs_coaching > 0 ? (
                  <span className="text-rose font-medium ml-1">({row.needs_coaching} flags)</span>
                ) : null}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-bold tabular-nums border ${
              (row.avg_score ?? 0) >= 80
                ? "bg-good/10 text-good border-good/20"
                : (row.avg_score ?? 0) >= 60
                ? "bg-warn/10 text-warn border-warn/20"
                : "bg-rose/10 text-rose border-rose/20"
            }`}
          >
            {row.avg_score ?? "—"}%
          </span>
        </div>
      ))}
    </div>
  );
}

function Empty({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="text-center py-6">
      <p className="text-[13px] text-muted">{text}</p>
      <Link href={href} className="btn bg-blue hover:bg-blue-2 text-white mt-4 text-[12px] px-4 py-1.5 font-semibold">
        {cta}
      </Link>
    </div>
  );
}
