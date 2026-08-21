"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { scoreTone } from "@/lib/format";
import {
  REPORT_PERIODS,
  todayInNairobi,
  type QaReport,
  type ReportPeriod,
} from "@/lib/reports";

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  annually: "Annually",
};

export function ReportsBoard({ compact = false }: { compact?: boolean }) {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [date, setDate] = useState(todayInNairobi);
  const [agentId, setAgentId] = useState("all");
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [report, setReport] = useState<QaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<"xlsx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"scores" | "compliance" | "agents">("scores");

  const query = useMemo(() => {
    const params = new URLSearchParams({ period, date, agentId });
    return params.toString();
  }, [period, date, agentId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/reports?${query}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not load report");
      setReport(body as QaReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void authFetch("/api/agents")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(body.agents)) setAgents(body.agents);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function download(format: "xlsx" | "pdf") {
    setDownloading(format);
    setError(null);
    try {
      const res = await authFetch(`/api/reports/export?${query}&format=${format}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not download report");
      }
      const blob = await res.blob();
      const name =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ||
        `zetro-report.${format === "xlsx" ? "xlsx" : "pdf"}`;
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download report");
    } finally {
      setDownloading(null);
    }
  }

  const summary = report?.summary;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Reports</p>
          {!compact ? (
            <>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Score & Compliance Reports</h1>
              <p className="mt-2 max-w-2xl text-[15px] text-muted">
                Daily, weekly, monthly, and annual QA reports for one agent or the whole team.
              </p>
            </>
          ) : (
            <h2 className="mt-2 text-xl font-bold">Downloadable QA reports</h2>
          )}
        </div>
        {compact ? (
          <Link href="/reports" className="btn btn-ghost">
            Open full report
          </Link>
        ) : null}
      </div>

      <section className="panel rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1 grid gap-4 md:grid-cols-3 items-end">
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-muted">Time Period</span>
              <select
                className="field bg-surface-2 shadow-inner"
                value={period}
                onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
              >
                {REPORT_PERIODS.map((item) => (
                  <option key={item} value={item}>
                    {PERIOD_LABEL[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-muted">Date In Period</span>
              <input
                type="date"
                className="field bg-surface-2 shadow-inner"
                value={date}
                onChange={(event) => {
                  if (event.target.value) setDate(event.target.value);
                }}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-muted">Agent Filter</span>
              <select
                className="field bg-surface-2 shadow-inner"
                value={agentId}
                onChange={(event) => setAgentId(event.target.value)}
              >
                <option value="all">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="btn btn-blue shadow-md shadow-blue/20 hover:-translate-y-0.5 active:translate-y-0"
              disabled={Boolean(downloading) || loading}
              onClick={() => void download("xlsx")}
            >
              {downloading === "xlsx" ? "Preparing Excel…" : "↓ Download Excel"}
            </button>
            <button
              type="button"
              className="btn btn-ghost border border-line hover:bg-surface-2 hover:-translate-y-0.5 active:translate-y-0"
              disabled={Boolean(downloading) || loading}
              onClick={() => void download("pdf")}
            >
              {downloading === "pdf" ? "Preparing PDF…" : "↓ Download PDF"}
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="alert-error">{error}</p> : null}

      {summary ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Calls Audited" value={String(summary.calls_audited)} />
          <Stat
            label="Average Score"
            value={summary.avg_overall == null ? "—" : String(summary.avg_overall)}
            tone={scoreTone(summary.avg_overall)}
          />
          <Stat
            label="Compliance Issues"
            value={`${summary.calls_with_compliance_issue} calls`}
            hint={`${summary.total_compliance_findings} total findings`}
            tone={summary.calls_with_compliance_issue > 0 ? "poor" : "good"}
          />
          <Stat
            label="Scope"
            value={report?.agent_label || "All agents"}
            hint={report?.period_label}
          />
        </section>
      ) : null}

      {loading ? (
        <div className="panel p-10 flex items-center justify-center rounded-2xl">
          <div className="h-5 w-5 rounded-full border-2 border-line border-t-blue animate-spin"></div>
          <span className="ml-3 text-muted">Loading report data…</span>
        </div>
      ) : null}

      {!compact && report && !loading ? (
        <div className="panel rounded-2xl overflow-hidden shadow-sm">
          <div className="flex border-b border-line/50 px-6 pt-4 gap-8">
            <button
              onClick={() => setActiveTab("scores")}
              className={`pb-3 font-bold text-[14px] transition-colors border-b-2 ${
                activeTab === "scores" ? "border-blue text-blue" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              Call Scores ({report.calls.length})
            </button>
            <button
              onClick={() => setActiveTab("compliance")}
              className={`pb-3 font-bold text-[14px] transition-colors border-b-2 ${
                activeTab === "compliance" ? "border-blue text-blue" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              Compliance Findings ({report.compliance.length})
            </button>
            {(report.agents.length > 1 || (report.agent_id == null && report.agents.length > 0)) && (
              <button
                onClick={() => setActiveTab("agents")}
                className={`pb-3 font-bold text-[14px] transition-colors border-b-2 ${
                  activeTab === "agents" ? "border-blue text-blue" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                By Agent
              </button>
            )}
          </div>

          <div className="p-0 overflow-x-auto">
            {activeTab === "scores" && (
              <table className="data-table w-full text-left">
                <thead className="bg-surface/50 text-[12px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-6 py-4 font-semibold">When</th>
                    <th className="px-6 py-4 font-semibold">Call</th>
                    <th className="px-6 py-4 font-semibold">Agent</th>
                    <th className="px-6 py-4 font-semibold">Score</th>
                    <th className="px-6 py-4 font-semibold">Verdict</th>
                    <th className="px-6 py-4 font-semibold">Path</th>
                    <th className="px-6 py-4 font-semibold">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/30">
                  {report.calls.map((row) => (
                    <tr key={row.call_id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="px-6 py-4 text-[13px] text-muted whitespace-nowrap">
                        {new Intl.DateTimeFormat("en-KE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(row.audited_at))}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/calls/${row.call_id}/score`} className="font-semibold text-ink hover:text-blue transition-colors">
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[14px] text-ink">{row.agent_name}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold tabular-nums ${row.overall_score >= 80 ? 'text-good' : row.overall_score >= 60 ? 'text-warn' : 'text-rose'}`}>
                          {row.overall_score}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize badge bg-surface-2 text-ink">
                          {String(row.verdict).replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-muted">{row.audit_mode || "—"}</td>
                      <td className="px-6 py-4">
                        {row.compliance_findings.length ? (
                          <span className="badge bg-rose/10 text-rose border border-rose/20">
                            {row.compliance_findings.length} Finding{row.compliance_findings.length === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-muted text-[13px]">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!report.calls.length && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-[14px] text-muted italic">
                        No audited calls in this period for the selected agent.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "compliance" && (
              <table className="data-table w-full text-left">
                <thead className="bg-surface/50 text-[12px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-6 py-4 font-semibold">When</th>
                    <th className="px-6 py-4 font-semibold">Call</th>
                    <th className="px-6 py-4 font-semibold">Agent</th>
                    <th className="px-6 py-4 font-semibold">Finding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/30">
                  {report.compliance.map((row, index) => (
                    <tr key={`${row.call_id}-${index}`} className="hover:bg-surface-2/30 transition-colors">
                      <td className="px-6 py-4 text-[13px] text-muted whitespace-nowrap">
                        {new Intl.DateTimeFormat("en-KE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(row.audited_at))}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/calls/${row.call_id}/score`} className="font-semibold text-ink hover:text-blue transition-colors">
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[14px] text-ink">{row.agent_name}</td>
                      <td className="px-6 py-4 text-[14px] text-rose font-medium leading-relaxed">{row.finding}</td>
                    </tr>
                  ))}
                  {!report.compliance.length && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-[14px] text-muted italic">
                        No compliance findings in this period!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "agents" && (
              <table className="data-table w-full text-left">
                <thead className="bg-surface/50 text-[12px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Agent</th>
                    <th className="px-6 py-4 font-semibold">Calls Audited</th>
                    <th className="px-6 py-4 font-semibold">Avg Score</th>
                    <th className="px-6 py-4 font-semibold">Excellent</th>
                    <th className="px-6 py-4 font-semibold">Poor</th>
                    <th className="px-6 py-4 font-semibold">Compliance Findings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/30">
                  {report.agents.map((row) => (
                    <tr key={row.agent_id || row.agent_name} className="hover:bg-surface-2/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-ink">{row.agent_name}</td>
                      <td className="px-6 py-4 text-[14px] text-ink">{row.call_count}</td>
                      <td className="px-6 py-4">
                         <span className={`font-bold tabular-nums ${row.avg_score != null ? (row.avg_score >= 80 ? 'text-good' : row.avg_score >= 60 ? 'text-warn' : 'text-rose') : 'text-muted'}`}>
                          {row.avg_score ?? "—"}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-good font-semibold">{row.excellent}</td>
                      <td className="px-6 py-4 text-rose font-semibold">{row.poor}</td>
                      <td className="px-6 py-4 text-[13px] text-muted">
                        <span className={row.compliance_findings > 0 ? "text-rose font-semibold" : ""}>{row.compliance_findings} findings</span> in {row.compliance_calls} calls
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
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
  tone?: ReturnType<typeof scoreTone>;
}) {
  const color =
    tone === "excellent" || tone === "good"
      ? "text-good"
      : tone === "warn"
        ? "text-warn"
        : tone === "poor"
          ? "text-rose"
          : "text-ink";
          
  const bgGradient = 
    tone === "excellent" || tone === "good"
      ? "from-good/5 to-transparent border-good/20 shadow-good/5"
      : tone === "poor"
          ? "from-rose/5 to-transparent border-rose/20 shadow-rose/5"
          : "bg-surface";

  return (
    <div className={`panel rounded-2xl p-6 transition-all duration-300 bg-gradient-to-br ${bgGradient}`}>
      <p className="text-[13px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${color}`}>{value}</p>
      {hint ? <p className="mt-2 text-[13px] font-medium text-muted/80">{hint}</p> : null}
    </div>
  );
}
