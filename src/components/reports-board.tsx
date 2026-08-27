"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { formatAht, scoreTone, verdictLabel } from "@/lib/format";
import { KpiStrip, PageHeader, scoreChipClass } from "@/components/ui";
import {
  REPORT_PERIODS,
  todayInNairobi,
  type QaReport,
  type ReportPeriod,
} from "@/lib/reports";

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: "Daily Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  annually: "Annual Report",
};

const Icons = {
  excel: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="17" />
      <line x1="16" y1="13" x2="8" y2="17" />
    </svg>
  ),
  pdf: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  filter: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
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
    <div className="space-y-6 pb-10">
      {!compact && (
        <PageHeader
          title="Score & Compliance Reports"
          description="Formal quality evaluation reports, compliance audit summaries, and multi-format downloadable records."
        />
      )}

      <section className="surface p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
            <span className="text-blue">{Icons.filter}</span>
            <span>Report Parameters</span>
          </div>
          {report && (
            <div className="text-[12px] text-muted flex items-center gap-1.5">
              <span>Selected Scope:</span>
              <span className="chip">{report.period_label}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="flex-1 grid gap-4 sm:grid-cols-2 items-end">
            {/* Period selector */}
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Report Period
              </label>
              <select
                className="field bg-slate-50/70 border-slate-200 text-ink text-[13px] font-medium"
                value={period}
                onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
              >
                {REPORT_PERIODS.map((item) => (
                  <option key={item} value={item}>
                    {PERIOD_LABEL[item]}
                  </option>
                ))}
              </select>
            </div>

            {/* Date selector */}
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Date in Period
              </label>
              <input
                type="date"
                className="field bg-slate-50/70 border-slate-200 text-ink text-[13px]"
                value={date}
                onChange={(event) => {
                  if (event.target.value) setDate(event.target.value);
                }}
              />
            </div>


          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            <button
              type="button"
              className="btn bg-white hover:bg-slate-50 text-slate-700 border border-line text-[13px] px-4 py-2 font-medium"
              disabled={Boolean(downloading) || loading}
              onClick={() => void download("xlsx")}
            >
              {Icons.excel}
              <span>{downloading === "xlsx" ? "Generating…" : "Export Excel"}</span>
            </button>
            <button
              type="button"
              className="btn bg-blue hover:bg-blue-2 text-white text-[13px] px-4 py-2 font-semibold"
              disabled={Boolean(downloading) || loading}
              onClick={() => void download("pdf")}
            >
              {Icons.pdf}
              <span>{downloading === "pdf" ? "Generating…" : "Export PDF"}</span>
            </button>
          </div>
        </div>
      </section>

      {error && <p className="alert-error">{error}</p>}

      {/* Summary KPI Cards */}
      {summary ? (
        <KpiStrip
          items={[
            {
              label: "Audited calls",
              value: String(summary.calls_audited),
              hint: `Range: ${report?.range_start} to ${report?.range_end}`,
            },
            {
              label: "Average QA score",
              value: summary.avg_overall != null ? `${summary.avg_overall}%` : "—",
              hint: summary.avg_overall != null ? verdictLabel(scoreTone(summary.avg_overall)) : "No score",
            },
            {
              label: "Compliance integrity",
              value: `${summary.calls_with_compliance_issue} calls`,
              hint: `${summary.total_compliance_findings} total findings logged`,
            },
            {
              label: "Avg handle time",
              value: formatAht(summary.aht_seconds),
              hint: `Total talk time: ${formatAht(summary.total_handling_seconds)}`,
            },
          ]}
        />
      ) : null}

      {/* Loading state */}
      {loading && (
        <div className="surface p-10 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-slate-200 border-t-blue animate-spin mr-3" />
          <span className="text-muted text-[13px] font-medium">Generating structured report dataset…</span>
        </div>
      )}

      {/* Tabbed Report Explorer */}
      {!compact && report && !loading && (
        <section className="surface overflow-hidden">
          {/* Tab navigation */}
          <div className="flex border-b border-slate-200 px-6 bg-slate-50 gap-6">
            <button
              onClick={() => setActiveTab("scores")}
              className={`py-3.5 font-bold text-[13px] transition-colors border-b-2 ${
                activeTab === "scores"
                  ? "border-blue text-blue"
                  : "border-transparent text-slate-500 hover:text-ink"
              }`}
            >
              Evaluated Call Scores ({report.calls.length})
            </button>
            <button
              onClick={() => setActiveTab("compliance")}
              className={`py-3.5 font-bold text-[13px] transition-colors border-b-2 ${
                activeTab === "compliance"
                  ? "border-blue text-blue"
                  : "border-transparent text-slate-500 hover:text-ink"
              }`}
            >
              Compliance Findings ({report.compliance.length})
            </button>

          </div>

          <div className="overflow-x-auto">
            {/* Tab 1: Scores Table */}
            {activeTab === "scores" && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Call Title / Recording</th>
                    <th className="px-6 py-3 text-right">AHT</th>
                    <th className="px-6 py-3 text-right">Score</th>
                    <th className="px-6 py-3">Verdict</th>
                    <th className="px-6 py-3">Audit Method</th>
                    <th className="px-6 py-3 text-right">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {report.calls.map((row) => (
                    <tr key={row.call_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap text-[12px]">
                        {new Intl.DateTimeFormat("en-KE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(row.audited_at))}
                      </td>
                      <td className="px-6 py-3.5">
                        <Link
                          href={`/calls/${row.call_id}/score`}
                          className="font-semibold text-ink hover:text-blue transition-colors line-clamp-1 max-w-xs"
                        >
                          {row.title}
                        </Link>
                      </td>

                      <td className="px-6 py-3.5 text-right whitespace-nowrap tabular-nums text-slate-600 text-[12px]">
                        {formatAht(row.duration_seconds)}
                      </td>

                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <span className={`${scoreChipClass(row.overall_score)} tabular-nums`}>
                          {row.overall_score}%
                        </span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="chip capitalize">
                          {String(row.verdict).replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 text-[12px] whitespace-nowrap capitalize">
                        {row.audit_mode || "Standard"}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        {row.compliance_findings.length > 0 ? (
                          <span className="chip chip-bad">
                            {row.compliance_findings.length} Flagged
                          </span>
                        ) : (
                          <span className="chip chip-ok">
                            Clean
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {!report.calls.length && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted text-[13px] italic">
                        No audited call evaluations logged for this timeframe.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Tab 2: Compliance Findings */}
            {activeTab === "compliance" && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Call Title</th>

                    <th className="px-6 py-3">Compliance Finding / Breach Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {report.compliance.map((row, index) => (
                    <tr key={`${row.call_id}-${index}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap text-[12px]">
                        {new Intl.DateTimeFormat("en-KE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(row.audited_at))}
                      </td>
                      <td className="px-6 py-3.5">
                        <Link
                          href={`/calls/${row.call_id}/score`}
                          className="font-semibold text-ink hover:text-blue transition-colors"
                        >
                          {row.title}
                        </Link>
                      </td>

                      <td className="px-6 py-3.5 font-medium leading-relaxed max-w-lg">
                        <div className="p-2.5 border-l-2 border-rose text-[12px]">
                          {row.finding}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!report.compliance.length && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted font-medium text-[13px]">
                        Zero compliance findings recorded for this evaluation period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}


          </div>
        </section>
      )}
    </div>
  );
}
