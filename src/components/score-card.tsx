import { scoreTone, verdictLabel } from "@/lib/format";
import type { CallScore, ScoreDimension } from "@/lib/types";

const DIMENSIONS: { key: ScoreDimension; label: string }[] = [
  { key: "greeting", label: "Greeting & Identity" },
  { key: "empathy", label: "Empathy & Active Listening" },
  { key: "professionalism", label: "Professional Demeanor" },
  { key: "resolution", label: "Issue Resolution & Next Steps" },
  { key: "communication", label: "Communication Clarity" },
  { key: "language_handling", label: "Language Mix Handling" },
];

const Icons = {
  check: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  target: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  shieldAlert: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  file: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

export function ScoreCard({ score }: { score: CallScore }) {
  const tone = scoreTone(score.overall_score);
  const isGood = tone === "excellent" || tone === "good";
  const isWarn = tone === "warn";

  const scoreBadgeBg = isGood
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isWarn
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-rose-50 text-rose-700 border-rose-200";

  const scoreTextColor = isGood
    ? "text-emerald-600"
    : isWarn
    ? "text-amber-600"
    : "text-rose-600";

  return (
    <div className="space-y-6">
      {/* Executive Hero Evaluation Card */}
      <section className="bg-white rounded-xl p-6 sm:p-8 border border-line/70 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8">
        {/* Score Gauge */}
        <div className="shrink-0 flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-xl border border-slate-200 text-center min-w-[160px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Overall QA Score
          </span>
          <span className={`text-5xl font-bold tracking-tight tabular-nums ${scoreTextColor}`}>
            {score.overall_score}%
          </span>
          <span
            className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${scoreBadgeBg}`}
          >
            {verdictLabel(score.verdict)}
          </span>
        </div>

        {/* Evaluation Summary & Tags */}
        <div className="flex-1 min-w-0 space-y-3 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {score.audit_mode === "automatic" ? "Autonomous AI Audit" : "SOP Standards Audit"}
            </span>
            {score.customer_sentiment && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 capitalize">
                Customer Sentiment: {score.customer_sentiment}
              </span>
            )}
          </div>

          <h2 className="text-[15px] sm:text-[16px] font-medium leading-relaxed text-slate-800">
            {score.summary}
          </h2>
        </div>
      </section>

      {/* Quality Dimensions Matrix */}
      <section className="bg-white rounded-xl p-6 border border-line/70 shadow-sm space-y-4">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-ink">Category Scorecard Matrix</h3>
            <p className="text-[12px] text-muted mt-0.5">Evaluation performance breakdown across the 6 core customer service dimensions</p>
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {DIMENSIONS.map((dim) => {
            const value = Number(score[dim.key] ?? 0);
            const dimTone = scoreTone(value);
            const barColor =
              dimTone === "excellent" || dimTone === "good"
                ? "bg-emerald-500"
                : dimTone === "warn"
                ? "bg-amber-500"
                : "bg-rose-500";

            return (
              <div key={dim.key} className="space-y-1.5">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="font-medium text-slate-700">{dim.label}</span>
                  <span className="font-bold tabular-nums text-ink">{value}/100</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-500`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Key Strengths & Coaching Analysis Grid */}
      <section className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Strengths */}
        <AnalysisCard
          title="Demonstrated Strengths"
          subtitle="Observed positive behaviors and compliance adherence during the interaction"
          icon={Icons.check}
          iconColor="bg-emerald-50 text-emerald-700 border-emerald-200"
          items={score.strengths}
          emptyText="No specific strengths recorded for this call."
          bulletColor="bg-emerald-500"
        />

        <div className="space-y-6">
          {/* Coaching Recommendations */}
          <AnalysisCard
            title="Coaching & Improvement Focus"
            subtitle="Actionable areas where agent performance can be enhanced"
            icon={Icons.target}
            iconColor="bg-amber-50 text-amber-700 border-amber-200"
            items={score.improvements}
            emptyText="No critical improvement gaps noted."
            bulletColor="bg-amber-500"
          />

          {/* Compliance Findings */}
          <AnalysisCard
            title="Compliance & Risk Adherence"
            subtitle="Verification of required disclosures, SLA statements, and prohibited behaviors"
            icon={Icons.shieldAlert}
            iconColor={
              (score.compliance_findings || []).some(
                (f) => f && f.toLowerCase() !== "none identified" && f.trim().length > 0
              )
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }
            items={score.compliance_findings}
            emptyText="✓ Zero compliance breaches or regulatory risks detected."
            bulletColor="bg-rose-500"
          />
        </div>
      </section>

      {/* Standards Referenced */}
      {score.standards_used?.length ? (
        <section className="bg-white rounded-xl p-6 border border-line/70 shadow-sm space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
              Standards & Rubrics Referenced During Audit
            </h4>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-1">
            {score.standards_used.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[12px]"
              >
                <span className="text-slate-400">{Icons.file}</span>
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
                    {doc.kind}
                  </span>
                  <span className="font-semibold text-ink">{doc.title}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AnalysisCard({
  title,
  subtitle,
  icon,
  iconColor,
  items,
  emptyText,
  bulletColor,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  items: string[] | null;
  emptyText: string;
  bulletColor: string;
}) {
  const list = (Array.isArray(items) ? items : []).filter(
    (item) => item && item.toLowerCase() !== "none identified" && item.trim().length > 0
  );

  return (
    <div className="bg-white rounded-xl p-6 border border-line/70 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconColor}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-ink">{title}</h3>
          <p className="text-[12px] text-muted mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100">
        {list.length > 0 ? (
          <ul className="space-y-3">
            {list.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-800 leading-relaxed">
                <span className={`w-1.5 h-1.5 rounded-full ${bulletColor} shrink-0 mt-2`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-slate-500 italic py-1">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
