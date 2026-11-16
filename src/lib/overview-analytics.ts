import {
  complianceChecksFromScore,
  complianceFollowRateFromScore,
  failedComplianceFromScore,
  rollupComplianceRate,
} from "@/lib/compliance-engine";
import { customerVoiceFromScore, summarizeCustomerVoice } from "@/lib/customer-voice";
import { agentLabel, languageLabel } from "@/lib/format";
import { scorecardRows } from "@/lib/scorecard-rows";
import type { CallScore } from "@/lib/types";
import { CHART_TZ } from "@/lib/workspace-charts";

export type OverviewCallInput = {
  id: string;
  title?: string | null;
  file_name?: string | null;
  status: string;
  duration_seconds?: number | null;
  language_mode?: string | null;
  detected_language?: string | null;
  created_at: string;
  completed_at?: string | null;
  audited_at?: string | null;
  agent_id?: string | null;
  agents?: { name?: string | null } | { name?: string | null }[] | null;
  call_scores?: CallScore | CallScore[] | null;
};

export type OverviewDelta = {
  text: string;
  tone: "positive" | "negative" | "neutral";
  diff: number;
};

export type OverviewLanguageSlice = {
  mode: string;
  label: string;
  count: number;
};

export type OverviewPeriodSummary = {
  totalCalls: number;
  auditedCount: number;
  avgScore: number | null;
  passCount: number;
  passRate: number | null;
  totalAudioSeconds: number;
  ahtSeconds: number | null;
  complianceFollowedPct: number | null;
  complianceNotFollowedPct: number | null;
  complianceFailCount: number;
  autoZeroCount: number;
  languageMix: OverviewLanguageSlice[];
};

export type OverviewMetricsResult = {
  days: "all" | number;
  current: OverviewPeriodSummary;
  previous: OverviewPeriodSummary | null;
  deltas: {
    score: OverviewDelta | null;
    audited: OverviewDelta | null;
    compliance: OverviewDelta | null;
    aht: OverviewDelta | null;
  };
};

export type OverviewGapItem = {
  id: string;
  kind: "compliance" | "rubric";
  label: string;
  detail: string;
  failCount: number;
  totalEvaluated: number;
  avgScore: number | null;
  critical: boolean;
  sampleCallId: string | null;
};

export type OverviewThemeCount = {
  theme: string;
  count: number;
};

export type OverviewSentimentSummary = {
  totalWithVoice: number;
  counts: {
    satisfied: number;
    neutral: number;
    mixed: number;
    frustrated: number;
  };
  frustrationThemes: OverviewThemeCount[];
  satisfactionThemes: OverviewThemeCount[];
};

export type OverviewComplianceItem = {
  rule: string;
  result: string;
  fileName: string | null;
  critical: boolean;
  note: string | null;
  quote: string | null;
};

export type OverviewScoreDimension = {
  key: string;
  label: string;
  score: number;
};

export type OverviewCallItem = {
  id: string;
  title: string;
  fileName: string | null;
  agentName: string;
  status: string;
  durationSeconds: number | null;
  languageMode: string | null;
  languageLabel: string;
  createdAt: string;
  auditedAt: string | null;
  overallScore: number | null;
  verdict: string | null;
  summary: string | null;
  strengths: string[];
  improvements: string[];
  complianceFindings: string[];
  complianceChecks: OverviewComplianceItem[];
  failedComplianceCount: number;
  complianceRatePct: number | null;
  autoZeroApplied: boolean;
  customerStance: string | null;
  customerNote: string | null;
  customerQuote: string | null;
  scoreDimensions: OverviewScoreDimension[];
};

const DAY_MS = 86_400_000;

function formatYmdParts(date: Date, tz: string): { year: number; month: number; day: number; key: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const key = formatter.format(date);
  const [yStr, mStr, dStr] = key.split("-");
  return {
    year: Number(yStr),
    month: Number(mStr),
    day: Number(dStr),
    key,
  };
}

