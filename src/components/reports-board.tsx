"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { formatAht, verdictLabel } from "@/lib/format";
import { ReportBriefing } from "@/components/report-briefing";
import { PageHeader, scoreChipClass } from "@/components/ui";
import { REPORT_PERIODS, todayInNairobi, type QaReport, type ReportPeriod } from "@/lib/reports";

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  annually: "Annual",
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
  print: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
};

type DetailTab = "calls" | "customers" | "agents";

export function ReportsBoard({ compact = false }: { compact?: boolean }) {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [date, setDate] = useState(todayInNairobi);
  const [agentId, setAgentId] = useState("all");
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [report, setReport] = useState<QaReport | null>(null);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("calls");

  const query = useMemo(() => {
    const params = new URLSearchParams({ period, date, agentId });
    return params.toString();
  }, [period, date, agentId]);

  const loading = loadedQuery !== query;

  const load = useCallback(
    () =>
      authFetch(`/api/reports?${query}`)
        .then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || "Could not load report");
          setReport(body as QaReport);
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Could not load report");
          setReport(null);
        })
        .finally(() => setLoadedQuery(query)),
    [query],
  );

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

  async function downloadSpreadsheet() {
    setDownloading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/reports/export?${query}&format=xlsx`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not download spreadsheet");
      }
      const blob = await res.blob();
      const name =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ||
        "zetro-report.xlsx";
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download spreadsheet");
    } finally {
      setDownloading(false);
    }
  }

  const briefing = report?.briefing;

  return (
    <div className="space-y-6 pb-10">
      {!compact && (
        <div className="no-print">
          <PageHeader
            title="Reports"
            description="Who to coach, which calls to review, and what customers said. Print this for the huddle, or download the spreadsheet for the raw rows."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn btn-blue text-[13px] px-4 py-2"
                  disabled={loading || !briefing}
                  onClick={() => window.print()}
                >
                  {Icons.print}
                  <span>Print briefing</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-[13px] px-4 py-2"
                  disabled={Boolean(downloading) || loading}
                  onClick={() => void downloadSpreadsheet()}
                >
                  {Icons.excel}
                  <span>{downloading ? "Generating…" : "Spreadsheet"}</span>
                </button>
              </div>
            }
          />
        </div>
      )}

      <section className="surface p-4 no-print">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
              Period
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
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
              Date in period
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
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
              Agent
            </label>
            <select
              className="field bg-slate-50/70 border-slate-200 text-ink text-[13px] font-medium"
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
            >
              <option value="all">All agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {error ? <p className="alert-error no-print">{error}</p> : null}

      {loading ? (
        <div className="surface flex items-center justify-center p-10 no-print">
          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue" />
          <span className="text-[13px] font-medium text-muted">Building the briefing…</span>
        </div>
      ) : null}

      {!loading && report && !report.calls.length ? (
        <p className="surface px-5 py-8 text-center text-[13px] text-muted">
          No scored calls in this period. Pick another date or a longer period.
        </p>
      ) : null}

      {!loading && report && briefing && report.calls.length ? <ReportBriefing report={report} briefing={briefing} /> : null}

      {!compact && report && !loading && report.calls.length ? (
        <section className="surface overflow-hidden no-print">
          <div className="flex flex-wrap gap-6 border-b border-line px-5">
            {(
              [
                ["calls", `Calls (${report.calls.length})`],
                ["customers", "Customers"],
                ["agents", `Agents (${report.agents.length})`],
              ] as [DetailTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`py-3.5 font-bold text-[13px] transition-colors border-b-2 ${
                  activeTab === id
                    ? "border-blue text-blue"
                    : "border-transparent text-slate-500 hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            {activeTab === "calls" ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3">When</th>
                    <th className="px-6 py-3">Agent</th>
                    <th className="px-6 py-3 text-right">AHT</th>
                    <th className="px-6 py-3 text-right">Score</th>
                    <th className="px-6 py-3">Verdict</th>
                    <th className="px-6 py-3 text-right">Followed</th>
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
                          href={`/upload/score/${row.call_id}`}
                          className="font-semibold text-ink hover:text-blue"
                        >
                          {row.agent_name}
                        </Link>
                        <p className="text-[11px] tabular-nums text-muted">{row.title}</p>
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
                          {verdictLabel(row.verdict)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        {row.compliance_followed_pct != null ? (
                          <span className={`${scoreChipClass(row.compliance_followed_pct)} tabular-nums`}>
                            {row.compliance_followed_pct}%
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                        {row.compliance_not_followed_pct != null ? (
                          <p className="mt-1 text-[11px] tabular-nums text-muted">
                            {row.compliance_not_followed_pct}% not followed
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {!report.calls.length ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted text-[13px]">
                        No scored calls in this window.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            ) : null}

            {activeTab === "customers" ? (
              <div className="grid gap-0 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-line">
                <div>
                  <div className="px-6 py-3.5 border-b border-line bg-slate-50/50">
                    <h3 className="text-[13px] font-semibold text-ink">Satisfied</h3>
                  </div>
                  <ul className="divide-y divide-line">
                    {(report.customer_voice?.satisfactions || []).map((row) => (
                      <li key={`sat-${row.call_id}`} className="px-6 py-4 space-y-2">
                        <Link href={`/upload/score/${row.call_id}`} className="font-semibold text-[13px] text-ink hover:text-blue">
                          {row.agent_name}
                        </Link>
                        <ul className="space-y-1">
                          {row.themes.map((theme) => (
                            <li key={theme} className="text-[13px] text-slate-700 leading-relaxed">
                              {theme}
                            </li>
                          ))}
                        </ul>
                        {row.quote ? (
                          <p className="text-[12px] text-muted italic leading-relaxed">“{row.quote}”</p>
                        ) : null}
                      </li>
                    ))}
                    {!report.customer_voice?.satisfactions?.length ? (
                      <li className="px-6 py-10 text-center text-[13px] text-muted">No satisfaction themes.</li>
                    ) : null}
                  </ul>
                </div>
                <div>
                  <div className="px-6 py-3.5 border-b border-line bg-slate-50/50">
                    <h3 className="text-[13px] font-semibold text-ink">Frustrated</h3>
                  </div>
                  <ul className="divide-y divide-line">
                    {(report.customer_voice?.frustrations || []).map((row) => (
                      <li key={`fru-${row.call_id}`} className="px-6 py-4 space-y-2">
                        <Link href={`/upload/score/${row.call_id}`} className="font-semibold text-[13px] text-ink hover:text-blue">
                          {row.agent_name}
                        </Link>
                        <ul className="space-y-1">
                          {row.themes.map((theme) => (
                            <li key={theme} className="text-[13px] text-slate-700 leading-relaxed">
                              {theme}
                            </li>
                          ))}
                        </ul>
                        {row.quote ? (
                          <p className="text-[12px] text-muted italic leading-relaxed">“{row.quote}”</p>
                        ) : null}
                      </li>
                    ))}
                    {!report.customer_voice?.frustrations?.length ? (
                      <li className="px-6 py-10 text-center text-[13px] text-muted">No frustration themes.</li>
                    ) : null}
                  </ul>
                </div>
              </div>
            ) : null}

            {activeTab === "agents" ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3">Agent</th>
                    <th className="px-6 py-3 text-right">Calls</th>
                    <th className="px-6 py-3 text-right">Avg</th>
                    <th className="px-6 py-3 text-right">AHT</th>
                    <th className="px-6 py-3 text-right">Followed</th>
                    <th className="px-6 py-3 text-right">Not followed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {report.agents.map((row) => (
                    <tr key={row.agent_id || row.agent_name}>
                      <td className="px-6 py-3.5 font-semibold text-ink">{row.agent_name}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums">{row.call_count}</td>
                      <td className="px-6 py-3.5 text-right">
                        {row.avg_score != null ? (
                          <span className={`${scoreChipClass(row.avg_score)} tabular-nums`}>{row.avg_score}%</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-slate-600">
                        {formatAht(row.aht_seconds)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {row.compliance_followed_pct != null ? (
                          <span className={`${scoreChipClass(row.compliance_followed_pct)} tabular-nums`}>
                            {row.compliance_followed_pct}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-slate-600">
                        {row.compliance_not_followed_pct != null ? `${row.compliance_not_followed_pct}%` : "—"}
                      </td>
                    </tr>
                  ))}
                  {!report.agents.length ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted text-[13px]">
                        No agent scores in this window.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
