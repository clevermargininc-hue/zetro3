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
  custom: "Custom range",
};

const DIMENSIONS: { key: keyof WorkspaceAnalytics["dimensions"]; label: string }[] = [
  { key: "greeting", label: "Greeting" },
  { key: "empathy", label: "Empathy" },
  { key: "professionalism", label: "Professionalism" },
  { key: "resolution", label: "Resolution" },
  { key: "communication", label: "Communication" },
  { key: "language_handling", label: "Language mix" },
];

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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-line/40 pb-6">
        <div>
          <p className="page-kicker">Insights</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
          <p className="mt-2 text-[14px] text-muted max-w-2xl">
            Track QA volume, compliance, handling time, and coaching needs by period and by any set of
            agents.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/reports" className="btn btn-ghost text-[13px]">
            Downloadable reports
          </Link>
          <Link href="/upload" className="btn bg-ink text-white hover:bg-ink/90 text-[13px] px-5">
            Upload call
          </Link>
        </div>
      </div>

      <section className="panel rounded-2xl p-6 shadow-sm space-y-5">
        <div className="grid gap-4 md:grid-cols-3 items-end">
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-muted">Time period</span>
            <select
              className="field bg-surface-2 shadow-inner"
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
          </label>

          {period === "custom" ? (
            <>
              <label className="block">
                <span className="mb-2 block text-[13px] font-semibold text-muted">From</span>
                <input
                  type="date"
                  className="field bg-surface-2 shadow-inner"
                  value={from}
                  onChange={(event) => {
                    if (event.target.value) setFrom(event.target.value);
                  }}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[13px] font-semibold text-muted">To</span>
                <input
                  type="date"
                  className="field bg-surface-2 shadow-inner"
                  value={to}
                  onChange={(event) => {
                    if (event.target.value) setTo(event.target.value);
                  }}
                />
              </label>
            </>
          ) : (
            <label className="block md:col-span-2">
              <span className="mb-2 block text-[13px] font-semibold text-muted">
                Date in period
              </span>
              <input
                type="date"
                className="field bg-surface-2 shadow-inner max-w-xs"
                value={date}
                onChange={(event) => {
                  if (event.target.value) setDate(event.target.value);
                }}
              />
            </label>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-[13px] font-semibold text-muted">Agents</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`btn text-[12px] px-3 py-1.5 ${allAgents ? "btn-blue" : "btn-ghost border border-line"}`}
                onClick={selectAllAgents}
              >
                All agents
              </button>
              <button
                type="button"
                className={`btn text-[12px] px-3 py-1.5 ${
                  !allAgents && includeUnassigned
                    ? "btn-blue"
                    : "btn-ghost border border-line"
                }`}
                onClick={() => {
                  setAllAgents(false);
                  setIncludeUnassigned((v) => !v);
                }}
              >
                Unassigned
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {agentOptions.map((agent) => {
              const active = !allAgents && selectedAgentIds.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggleAgent(agent.id)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "border-blue bg-blue text-white"
                      : "border-line/70 bg-surface-2 text-ink hover:border-blue/40"
                  }`}
                >
                  {agent.name}
                </button>
              );
            })}
            {!agentOptions.length ? (
              <p className="text-[13px] text-muted">No agents yet. Assign names at upload.</p>
            ) : null}
          </div>
          <p className="mt-3 text-[12px] text-muted">
            Select one agent, several agents, or keep All agents. Custom range uses inclusive start and
            end dates (Africa/Nairobi).
          </p>
        </div>
      </section>

      {error ? <p className="alert-error">{error}</p> : null}

      {data?.filter ? (
        <p className="text-[13px] text-muted">
          Showing <span className="font-semibold text-ink">{data.filter.period_label}</span>
          {" · "}
          <span className="font-semibold text-ink">{data.filter.agent_label}</span>
          {loading ? " · Updating…" : null}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="text-[14px] text-muted">Loading analytics…</p>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total Calls" value={String(data.uploaded)} hint="Uploaded in period" />
            <Stat
              label="Audited"
              value={String(data.audited)}
              hint={auditCoverage != null ? `${auditCoverage}% coverage` : undefined}
            />
            <Stat
              label="Team Avg Score"
              value={data.avg_score == null ? "—" : String(data.avg_score)}
              tone={scoreTone(data.avg_score)}
            />
            <Stat
              label="Compliance Rate"
              value={data.compliance_rate == null ? "—" : `${data.compliance_rate}%`}
              tone={scoreTone(data.compliance_rate)}
              hint={
                data.audited
                  ? `${data.compliance_issues} calls with findings`
                  : undefined
              }
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Avg Handle Time"
              value={formatHandlingTime(data.avg_handling_seconds)}
            />
            <Stat
              label="Total Time"
              value={formatHandlingTime(data.total_handling_seconds)}
            />
            <Stat
              label="Queue Status"
              value={String(data.not_audited)}
              hint={`${data.preparing} prep · ${data.failed} failed`}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Panel title="Verdict mix" subtitle="Across audited calls in this filter">
              {data.audited ? (
                <div className="space-y-3">
                  {(
                    [
                      ["excellent", data.verdicts.excellent],
                      ["good", data.verdicts.good],
                      ["needs_improvement", data.verdicts.needs_improvement],
                      ["poor", data.verdicts.poor],
                    ] as const
                  ).map(([key, count]) => (
                    <BarRow
                      key={key}
                      label={verdictLabel(key)}
                      value={count}
                      max={data.audited}
                      tone={
                        key === "excellent" || key === "good"
                          ? "good"
                          : key === "needs_improvement"
                            ? "warn"
                            : "rose"
                      }
                    />
                  ))}
                </div>
              ) : (
                <Empty text="No audited calls in this period/agent filter." href="/upload" cta="Upload a call" />
              )}
            </Panel>

            <Panel title="Audit paths" subtitle="How calls were scored">
              {data.audited ? (
                <div className="space-y-3">
                  <BarRow
                    label="Documents audit"
                    value={data.documents_audits}
                    max={data.audited}
                    tone="good"
                  />
                  <BarRow
                    label="Automatic audit"
                    value={data.automatic_audits}
                    max={data.audited}
                    tone="warn"
                  />
                  <div className="pt-2 grid grid-cols-2 gap-3 text-[13px]">
                    <MiniStat label="Preparing" value={String(data.preparing)} />
                    <MiniStat label="Failed prep" value={String(data.failed)} />
                  </div>
                </div>
              ) : (
                <Empty text="Audit a call to populate path mix." href="/calls" cta="Open calls" />
              )}
            </Panel>
          </section>

          <Panel title="Category Performance" subtitle="Average scores across audited calls">
            {data.audited ? (
              <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {DIMENSIONS.map((dim) => {
                  const value = data.dimensions[dim.key];
                  const dimTone = value != null ? scoreTone(value) : undefined;
                  const barColor =
                    dimTone === "excellent" || dimTone === "good"
                      ? "bg-good"
                      : dimTone === "warn"
                        ? "bg-warn"
                        : dimTone === "poor"
                          ? "bg-rose"
                          : "bg-surface-3";

                  return (
                    <div key={dim.key} className="space-y-2.5">
                      <div className="flex justify-between items-end">
                        <span className="text-[13px] font-bold uppercase tracking-wide text-muted">
                          {dim.label}
                        </span>
                        <span className="text-[16px] font-bold tabular-nums text-ink">{value ?? "—"}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2 border border-line/50">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
                          style={{ width: `${value ?? 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty text="Dimension averages appear after scoring." href="/score" cta="Score queue" />
            )}
          </Panel>

          <section className="grid gap-6 lg:grid-cols-2">
            <Panel title="Top performers" subtitle="Highest averages in this filter">
              <AgentList
                rows={data.top_performers}
                empty="No top performers in this filter."
                mode="top"
              />
            </Panel>
            <Panel title="Needs coaching" subtitle="Lower averages or weak verdicts">
              <AgentList
                rows={data.coaching_needed}
                empty="No coaching flags in this filter."
                mode="coach"
              />
            </Panel>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Panel title="Agent table" subtitle="Agents with audited calls in this filter">
              {data.agents.length ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Avg</th>
                        <th>Calls</th>
                        <th>Excellent</th>
                        <th>Coaching flags</th>
                        <th>Handle time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.agents.map((row) => (
                        <tr key={row.id}>
                          <td className="font-medium text-ink">{row.name}</td>
                          <td className="tabular-nums">{row.avg_score ?? "—"}</td>
                          <td className="tabular-nums">{row.call_count}</td>
                          <td className="tabular-nums">{row.excellent}</td>
                          <td className="tabular-nums">{row.needs_coaching}</td>
                          <td className="tabular-nums">
                            {formatHandlingTime(row.total_handling_seconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty text="No agent analytics in this filter." href="/upload" cta="Upload with agent name" />
              )}
            </Panel>

            <Panel title="Language mix" subtitle="Detected / selected languages">
              {data.languages.length ? (
                <div className="space-y-3">
                  {data.languages.map((row) => (
                    <BarRow
                      key={row.label}
                      label={row.label}
                      value={row.count}
                      max={data.uploaded || 1}
                      tone="good"
                    />
                  ))}
                </div>
              ) : (
                <Empty text="No calls in this filter." href="/upload" cta="Upload" />
              )}
            </Panel>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: ReturnType<typeof scoreTone> | "warn";
}) {
  const color =
    tone === "excellent" || tone === "good"
      ? "text-good"
      : tone === "warn"
        ? "text-warn"
        : tone === "poor"
          ? "text-rose"
          : "text-ink";

  return (
    <div className="bg-white rounded-3xl p-6 border border-line/40 shadow-sm flex flex-col justify-between">
      <p className="text-[13px] font-bold text-muted uppercase tracking-wide">{label}</p>
      <div className="mt-4">
        <p className={`text-4xl font-bold tracking-tight tabular-nums ${color}`}>{value}</p>
        {hint ? <p className="mt-2 text-[13px] font-medium text-muted/80">{hint}</p> : null}
      </div>
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
    <section className="panel rounded-3xl overflow-hidden border border-line/40">
      <div className="border-b border-line/40 px-6 py-5 bg-white/50">
        <h2 className="text-[16px] font-bold tracking-tight text-ink">{title}</h2>
        <p className="text-[12px] text-muted mt-0.5">{subtitle}</p>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function BarRow({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "good" | "warn" | "rose";
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const bar = tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-rose";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-muted">
          {value} · {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2 border border-line/40">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/40 bg-surface-2/50 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted font-bold">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function AgentList({
  rows,
  empty,
  mode,
}: {
  rows: AnalyticsAgentRow[];
  empty: string;
  mode: "top" | "coach";
}) {
  if (!rows.length) {
    return <p className="text-[14px] text-muted">{empty}</p>;
  }

  return (
    <ul className="flex flex-col">
      {rows.map((row, index) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 py-3 border-b border-line/40 last:border-0"
        >
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink truncate">
              {index + 1}. {row.name}
            </p>
            <p className="text-[13px] text-muted mt-0.5">
              {row.call_count} audited · {row.excellent} excellent
              {mode === "coach" ? ` · ${row.needs_coaching} coaching flags` : ""}
            </p>
          </div>
          <p
            className={`text-[18px] font-bold tabular-nums ${
              (row.avg_score ?? 0) >= 70 ? "text-good" : "text-rose"
            }`}
          >
            {row.avg_score ?? "—"}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Empty({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="text-center py-6">
      <p className="text-[14px] text-muted">{text}</p>
      <Link href={href} className="btn btn-blue mt-4 text-[13px]">
        {cta}
      </Link>
    </div>
  );
}