/**
 * Convert an ISO timestamp or Date to a YYYY-MM-DD calendar key in the workspace timezone.
 */
export function dayKeyInTz(value: string | Date | null | undefined, tz = CHART_TZ): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatYmdParts(parsed, tz).key;
}

/**
 * Compute non-overlapping current and immediate prior calendar-day windows in the workspace timezone.
 */
export function shiftWindowDays(
  days: number,
  now: Date = new Date(),
  tz = CHART_TZ,
): {
  currentKeys: Set<string>;
  previousKeys: Set<string>;
  currentKeyList: string[];
  previousKeyList: string[];
} {
  const safeDays = Math.max(1, Math.floor(days));
  const { year, month, day } = formatYmdParts(now, tz);
  const todayUtcMs = Date.UTC(year, month - 1, day);

  const currentKeyList: string[] = [];
  const previousKeyList: string[] = [];

  for (let i = safeDays - 1; i >= 0; i--) {
    currentKeyList.push(new Date(todayUtcMs - i * DAY_MS).toISOString().slice(0, 10));
  }
  for (let i = safeDays * 2 - 1; i >= safeDays; i--) {
    previousKeyList.push(new Date(todayUtcMs - i * DAY_MS).toISOString().slice(0, 10));
  }

  return {
    currentKeys: new Set(currentKeyList),
    previousKeys: new Set(previousKeyList),
    currentKeyList,
    previousKeyList,
  };
}

export function pickCallScore(call: OverviewCallInput): CallScore | null {
  if (!call.call_scores) return null;
  return Array.isArray(call.call_scores) ? call.call_scores[0] ?? null : call.call_scores;
}

function summarizeSlice(calls: OverviewCallInput[]): OverviewPeriodSummary {
  const scoredEntries: Array<{ call: OverviewCallInput; score: CallScore }> = [];
  const complianceRates: Array<{ passed: number; failed: number }> = [];
  let totalAudioSeconds = 0;
  let durationSum = 0;
  let durationCount = 0;
  let autoZeroCount = 0;
  let complianceFailCount = 0;
  const langMap = new Map<string, { mode: string; label: string; count: number }>();

  for (const call of calls) {
    const dur =
      typeof call.duration_seconds === "number" && Number.isFinite(call.duration_seconds)
        ? call.duration_seconds
        : 0;
    if (dur > 0) {
      totalAudioSeconds += dur;
      durationSum += dur;
      durationCount += 1;
    }

    const effectiveLang = call.detected_language || call.language_mode || null;
    const mode = (effectiveLang || "unknown").toLowerCase();
    const label = languageLabel(effectiveLang);
    const existingLang = langMap.get(mode);
    if (existingLang) {
      existingLang.count += 1;
    } else {
      langMap.set(mode, { mode, label, count: 1 });
    }

    const score = pickCallScore(call);
    if (
      call.status === "completed" &&
      score &&
      typeof score.overall_score === "number" &&
      Number.isFinite(score.overall_score)
    ) {
      scoredEntries.push({ call, score });
      if (score.metric_evidence?.auto_zero_applied) {
        autoZeroCount += 1;
      }
      const rate = complianceFollowRateFromScore(score);
      complianceRates.push({ passed: rate.passed, failed: rate.failed });
      const failed = failedComplianceFromScore(score);
      if (failed.length > 0) {
        complianceFailCount += 1;
      }
    }
  }

  const auditedCount = scoredEntries.length;
  const scoreSum = scoredEntries.reduce((acc, item) => acc + item.score.overall_score, 0);
  const passCount = scoredEntries.filter((item) => item.score.overall_score >= 70).length;
  const avgScore = auditedCount > 0 ? Math.round(scoreSum / auditedCount) : null;
  const passRate = auditedCount > 0 ? Math.round((passCount / auditedCount) * 100) : null;
  const ahtSeconds = durationCount > 0 ? Math.round(durationSum / durationCount) : null;

  const rolledUpCompliance = rollupComplianceRate(complianceRates);
  const languageMix = Array.from(langMap.values()).sort((a, b) => b.count - a.count);

  return {
    totalCalls: calls.length,
    auditedCount,
    avgScore,
    passCount,
    passRate,
    totalAudioSeconds,
    ahtSeconds,
    complianceFollowedPct: rolledUpCompliance.followed_pct,
    complianceNotFollowedPct: rolledUpCompliance.not_followed_pct,
    complianceFailCount,
    autoZeroCount,
    languageMix,
  };
}

