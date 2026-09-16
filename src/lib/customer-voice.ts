import type { MetricEvidence } from "@/lib/types";

export const CUSTOMER_STANCES = [
  "satisfied",
  "frustrated",
  "mixed",
  "neutral",
  "unknown",
] as const;

export type CustomerStance = (typeof CUSTOMER_STANCES)[number];

export type CustomerVoiceInsight = {
  stance: CustomerStance;
  satisfaction_themes: string[];
  frustration_themes: string[];
  note: string;
  quote: string;
};

export type CustomerVoiceThemeRow = {
  call_id: string;
  title: string;
  agent_name: string;
  audited_at: string;
  stance: CustomerStance;
  themes: string[];
  note: string;
  quote: string;
  summary: string | null;
};

export type CustomerVoiceSummary = {
  analyzed: number;
  satisfied_count: number;
  frustrated_count: number;
  mixed_count: number;
  neutral_count: number;
  /** Share of analyzed calls that are clearly satisfied. */
  satisfied_pct: number | null;
  /** Share of analyzed calls that are clearly frustrated. */
  frustrated_pct: number | null;
};

function cleanTheme(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function cleanThemes(raw: unknown): string[] {
  const rows = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const theme = cleanTheme(row);
    if (!theme) continue;
    const key = theme.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(theme);
    if (out.length >= 8) break;
  }
  return out;
}

export function normalizeCustomerStance(value: unknown): CustomerStance {
  const raw = String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
  if (!raw || raw === "unknown" || raw === "n/a" || raw === "na") return "unknown";
  if (
    /\b(frustrat|angry|anger|upset|annoy|complain|dissatisf|unhappy|irate|hostile|negative)\b/.test(
      raw,
    )
  ) {
    return "frustrated";
  }
  if (/\b(satisf|happy|pleased|positive|delighted|grateful|thank|appreciat|like|loved)\b/.test(raw)) {
    return "satisfied";
  }
  if (/\bmixed\b|\bboth\b/.test(raw)) return "mixed";
  if (/\bneutral\b|\bcalm\b|\bok\b|\bfine\b/.test(raw)) return "neutral";
  if (CUSTOMER_STANCES.includes(raw as CustomerStance)) return raw as CustomerStance;
  return "unknown";
}

export function normalizeCustomerVoice(
  raw: unknown,
  fallbackSentiment?: unknown,
): CustomerVoiceInsight {
  const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const satisfaction_themes = cleanThemes(item.satisfaction_themes);
  const frustration_themes = cleanThemes(item.frustration_themes);
  let stance = normalizeCustomerStance(item.stance || fallbackSentiment);

  if (stance === "unknown") {
    if (frustration_themes.length && !satisfaction_themes.length) stance = "frustrated";
    else if (satisfaction_themes.length && !frustration_themes.length) stance = "satisfied";
    else if (satisfaction_themes.length && frustration_themes.length) stance = "mixed";
  }

  return {
    stance,
    satisfaction_themes,
    frustration_themes,
    note: cleanTheme(item.note).slice(0, 320),
    quote: cleanTheme(item.quote).slice(0, 280),
  };
}

export function customerVoiceFromScore(score: {
  customer_sentiment?: string | null;
  summary?: string | null;
  metric_evidence?: MetricEvidence | null;
}): CustomerVoiceInsight {
  return normalizeCustomerVoice(
    score.metric_evidence?.customer_voice,
    score.customer_sentiment,
  );
}

export function summarizeCustomerVoice(
  scores: Array<{
    customer_sentiment?: string | null;
    metric_evidence?: MetricEvidence | null;
  }>,
): CustomerVoiceSummary {
  let satisfied_count = 0;
  let frustrated_count = 0;
  let mixed_count = 0;
  let neutral_count = 0;
  let analyzed = 0;

  for (const score of scores) {
    const voice = customerVoiceFromScore(score);
    if (voice.stance === "unknown") continue;
    analyzed += 1;
    if (voice.stance === "satisfied") satisfied_count += 1;
    else if (voice.stance === "frustrated") frustrated_count += 1;
    else if (voice.stance === "mixed") mixed_count += 1;
    else neutral_count += 1;
  }

  const pct = (n: number) => (analyzed ? Math.round((n / analyzed) * 100) : null);

  return {
    analyzed,
    satisfied_count,
    frustrated_count,
    mixed_count,
    neutral_count,
    satisfied_pct: pct(satisfied_count),
    frustrated_pct: pct(frustrated_count),
  };
}

export function stanceLabel(stance: CustomerStance) {
  if (stance === "satisfied") return "Satisfied";
  if (stance === "frustrated") return "Frustrated";
  if (stance === "mixed") return "Mixed";
  if (stance === "neutral") return "Neutral";
  return "Unknown";
}
