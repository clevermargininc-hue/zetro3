import { dayLabel } from "@/components/admin-charts";
import type { ReportPeriod } from "@/lib/reports";

export const QUALITY_RANGES = [7, 30, 90] as const;
export type QualityRange = (typeof QUALITY_RANGES)[number];

export function isQualityRange(value: number): value is QualityRange {
  return (QUALITY_RANGES as readonly number[]).includes(value);
}

export const CHART_TZ = "Africa/Dar_es_Salaam";

export const PARAMETER_LABELS = [
  ["greeting", "Greeting & identity"],
  ["empathy", "Empathy"],
  ["professionalism", "Professional demeanor"],
  ["resolution", "Issue resolution"],
  ["communication", "Communication"],
  ["language_handling", "Language mix"],
] as const;

export function calendarDay(value: string | Date, tz = CHART_TZ) {
  return new Date(value).toLocaleDateString("en-CA", { timeZone: tz });
}

export function ymdRange(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const out: string[] = [];
  const last = Date.UTC(ey, em - 1, ed);
  for (let t = Date.UTC(sy, sm - 1, sd); t <= last; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function lastNDays(days: number, tz = CHART_TZ) {
  const today = calendarDay(new Date(), tz);
  const [y, m, d] = today.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d - (days - 1))).toISOString().slice(0, 10);
  return ymdRange(start, today);
}

export function dayKeys(start: string, end: string) {
  return ymdRange(start, end).map((day) => ({ key: day, label: dayLabel(day) }));
}

export function monthKeys(year: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
    };
  });
}

export function reportBucketKeys(period: ReportPeriod, rangeStart: string, rangeEnd: string) {
  if (period === "annually") return monthKeys(Number(rangeStart.slice(0, 4)));
  if (period === "all") return monthKeysBetween(rangeStart.slice(0, 7), rangeEnd.slice(0, 7));
  return dayKeys(rangeStart, rangeEnd);
}

export function reportBucketKey(iso: string, period: ReportPeriod, tz: string) {
  const day = calendarDay(iso, tz);
  return period === "annually" || period === "all" ? day.slice(0, 7) : day;
}

export type QualityPoint = { at: string; score: number };

export type QualityBucket = {
  key: string;
  label: string;
  calls: number;
  avg: number | null;
};

export function monthKeysBetween(startYm: string, endYm: string) {
  const [sy, sm] = startYm.split("-").map(Number);
  const [ey, em] = endYm.split("-").map(Number);
  const out: { key: string; label: string }[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push({
      key,
      label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", {
        month: "short",
        year: sy !== ey ? "2-digit" : undefined,
        timeZone: "UTC",
      }),
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function autoQualityBuckets(points: QualityPoint[], tz = CHART_TZ): QualityBucket[] {
  const today = calendarDay(new Date(), tz);
  if (!points.length) {
    const days = lastNDays(30, tz);
    return qualityBuckets({
      keys: dayKeys(days[0] || today, days[days.length - 1] || today),
      points,
      keyOf: (iso) => calendarDay(iso, tz),
    });
  }
  const start = points.map((point) => calendarDay(point.at, tz)).sort()[0] || today;
  const span = ymdRange(start, today).length;
  if (span <= 90) {
    return qualityBuckets({
      keys: dayKeys(start, today),
      points,
      keyOf: (iso) => calendarDay(iso, tz),
    });
  }
  return qualityBuckets({
    keys: monthKeysBetween(start.slice(0, 7), today.slice(0, 7)),
    points,
    keyOf: (iso) => calendarDay(iso, tz).slice(0, 7),
  });
}

export function qualityBuckets(opts: {
  keys: { key: string; label: string }[];
  points: QualityPoint[];
  keyOf: (iso: string) => string;
}): QualityBucket[] {
  const map = new Map(opts.keys.map((row) => [row.key, { ...row, scores: [] as number[] }]));
  for (const point of opts.points) {
    const row = map.get(opts.keyOf(point.at));
    if (row) row.scores.push(point.score);
  }
  return opts.keys.map((row) => {
    const scores = map.get(row.key)?.scores || [];
    return {
      key: row.key,
      label: row.label,
      calls: scores.length,
      avg: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
    };
  });
}