function computeDelta(
  current: number | null,
  previous: number | null,
  days: number,
  options: { suffix: string; higherIsBetter: boolean | null },
): OverviewDelta | null {
  if (current === null || previous === null) return null;
  const diff = current - previous;
  const sign = diff > 0 ? "+" : "";
  const text = `${sign}${diff}${options.suffix} vs prior ${days}d`;
  if (diff === 0 || options.higherIsBetter === null) {
    return { text, tone: "neutral", diff };
  }
  const improved = diff > 0 ? options.higherIsBetter : !options.higherIsBetter;
  return { text, tone: improved ? "positive" : "negative", diff };
}

/**
 * Compute real current and previous period overview KPIs and period-over-period deltas.
 * Returns null deltas when "all" is selected or when no prior-window baseline exists.
 */
export function computeOverviewMetrics({
  allCalls,
  days,
  now = new Date(),
  tz = CHART_TZ,
}: {
  allCalls: OverviewCallInput[];
  days: "all" | number;
  now?: Date;
  tz?: string;
}): OverviewMetricsResult {
  if (days === "all") {
    return {
      days,
      current: summarizeSlice(allCalls),
      previous: null,
      deltas: {
        score: null,
        audited: null,
        compliance: null,
        aht: null,
      },
    };
  }

  const { currentKeys, previousKeys } = shiftWindowDays(days, now, tz);
  const currentSlice: OverviewCallInput[] = [];
  const previousSlice: OverviewCallInput[] = [];

  for (const call of allCalls) {
    const key = dayKeyInTz(call.completed_at || call.audited_at || call.created_at, tz);
    if (!key) continue;
    if (currentKeys.has(key)) {
      currentSlice.push(call);
    } else if (previousKeys.has(key)) {
      previousSlice.push(call);
    }
  }

  const current = summarizeSlice(currentSlice);
  const hasPreviousBaseline = previousSlice.length > 0;
  const previous = hasPreviousBaseline ? summarizeSlice(previousSlice) : null;

  if (!previous) {
    return {
      days,
      current,
      previous: null,
      deltas: {
        score: null,
        audited: null,
        compliance: null,
        aht: null,
      },
    };
  }

  return {
    days,
    current,
    previous,
    deltas: {
      score: computeDelta(current.avgScore, previous.avgScore, days, {
        suffix: " pts",
        higherIsBetter: true,
      }),
      audited: computeDelta(current.auditedCount, previous.auditedCount, days, {
        suffix: "",
        higherIsBetter: true,
      }),
      compliance: computeDelta(current.complianceFollowedPct, previous.complianceFollowedPct, days, {
        suffix: "%",
        higherIsBetter: true,
      }),
      aht: computeDelta(current.ahtSeconds, previous.ahtSeconds, days, {
        suffix: "s",
        higherIsBetter: null,
      }),
    },
  };
}

/**
 * Aggregate genuine compliance rule misses and low-scoring scorecard rubric dimensions.
 */
