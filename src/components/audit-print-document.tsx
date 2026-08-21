import { formatClock, formatDuration, languageLabel, verdictLabel } from "@/lib/format";
import { auditModeLabel, formatReportDate, scoreLabel } from "@/lib/reports";
import type { Call, CallScore, Utterance } from "@/lib/types";

function asList(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function AuditPrintDocument({
  call,
  score,
  utterances,
}: {
  call: Call & { agents?: { name: string } | null };
  score: CallScore;
  utterances: Utterance[];
}) {
  const agent = call.agents?.name || "Unassigned";
  const strengths = asList(score.strengths);
  const improvements = asList(score.improvements);
  const findings = asList(score.compliance_findings);
  const standards = score.standards_used || [];

  return (
    <article className="audit-print hidden print:block">
      <header className="mb-6 border-b border-line pb-4">
        <p className="page-kicker">Zetro audited call</p>
        <h1 className="mt-1 text-2xl font-semibold">{call.title || "Untitled call"}</h1>
        <p className="mt-1 text-sm text-muted">
          {agent} · {verdictLabel(score.verdict)} · {score.overall_score}
        </p>
      </header>

      <section className="mb-6">
        <h2 className="text-sm font-semibold">Call properties</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Item label="Agent" value={agent} />
          <Item label="File" value={call.file_name || "—"} />
          <Item label="Duration" value={formatDuration(call.duration_seconds)} />
          <Item label="Language mode" value={languageLabel(call.language_mode)} />
          <Item label="Detected language" value={languageLabel(call.detected_language)} />
          <Item label="Uploaded" value={formatReportDate(call.created_at)} />
          <Item
            label="Audited"
            value={formatReportDate(score.created_at || call.completed_at || call.created_at)}
          />
          <Item label="Audit path" value={auditModeLabel(score.audit_mode)} />
          <Item label="Customer sentiment" value={score.customer_sentiment || "—"} />
        </dl>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-semibold">Scores</h2>
        <table className="data-table mt-3">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
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
                <td>{label}</td>
                <td className="tabular-nums">{scoreLabel(value as number | null)}</td>
              </tr>
            ))}
            <tr>
              <td>Verdict</td>
              <td>{verdictLabel(score.verdict)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-semibold">Summary</h2>
        <p className="mt-2 text-sm leading-6">{score.summary || "No summary."}</p>
      </section>

      <Notes title="Strengths" items={strengths} />
      <Notes title="Recommendations" items={improvements} />
      <Notes title="Compliance findings" items={findings} />

      {standards.length ? (
        <section className="mb-6">
          <h2 className="text-sm font-semibold">Standards this audit read</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {standards.map((doc) => (
              <li key={doc.id}>
                {doc.kind} · {doc.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold">Transcript</h2>
        {utterances.length ? (
          <table className="data-table mt-3">
            <thead>
              <tr>
                <th>Time</th>
                <th>Speaker</th>
                <th>Text</th>
              </tr>
            </thead>
            <tbody>
              {utterances.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap">{formatClock(row.start_ms)}</td>
                  <td className="capitalize">
                    {row.role === "unknown" ? row.speaker_label : row.role}
                  </td>
                  <td>{row.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-muted">No transcript.</p>
        )}
      </section>
    </article>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Notes({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {(items.length ? items : ["None identified"]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
