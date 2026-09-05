import type { CallScore, ScoreParameter } from "@/lib/types";

export type ScorecardRow = {
  name: string;
  score: number;
  note?: string;
  gap_note?: string;
  quote?: string;
  start_s?: number | null;
  weight_pct?: number | null;
};

const FALLBACK_ROWS: ScorecardRow[] = [
  { name: "Greeting & Identity", score: 0 },
  { name: "Empathy & Active Listening", score: 0 },
  { name: "Professional Demeanor", score: 0 },
  { name: "Issue Resolution & Next Steps", score: 0 },
  { name: "Communication Clarity", score: 0 },
  { name: "Language Mix Handling", score: 0 },
];

/** Prefer company scorecard parameters; fall back to legacy 6 dimensions. */
export function scorecardRows(score: CallScore): ScorecardRow[] {
  const parameters = score.metric_evidence?.parameters;
  if (Array.isArray(parameters) && parameters.length) {
    return parameters
      .map((row: ScoreParameter) => ({
        name: row.name,
        score: Math.max(0, Math.min(100, Math.round(Number(row.score) || 0))),
        note: row.note?.trim() || undefined,
        gap_note: row.gap_note?.trim() || undefined,
        quote: row.quote?.trim() || undefined,
        start_s: row.start_s ?? null,
        weight_pct: row.weight_pct ?? null,
      }))
      .filter((row) => row.name.trim().length > 0);
  }

  return [
    { name: "Greeting & Identity", score: Number(score.greeting ?? 0) },
    { name: "Empathy & Active Listening", score: Number(score.empathy ?? 0) },
    { name: "Professional Demeanor", score: Number(score.professionalism ?? 0) },
    { name: "Issue Resolution & Next Steps", score: Number(score.resolution ?? 0) },
    { name: "Communication Clarity", score: Number(score.communication ?? 0) },
    { name: "Language Mix Handling", score: Number(score.language_handling ?? 0) },
  ].map((row, index) => ({
    name: row.name || FALLBACK_ROWS[index].name,
    score: Math.max(0, Math.min(100, Math.round(row.score || 0))),
  }));
}