export function extractTopOverviewGaps(calls: OverviewCallInput[], limit = 6): OverviewGapItem[] {
  const complianceMap = new Map<
    string,
    { label: string; fileName: string | null; failCount: number; totalEvaluated: number; critical: boolean; sampleCallId: string | null }
  >();
  const rubricMap = new Map<
    string,
    { label: string; scoreSum: number; belowCount: number; totalEvaluated: number; sampleCallId: string | null }
  >();

  for (const call of calls) {
    if (call.status !== "completed") continue;
    const score = pickCallScore(call);
    if (!score) continue;

    const checks = complianceChecksFromScore(score);
    for (const check of checks) {
      if (check.result === "n/a") continue;
      const label = (check.rule || "Compliance rule").trim();
      const mapKey = label.toLowerCase();
      const entry = complianceMap.get(mapKey) ?? {
        label,
        fileName: check.file_name || null,
        failCount: 0,
        totalEvaluated: 0,
        critical: false,
        sampleCallId: null,
      };
      entry.totalEvaluated += 1;
      if (check.result === "fail") {
        entry.failCount += 1;
        if (check.severity === "critical") entry.critical = true;
        if (!entry.sampleCallId) entry.sampleCallId = call.id;
      }
      complianceMap.set(mapKey, entry);
    }

    const rows = scorecardRows(score);
    for (const row of rows) {
      if (typeof row.score !== "number" || !Number.isFinite(row.score)) continue;
      const label = row.name.trim();
      const mapKey = label.toLowerCase();
      const entry = rubricMap.get(mapKey) ?? {
        label,
        scoreSum: 0,
        belowCount: 0,
        totalEvaluated: 0,
        sampleCallId: null,
      };
      entry.totalEvaluated += 1;
      entry.scoreSum += row.score;
      if (row.score < 70) {
        entry.belowCount += 1;
        if (!entry.sampleCallId) entry.sampleCallId = call.id;
      } else if (!entry.sampleCallId && row.score < 85) {
        entry.sampleCallId = call.id;
      }
      rubricMap.set(mapKey, entry);
    }
  }

  const gaps: OverviewGapItem[] = [];

  for (const [key, item] of complianceMap.entries()) {
    if (item.failCount <= 0) continue;
    const pct = item.totalEvaluated > 0 ? Math.round((item.failCount / item.totalEvaluated) * 100) : 0;
    gaps.push({
      id: `compliance:${key}`,
      kind: "compliance",
      label: item.label,
      detail: item.fileName ? `${item.fileName} · ${pct}% miss rate` : `${pct}% miss rate`,
      failCount: item.failCount,
      totalEvaluated: item.totalEvaluated,
      avgScore: null,
      critical: item.critical,
      sampleCallId: item.sampleCallId,
    });
  }

  for (const [key, item] of rubricMap.entries()) {
    if (item.totalEvaluated === 0) continue;
    const avgScore = Math.round(item.scoreSum / item.totalEvaluated);
    if (avgScore >= 85 && item.belowCount === 0) continue;
    gaps.push({
      id: `rubric:${key}`,
      kind: "rubric",
      label: item.label,
      detail:
        item.belowCount > 0
          ? `${item.belowCount} call${item.belowCount === 1 ? "" : "s"} below 70%`
          : `Avg ${avgScore}% across scored calls`,
      failCount: item.belowCount,
      totalEvaluated: item.totalEvaluated,
      avgScore,
      critical: avgScore < 60,
      sampleCallId: item.sampleCallId,
    });
  }

  gaps.sort((a, b) => {
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "compliance" ? -1 : 1;
    if (b.failCount !== a.failCount) return b.failCount - a.failCount;
    return (a.avgScore ?? 100) - (b.avgScore ?? 100);
  });

  return gaps.slice(0, limit);
}

/**
 * Summarize real customer_voice stances and extracted satisfaction/frustration themes.
 */
