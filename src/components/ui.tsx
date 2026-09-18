import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  kicker,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  kicker?: string;
}) {
  return (
    <div className="page-head">
      <div>
        {kicker ? <p className="page-kicker mb-1.5">{kicker}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function KpiStrip({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <div className="kpi-strip">
      {items.map((item) => (
        <div key={item.label} className="kpi" title={item.hint ? `${item.value} · ${item.hint}` : item.value}>
          <span className="kpi-label">{item.label}</span>
          <span className="kpi-value">{item.value}</span>
          {item.hint ? <span className="kpi-hint">{item.hint}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function scoreChipClass(score: number | null | undefined) {
  if (score == null) return "chip";
  if (score >= 70) return "chip chip-ok";
  if (score >= 50) return "chip chip-wait";
  return "chip chip-bad";
}