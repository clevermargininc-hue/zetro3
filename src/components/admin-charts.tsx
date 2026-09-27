import type { ReactNode } from "react";

export type ChartSeries = { label: string; color: string; values: number[] };

export const CHART_COLORS = {
  blue: "var(--blue)",
  soft: "#7ea6f4",
  green: "var(--good)",
  amber: "var(--warn)",
  grey: "#94a3b8",
};

const WIDTH = 640;
const PAD = { top: 12, right: 12, bottom: 26, left: 34 };

function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= value / 4) ?? 10;
  return Math.ceil(value / (step * magnitude)) * step * magnitude;
}

function formatCount(value: number) {
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

export function dayLabel(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function Axes({ labels, max, height }: { labels: string[]; max: number; height: number }) {
  const plotH = height - PAD.top - PAD.bottom;
  const plotW = WIDTH - PAD.left - PAD.right;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const every = Math.max(1, Math.ceil(labels.length / 7));
  const band = plotW / Math.max(labels.length, 1);
  return (
    <g>
      {ticks.map((t) => {
        const y = PAD.top + plotH * (1 - t);
        return (
          <g key={t}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill="var(--muted)">
              {formatCount(Math.round(max * t))}
            </text>
          </g>
        );
      })}
      {labels.map((label, index) =>
        index % every === 0 || index === labels.length - 1 ? (
          <text
            key={label + index}
            x={PAD.left + band * index + band / 2}
            y={height - 8}
            textAnchor="middle"
            fontSize={10}
            fill="var(--muted)"
          >
            {label}
          </text>
        ) : null,
      )}
    </g>
  );
}

export function BarChart({
  labels,
  series,
  height = 200,
}: {
  labels: string[];
  series: ChartSeries[];
  height?: number;
}) {
  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] || 0), 0));
  const max = niceMax(Math.max(0, ...totals));
  const plotH = height - PAD.top - PAD.bottom;
  const band = (WIDTH - PAD.left - PAD.right) / Math.max(labels.length, 1);
  const barW = Math.max(2, Math.min(28, band * 0.68));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="block w-full"
      style={{ aspectRatio: `${WIDTH} / ${height}` }}
      role="img"
    >
      <Axes labels={labels} max={max} height={height} />
      {labels.map((label, i) => {
        let offset = 0;
        const x = PAD.left + band * i + (band - barW) / 2;
        return (
          <g key={label + i}>
            <title>
              {`${label}: ${series.map((s) => `${(s.values[i] || 0).toLocaleString("en-US")} ${s.label.toLowerCase()}`).join(", ")}`}
            </title>
            <rect x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} fill="transparent" />
            {series.map((s) => {
              const value = s.values[i] || 0;
              if (!value) return null;
              const h = (value / max) * plotH;
              offset += h;
              return (
                <rect
                  key={s.label}
                  x={x}
                  y={PAD.top + plotH - offset}
                  width={barW}
                  height={Math.max(h, 1)}
                  rx={1.5}
                  fill={s.color}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({
  labels,
  values,
  label,
  color = "var(--blue)",
  height = 200,
  fixedMax,
}: {
  labels: string[];
  values: Array<number | null>;
  label: string;
  color?: string;
  height?: number;
  /** Pin the axis, e.g. 100 for a percentage. */
  fixedMax?: number;
}) {
  const numeric = values.filter((value): value is number => value != null && Number.isFinite(value));
  const max = fixedMax && fixedMax > 0 ? fixedMax : niceMax(Math.max(0, ...numeric));
  const plotH = height - PAD.top - PAD.bottom;
  const band = (WIDTH - PAD.left - PAD.right) / Math.max(labels.length, 1);
  const points = values.map((value, i) => ({
    x: PAD.left + band * i + band / 2,
    y: value == null ? null : PAD.top + plotH - (value / max) * plotH,
    value,
  }));
  const drawn = points.filter((p): p is { x: number; y: number; value: number } => p.y != null);
  const line = drawn.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");
  const solid = numeric.length === values.length && drawn.length > 0;
  const base = PAD.top + plotH;
  const area =
    solid && line
      ? `${line}L${drawn[drawn.length - 1].x.toFixed(1)} ${base}L${drawn[0].x.toFixed(1)} ${base}Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="block w-full"
      style={{ aspectRatio: `${WIDTH} / ${height}` }}
      role="img"
    >
      <Axes labels={labels} max={max} height={height} />
      {area ? <path d={area} fill={color} opacity={0.1} /> : null}
      {line ? <path d={line} fill="none" stroke={color} strokeWidth={2.25} strokeLinejoin="round" /> : null}
      {points.map((p, i) => (
        <g key={labels[i] + i}>
          <title>
            {p.value == null
              ? `${labels[i]}: no ${label.toLowerCase()}`
              : `${labels[i]}: ${p.value.toLocaleString("en-US")} ${label.toLowerCase()}`}
          </title>
          <rect x={p.x - band / 2} y={PAD.top} width={band} height={plotH} fill="transparent" />
          {p.y != null ? (
            <circle cx={p.x} cy={p.y} r={labels.length <= 14 || i === points.length - 1 ? 3.5 : 2.75} fill={color} />
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function Donut({
  slices,
  centerLabel,
}: {
  slices: { label: string; value: number; color: string }[];
  centerLabel: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const r = 42;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0" role="img">
        <circle cx={60} cy={60} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={16} />
        {total > 0
          ? slices.map((s) => {
              if (!s.value) return null;
              const length = (s.value / total) * circumference;
              const dash = `${length} ${circumference - length}`;
              const node = (
                <circle
                  key={s.label}
                  cx={60}
                  cy={60}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={16}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 60 60)"
                >
                  <title>{`${s.label}: ${s.value}`}</title>
                </circle>
              );
              offset += length;
              return node;
            })
          : null}
        <text x={60} y={58} textAnchor="middle" fontSize={20} fontWeight={700} fill="var(--text)">
          {total}
        </text>
        <text x={60} y={74} textAnchor="middle" fontSize={9} fill="var(--muted)">
          {centerLabel}
        </text>
      </svg>
      <ul className="w-full space-y-2 text-[13px]">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="tabular-nums text-muted">
              {s.value}
              {total ? ` · ${Math.round((s.value / total) * 100)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({
  rows,
  color = "var(--blue)",
  empty,
  scaleMax,
}: {
  rows: { label: ReactNode; value: number; key: string; hint?: string }[];
  color?: string;
  empty: string;
  /** Pin bar length, e.g. 100 for a percentage. */
  scaleMax?: number;
}) {
  const max = scaleMax && scaleMax > 0 ? scaleMax : Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-[13px] text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {row.value.toLocaleString("en-US")}
              {row.hint ? ` · ${row.hint}` : ""}
            </span>
          </div>
          <div className="h-2 w-full rounded-sm bg-bg-2">
            <div
              className="h-2 rounded-sm"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({
  title,
  total,
  subtitle,
  legend,
  children,
}: {
  title: string;
  total?: string;
  subtitle?: string;
  legend?: { label: string; color: string }[];
  children: ReactNode;
}) {
  return (
    <section className="surface p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {total ? <span className="text-[20px] font-bold leading-none text-ink tabular-nums">{total}</span> : null}
          {legend ? (
            <div className="flex flex-wrap justify-end gap-3 text-[11px] text-muted">
              {legend.map((item) => (
                <span key={item.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