export function extractCustomerSentimentSummary(calls: OverviewCallInput[]): OverviewSentimentSummary {
  const scored = calls
    .filter((call) => call.status === "completed")
    .map((call) => pickCallScore(call))
    .filter((score): score is CallScore => score !== null);

  const summary = summarizeCustomerVoice(scored);
  const frustrationMap = new Map<string, number>();
  const satisfactionMap = new Map<string, number>();

  for (const score of scored) {
    const voice = customerVoiceFromScore(score);
    for (const raw of voice.frustration_themes) {
      const cleaned = raw.trim();
      if (!cleaned) continue;
      frustrationMap.set(cleaned, (frustrationMap.get(cleaned) ?? 0) + 1);
    }
    for (const raw of voice.satisfaction_themes) {
      const cleaned = raw.trim();
      if (!cleaned) continue;
      satisfactionMap.set(cleaned, (satisfactionMap.get(cleaned) ?? 0) + 1);
    }
  }

  const toSortedList = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

  return {
    totalWithVoice: summary.analyzed,
    counts: {
      satisfied: summary.satisfied_count,
      neutral: summary.neutral_count,
      mixed: summary.mixed_count,
      frustrated: summary.frustrated_count,
    },
    frustrationThemes: toSortedList(frustrationMap),
    satisfactionThemes: toSortedList(satisfactionMap),
  };
}

/**
 * Map Supabase call + score records into compact, JSON-safe items for the Overview interactive board.
 */
export function serializeOverviewCalls(calls: OverviewCallInput[], limit = 200): OverviewCallItem[] {
  const sorted = [...calls].sort((a, b) => {
    const tA = new Date(a.created_at).getTime();
    const tB = new Date(b.created_at).getTime();
    return (Number.isFinite(tB) ? tB : 0) - (Number.isFinite(tA) ? tA : 0);
  });

  return sorted.slice(0, limit).map((call) => {
    const score = pickCallScore(call);
    const checks = score ? complianceChecksFromScore(score) : [];
    const failedChecks = score ? failedComplianceFromScore(score) : [];
    const rate = score ? complianceFollowRateFromScore(score) : null;
    const rows = score ? scorecardRows(score) : [];
    const voice = score ? customerVoiceFromScore(score) : null;

    const effectiveLang = call.detected_language || call.language_mode || null;

    return {
      id: call.id,
      title: (call.title || call.file_name || "Untitled recording").trim(),
      fileName: call.file_name ?? null,
      agentName: agentLabel(call),
      status: call.status,
      durationSeconds:
        typeof call.duration_seconds === "number" && Number.isFinite(call.duration_seconds)
          ? call.duration_seconds
          : null,
      languageMode: effectiveLang,
      languageLabel: languageLabel(effectiveLang),
      createdAt: call.created_at,
      auditedAt: call.completed_at ?? call.audited_at ?? null,
      overallScore:
        score && typeof score.overall_score === "number" && Number.isFinite(score.overall_score)
          ? score.overall_score
          : null,
      verdict: score?.verdict ?? null,
      summary: score?.summary ?? null,
      strengths: Array.isArray(score?.strengths) ? score.strengths.slice(0, 4) : [],
      improvements: Array.isArray(score?.improvements) ? score.improvements.slice(0, 4) : [],
      complianceFindings: Array.isArray(score?.compliance_findings) ? score.compliance_findings.slice(0, 5) : [],
      complianceChecks: checks.map((c) => ({
        rule: c.rule,
        result: c.result,
        fileName: c.file_name || null,
        critical: c.severity === "critical",
        note: c.note || null,
        quote: c.quote || null,
      })),
      failedComplianceCount: failedChecks.length,
      complianceRatePct: rate?.followed_pct ?? null,
      autoZeroApplied: Boolean(score?.metric_evidence?.auto_zero_applied),
      customerStance: voice && voice.stance !== "unknown" ? voice.stance : null,
      customerNote: voice?.note ?? null,
      customerQuote: voice?.quote ?? null,
      scoreDimensions: rows
        .filter((r) => typeof r.score === "number" && Number.isFinite(r.score))
        .map((r) => ({
          key: r.name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
          label: r.name,
          score: r.score,
        })),
    };
  });
}
