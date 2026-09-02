import type {
  CallAnalysis,
  CallScore,
  MetricEvidence,
  ScoreParameter,
  Verdict,
} from "@/lib/types";

/** Max allowed swing when the same call is audited again. */
export const RESCORE_VARIANCE = 5;

export type PreviousCallScore = Pick<
  CallScore,
  | "overall_score"
  | "greeting"
  | "empathy"
  | "professionalism"
  | "resolution"
  | "communication"
  | "language_handling"
  | "verdict"
  | "metric_evidence"
>;

function clampScore(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function withinVariance(value: number, anchor: number, maxDelta = RESCORE_VARIANCE) {
  return clampScore(Math.max(anchor - maxDelta, Math.min(anchor + maxDelta, value)));
}

function verdictFromOverall(score: number): Verdict {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "needs_improvement";
  return "poor";
}

function hadAutoZero(score: PreviousCallScore | CallAnalysis | null | undefined) {
  if (!score) return false;
  const evidence = score.metric_evidence as MetricEvidence | null | undefined;
  return (
    Number(score.overall_score) === 0 &&
    evidence?.raw_score != null &&
    Number(evidence.raw_score) > 0
  );
}

function formatAnchorBlock(previous: PreviousCallScore) {
  const params = previous.metric_evidence?.parameters;
  const paramLines =
    Array.isArray(params) && params.length
      ? params
          .slice(0, 40)
          .map((row) => `- ${row.name}: ${Math.round(Number(row.score) || 0)}%`)
          .join("\n")
      : [
          `- Greeting: ${previous.greeting}%`,
          `- Empathy: ${previous.empathy}%`,
          `- Professionalism: ${previous.professionalism}%`,
          `- Resolution: ${previous.resolution}%`,
          `- Communication: ${previous.communication}%`,
          `- Language: ${previous.language_handling}%`,
        ].join("\n");

  return [
    `PREVIOUS AUDIT ANCHOR (same call, re-audit):`,
    `Overall was ${previous.overall_score}%. Keep this re-audit within ${RESCORE_VARIANCE} points of that overall (±${RESCORE_VARIANCE}) so different auditors do not see wild swings.`,
    `Match parameter names to the previous list when possible and keep each parameter within ±${RESCORE_VARIANCE} unless the scorecard Auto-Zero rule newly applies.`,
    `Previous parameters:`,
    paramLines,
  ].join("\n");
}

/**
 * Soft guidance for the model + hard post-clamp so re-audits stay trustworthy.
 */
export function previousScorePromptBlock(previous: PreviousCallScore | null | undefined) {
  if (!previous || previous.overall_score == null) return "";
  return formatAnchorBlock(previous);
}

function stabilizeParameters(
  next: ScoreParameter[] | undefined,
  previous: ScoreParameter[] | undefined,
): ScoreParameter[] | undefined {
  if (!next?.length || !previous?.length) return next;
  const byName = new Map(
    previous.map((row) => [row.name.trim().toLowerCase(), row] as const),
  );
  return next.map((row) => {
    const anchor = byName.get(row.name.trim().toLowerCase());
    if (!anchor) return row;
    return {
      ...row,
      score: withinVariance(row.score, Number(anchor.score) || 0),
    };
  });
}

/**
 * When the same call is scored again, keep overall (and matching parameters)
 * within ±RESCORE_VARIANCE of the previous audit — except a newly applied Auto-Zero.
 */
export function stabilizeRescoreAnalysis(
  analysis: CallAnalysis,
  previous: PreviousCallScore | null | undefined,
): CallAnalysis {
  if (!previous || previous.overall_score == null) return analysis;

  const nextAutoZero = hadAutoZero(analysis);
  const prevAutoZero = hadAutoZero(previous);

  // New Auto-Zero fail may drop to 0 — that is intentional, not random variance.
  if (nextAutoZero && !prevAutoZero) {
    return analysis;
  }

  const evidence: MetricEvidence = { ...(analysis.metric_evidence || {}) };
  const stabilizedParams = stabilizeParameters(
    evidence.parameters,
    previous.metric_evidence?.parameters,
  );
  if (stabilizedParams) {
    evidence.parameters = stabilizedParams;
  }

  const dimensions = [
    "greeting",
    "empathy",
    "professionalism",
    "resolution",
    "communication",
    "language_handling",
  ] as const;

  const clampedDims = Object.fromEntries(
    dimensions.map((key) => [
      key,
      withinVariance(Number(analysis[key]) || 0, Number(previous[key]) || 0),
    ]),
  ) as Pick<CallAnalysis, (typeof dimensions)[number]>;

  let overall = Number(analysis.overall_score) || 0;
  const prevOverall = Number(previous.overall_score) || 0;

  if (nextAutoZero && prevAutoZero) {
    // Stay at 0, but keep favoured/raw score stable so users are not surprised.
    const prevRaw = Number(previous.metric_evidence?.raw_score);
    const nextRaw = Number(evidence.raw_score);
    if (Number.isFinite(prevRaw) && Number.isFinite(nextRaw)) {
      evidence.raw_score = withinVariance(nextRaw, prevRaw);
    }
    overall = 0;
  } else {
    // Prefer weighted sum from stabilized company parameters when available.
    if (stabilizedParams?.length) {
      const weighted = stabilizedParams.filter(
        (row) => row.weight_pct != null && Number(row.weight_pct) > 0,
      );
      if (weighted.length) {
        const totalWeight = weighted.reduce((sum, row) => sum + Number(row.weight_pct), 0);
        if (totalWeight > 0) {
          overall = clampScore(
            weighted.reduce(
              (sum, row) => sum + (row.score * Number(row.weight_pct)) / totalWeight,
              0,
            ),
          );
        } else {
          overall = clampScore(
            stabilizedParams.reduce((sum, row) => sum + row.score, 0) /
              stabilizedParams.length,
          );
        }
      } else {
        overall = clampScore(
          stabilizedParams.reduce((sum, row) => sum + row.score, 0) /
            stabilizedParams.length,
        );
      }
    }
    overall = withinVariance(overall, prevOverall);
    if (evidence.raw_score != null) {
      evidence.raw_score = withinVariance(Number(evidence.raw_score), prevOverall);
    }
  }

  evidence.rescore_variance = {
    previous_overall: prevOverall,
    max_delta: RESCORE_VARIANCE,
    applied: true,
  };

  return {
    ...analysis,
    ...clampedDims,
    overall_score: overall,
    verdict: verdictFromOverall(overall),
    metric_evidence: evidence,
  };
}
