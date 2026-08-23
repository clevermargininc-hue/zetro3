import { formatDuration, languageLabel, verdictLabel } from "@/lib/format";
import { auditModeLabel, formatReportDate, scoreLabel } from "@/lib/reports";
import type { Call, CallScore } from "@/lib/types";

function asList(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function AuditPrintDocument({
  call,
  score,
}: {
  call: Call & { agents?: { name: string } | null };
  score: CallScore;
  utterances?: unknown;
}) {
  const agent = call.agents?.name || "Unassigned";
  const strengths = asList(score.strengths);
  const improvements = asList(score.improvements);
  const findings = asList(score.compliance_findings);
  const standards = score.standards_used || [];

  return (
    <article className="audit-print hidden print:block bg-white text-ink text-[12px] font-sans">
      <header className="mb-8 border-b-[3px] border-line pb-6 flex flex-col justify-between items-start gap-4">
        <div className="flex items-center gap-3 text-blue font-extrabold text-2xl tracking-tight">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <path d="M12 2L2 22h20L12 2zm0 3.8l6.3 12.6H5.7L12 5.8z" />
          </svg>
          ZETRO
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted uppercase mb-1">Call Audit Report</p>
          <h1 className="text-3xl font-extrabold text-ink">{call.title || "Untitled call"}</h1>
          <p className="mt-2 text-[13px] font-medium text-muted">
            Agent: <span className="text-ink">{agent}</span> &nbsp;&middot;&nbsp; Verdict: <span className="text-ink uppercase">{verdictLabel(score.verdict)}</span> &nbsp;&middot;&nbsp; Score: <span className="text-ink">{score.overall_score}/100</span>
          </p>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-[14px] font-bold uppercase tracking-widest text-muted border-b border-line/50 pb-2 mb-4">Call Properties</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
          <Item label="Agent" value={agent} />
          <Item label="File Name" value={call.file_name || "—"} />
          <Item label="Duration" value={formatDuration(call.duration_seconds)} />
          <Item label="Spoken Language" value={languageLabel(call.language_mode)} />
          <Item label="Detected" value={languageLabel(call.detected_language)} />
          <Item label="Uploaded On" value={formatReportDate(call.created_at)} />
          <Item
            label="Audited On"
            value={formatReportDate(score.created_at || call.completed_at || call.created_at)}
          />
          <Item label="Audit Type" value={auditModeLabel(score.audit_mode)} />
          <Item label="Customer Sentiment" value={score.customer_sentiment || "—"} />
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="text-[14px] font-bold uppercase tracking-widest text-muted border-b border-line/50 pb-2 mb-4">Score Breakdown</h2>
        <table className="w-full text-left border-collapse mt-2">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2 text-[12px] font-bold text-muted uppercase tracking-wider">Dimension</th>
              <th className="py-2 text-[12px] font-bold text-muted uppercase tracking-wider text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/30">
            {[
              ["Overall", score.overall_score],
              ["Greeting", score.greeting],
              ["Empathy", score.empathy],
              ["Professionalism", score.professionalism],
              ["Resolution", score.resolution],
              ["Communication", score.communication],
              ["Language mix", score.language_handling],
            ].map(([label, value]) => (
              <tr key={String(label)}>
                <td className="py-2.5 font-medium">{label}</td>
                <td className="py-2.5 tabular-nums text-right font-bold">{scoreLabel(value as number | null)}</td>
              </tr>
            ))}
            <tr className="bg-surface-2/50">
              <td className="py-3 font-bold text-ink">Verdict</td>
              <td className="py-3 font-bold text-right uppercase tracking-wider text-ink">{verdictLabel(score.verdict)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="text-[14px] font-bold uppercase tracking-widest text-muted border-b border-line/50 pb-2 mb-4">Summary</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink/90 bg-surface-2/30 p-4 rounded-xl border border-line/40">{score.summary || "No summary."}</p>
      </section>

      <Notes title="Strengths" items={strengths} />
      <Notes title="Recommendations" items={improvements} />
      <Notes title="Compliance findings" items={findings} />

      {standards.length ? (
        <section className="mb-8">
          <h2 className="text-[14px] font-bold uppercase tracking-widest text-muted border-b border-line/50 pb-2 mb-4">Standards Reference</h2>
          <ul className="mt-3 space-y-2">
            {standards.map((doc) => (
              <li key={doc.id} className="text-[12px] bg-surface-2/30 p-3 rounded-lg border border-line/40 flex items-center gap-2">
                <span className="font-bold text-muted uppercase tracking-wider">{doc.kind}</span>
                <span className="text-line/40">&middot;</span>
                <span className="font-medium text-ink">{doc.title}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col border-b border-line/20 pb-2">
      <dt className="text-[11px] font-bold uppercase tracking-widest text-muted mb-1">{label}</dt>
      <dd className="font-medium text-[13px]">{value}</dd>
    </div>
  );
}

function Notes({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mb-8">
      <h2 className="text-[14px] font-bold uppercase tracking-widest text-muted border-b border-line/50 pb-2 mb-4">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] text-ink/90 marker:text-blue">
        {(items.length ? items : ["None identified"]).map((item) => (
          <li key={item} className="pl-1 leading-relaxed">{item}</li>
        ))}
      </ul>
    </section>
  );
}
