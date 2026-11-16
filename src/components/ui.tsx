import type { ReactNode } from "react";
import { Activity, Clock, FileText, Mic, ShieldCheck } from "lucide-react";

export function PageHeader({
  title,
  description,
  subtitle,
  actions,
  kicker,
  eyebrow,
}: {
  title: string;
  description?: string;
  subtitle?: string;
  actions?: ReactNode;
  kicker?: string;
  eyebrow?: string;
}) {
  const topLabel = kicker || eyebrow;
  const subLabel = description || subtitle;
  return (
    <div className="page-head">
      <div>
        {topLabel ? <p className="page-kicker mb-1.5">{topLabel}</p> : null}
        <h1>{title}</h1>
        {subLabel ? <p>{subLabel}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const KPI_ICONS = [
  <Activity key="0" className="h-4 w-4" />,
  <Mic key="1" className="h-4 w-4" />,
  <ShieldCheck key="2" className="h-4 w-4" />,
  <Clock key="3" className="h-4 w-4" />,
];

export function KpiStrip({
  items,
}: {
  items: {
    label: string;
    value: string;
    hint?: string;
    icon?: ReactNode;
    delta?: { text: string; tone: "positive" | "negative" | "neutral" } | null;
  }[];
}) {
  return (
    <div className="kpi-strip" data-cols={items.length}>
      {items.map((item, idx) => {
        const deltaClass =
          item.delta?.tone === "positive"
            ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
            : item.delta?.tone === "negative"
              ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
              : "bg-[#F8FAFF] text-[#475569] border-[#E3E9F5]";
        return (
          <div
            key={item.label}
            className="kpi transition-colors hover:border-[#C7D6F5]"
            title={item.hint ? `${item.value} · ${item.hint}` : item.value}
          >
            <span className="kpi-label">
              <span>{item.label}</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-soft text-blue">
                {item.icon || KPI_ICONS[idx % KPI_ICONS.length]}
              </span>
            </span>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="kpi-value !mt-0">{item.value}</span>
              {item.delta ? (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${deltaClass}`}
                >
                  {item.delta.text}
                </span>
              ) : null}
            </div>
            {item.hint ? <span className="kpi-hint">{item.hint}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export function scoreChipClass(score: number | null | undefined) {
  if (score == null) return "chip";
  if (score >= 70) return "chip chip-ok";
  if (score >= 50) return "chip chip-wait";
  return "chip chip-bad";
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`surface ${className}`.trim()}>{children}</div>;
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad" | "teal";
}) {
  const valueTone =
    tone === "good"
      ? "text-emerald"
      : tone === "warn"
        ? "text-amber"
        : tone === "bad"
          ? "text-rose"
          : tone === "teal"
            ? "text-teal"
            : "text-navy";

  const dotTone =
    tone === "good"
      ? "bg-emerald"
      : tone === "warn"
        ? "bg-amber"
        : tone === "bad"
          ? "bg-rose"
          : tone === "teal"
            ? "bg-teal"
            : "bg-blue";

  return (
    <div className="stat-tile surface p-4 flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-muted">
          {label}
        </span>
        <span className={`h-2 w-2 rounded-full shrink-0 ${dotTone}`} />
      </div>
      <span className={`stat-tile-value font-display text-[24px] font-bold tabular-nums tracking-tight ${valueTone}`}>
        {value}
      </span>
      {hint ? <span className="text-[12px] text-muted leading-snug">{hint}</span> : null}
    </div>
  );
}

export function ScorePill({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return <span className="chip text-[11px]">Unscored</span>;
  }
  return <span className={`${scoreChipClass(score)} font-mono text-[11px]`}>{score}%</span>;
}

export function VerdictBadge({
  verdict,
}: {
  verdict: "pass" | "review" | "fail" | string | null | undefined;
}) {
  if (!verdict) return null;
  const cls =
    verdict === "pass" || verdict === "excellent" || verdict === "good"
      ? "chip chip-ok"
      : verdict === "fail" || verdict === "poor"
        ? "chip chip-bad"
        : "chip chip-wait";
  return <span className={`${cls} capitalize text-[11px]`}>{verdict.replace(/_/g, " ")}</span>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state py-10 px-4 text-center space-y-2">
      <div className="empty-state-icon" aria-hidden="true">
        <FileText className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {body ? <p className="text-[13.5px] text-muted max-w-md mx-auto">{body}</p> : null}
      {action ? <div className="pt-2 flex justify-center">{action}</div> : null}
    </div>
  );
}
