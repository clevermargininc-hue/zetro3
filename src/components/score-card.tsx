import type { CSSProperties } from "react";
import { scoreTone, verdictLabel } from "@/lib/format";
import type { CallScore, ScoreDimension } from "@/lib/types";

const DIMENSIONS: { key: ScoreDimension; label: string }[] = [
  { key: "greeting", label: "Greeting" },
  { key: "empathy", label: "Empathy" },
  { key: "professionalism", label: "Professionalism" },
  { key: "resolution", label: "Resolution" },
  { key: "communication", label: "Communication" },
  { key: "language_handling", label: "Language mix" },
];

export function ScoreCard({ score }: { score: CallScore }) {
  const tone = scoreTone(score.overall_score);

  const ringColor =
    tone === "excellent" || tone === "good"
      ? "var(--color-good)"
      : tone === "warn"
        ? "var(--color-warn)"
        : "var(--color-rose)";

  const textColor =
    tone === "excellent" || tone === "good"
      ? "text-good"
      : tone === "warn"
        ? "text-warn"
        : "text-rose";

  return (
    <div className="space-y-8">
      <section className="panel flex flex-col md:flex-row items-center md:items-start gap-8 rounded-3xl p-8 bg-white shadow-sm border border-line/40">
        <div className="shrink-0 flex flex-col items-center justify-center">
          <div
            className="score-ring relative grid h-40 w-40 place-items-center rounded-full p-1"
            style={
              {
                "--p": score.overall_score,
                "--ring-color": ringColor,
              } as CSSProperties
            }
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-surface-2 shadow-inner">
              <div className="text-center mt-2">
                <p className={`text-5xl font-bold tracking-tight tabular-nums ${textColor}`}>
                  {score.overall_score}
                </p>
                <p className="mt-1 text-[12px] font-bold uppercase tracking-wider text-muted opacity-80">
                  {verdictLabel(score.verdict)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center md:pt-4 text-center md:text-left">
          <div className="inline-flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
            <span className="badge bg-surface-2 text-ink border border-line/50 font-medium shadow-sm px-3 py-1">
              {score.audit_mode === "automatic" ? "🤖 Automatic Audit" : "📄 Documents Audit"}
            </span>
            <span className="badge bg-surface-2 text-muted border border-line/50 shadow-sm px-3 py-1">
              Sentiment: {score.customer_sentiment}
            </span>
          </div>

          <h2 className="text-[18px] sm:text-[20px] font-medium leading-relaxed text-ink/90 max-w-3xl">
            {score.summary}
          </h2>
        </div>
      </section>

      <section className="panel rounded-3xl p-8 bg-white shadow-sm border border-line/40">
        <h3 className="text-[16px] font-bold tracking-tight text-ink mb-6">Category Breakdown</h3>
        <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {DIMENSIONS.map((dim) => {
            const value = Number(score[dim.key] ?? 0);
            const dimTone = scoreTone(value);
            const barColor =
              dimTone === "excellent" || dimTone === "good"
                ? "bg-good"
                : dimTone === "warn"
                  ? "bg-warn"
                  : "bg-rose";

            return (
              <div key={dim.key} className="space-y-2.5">
                <div className="flex justify-between items-end">
                  <span className="text-[13px] font-bold uppercase tracking-wide text-muted">
                    {dim.label}
                  </span>
                  <span className="text-[16px] font-bold tabular-nums text-ink">{value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2 border border-line/50">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 items-start">
        <List
          title="Strengths"
          icon="✓"
          items={score.strengths}
          tone="good"
          note={
            score.audit_mode === "automatic"
              ? "From the call, using the system's own quality judgment."
              : "From the call, judged against your uploaded scorecard."
          }
        />
        <div className="space-y-6">
          <List
            title="Recommendations"
            icon="🎯"
            items={score.improvements}
            tone="warn"
            note={
              score.audit_mode === "automatic"
                ? "Coaching notes from the call. Company files were not used."
                : "Gaps against the scorecard and process documents."
            }
          />
          <List
            title="Compliance findings"
            icon="⚠️"
            items={score.compliance_findings}
            tone="rose"
            note={
              score.audit_mode === "automatic"
                ? "Obvious legal or ethical issues only. Not scored from a company compliance file."
                : "Read from your uploaded compliance files."
            }
          />
        </div>
      </section>

      {score.standards_used?.length ? (
        <section className="panel rounded-3xl p-8 bg-white border border-line/40 shadow-sm mt-8">
          <p className="text-[12px] font-bold uppercase tracking-widest text-muted mb-4">
            Standards this audit read
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            {score.standards_used.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 bg-surface-2 border border-line/60 rounded-xl px-4 py-3 shadow-sm"
              >
                <span className="text-xl">📄</span>
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-muted leading-none mb-1.5">
                    {doc.kind}
                  </p>
                  <p className="text-[14px] font-medium text-ink leading-none">{doc.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function List({
  title,
  icon,
  items,
  tone,
  note,
}: {
  title: string;
  icon: string;
  items: string[] | null;
  tone: "good" | "warn" | "rose";
  note: string;
}) {
  const list = Array.isArray(items) ? items : [];
  const iconColor =
    tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-rose";

  return (
    <div className="bg-white rounded-3xl p-8 border border-line/40 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`h-8 w-8 rounded-full bg-surface-2 border border-line/50 flex items-center justify-center font-bold shadow-sm ${iconColor}`}
        >
          {icon}
        </div>
        <h3 className="text-[18px] font-bold tracking-tight text-ink">{title}</h3>
      </div>
      <p className="mb-6 text-[13px] font-medium text-muted pl-11">{note}</p>

      <ul className="space-y-4 pl-3">
        {list.map((item) => (
          <li key={item} className="flex gap-4">
            <span
              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-rose"
              } opacity-60`}
            />
            <span className="text-[14px] font-medium leading-relaxed text-ink/90">{item}</span>
          </li>
        ))}
        {!list.length && (
          <li className="text-[14px] font-medium opacity-70 italic text-muted ml-4">
            No notes for this call.
          </li>
        )}
      </ul>
    </div>
  );
}
