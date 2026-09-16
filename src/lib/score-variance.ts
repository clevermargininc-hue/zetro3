import type {
  CallAnalysis,
  CallScore,
  MetricEvidence,
  ScoreParameter,
  Verdict,
} from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamScope } from "@/lib/workspaces";

/** Max allowed swing when the same call / recording is audited again. */
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

export type ConsistencyAnchor = {
  score: PreviousCallScore;
  source: "same_call" | "team_same_recording";
};

const SCORE_SELECT =
  "overall_score, greeting, empathy, professionalism, resolution, communication, language_handling, verdict, metric_evidence";

function clampScore(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function verdictFromOverall(score: number): Verdict {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "needs_improvement";
  return "poor";
}

/** Company weights are percent-of-100. Do not renormalize to the weights the model happened to return. */
export function overallFromParameters(
  parameters: { score: number; weight_pct?: number | null }[] | undefined,
): number | null {
  if (!parameters?.length) return null;
  const weighted = parameters.filter(
    (row) => row.weight_pct != null && Number.isFinite(Number(row.weight_pct)),
  );
  if (!weighted.length) {
    return clampScore(
      parameters.reduce((sum, row) => sum + (Number(row.score) || 0), 0) /
        parameters.length,
    );
  }
  const earned = weighted.reduce(
    (sum, row) => sum + (Number(row.score) || 0) * Math.max(0, Number(row.weight_pct)) / 100,
    0,
  );
  return clampScore(earned);
}

function withinVariance(value: number, anchor: number, maxDelta = RESCORE_VARIANCE) {
  return clampScore(Math.max(anchor - maxDelta, Math.min(anchor + maxDelta, value)));
}

function hadAutoZero(score: PreviousCallScore | CallAnalysis | null | undefined) {
  if (!score) return false;
  const evidence = score.metric_evidence as MetricEvidence | null | undefined;
  if (evidence?.auto_zero_applied === true) return true;
  if (evidence?.auto_zero_applied === false) return false;
  return false;
}

function formatAnchorBlock(previous: PreviousCallScore, source: ConsistencyAnchor["source"]) {
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

  const who =
    source === "same_call"
      ? "same call re-audit (any account / any number of times)"
      : "same recording already audited in this company workspace (same Standards fingerprint)";

  return [
    `CONSISTENCY ANCHOR (${who}):`,
    `A prior audit of this same recording scored overall ${previous.overall_score}%.`,
    `You MUST stay within ±${RESCORE_VARIANCE} of that overall and of matching company parameters when Standards files are unchanged.`,
    `If company Standards / scorecard content changed, score freshly from the new files — do not chase the old number.`,
    `Different auditors and repeated audits must produce consistent results against the SAME company Standards files.`,
    `Only leave this band if a company Auto-Zero rule newly and clearly applies, or Standards changed.`,
    `Read the company scorecard / checklist carefully — do not invent a new rubric.`,
    `Previous company parameters:`,
    paramLines,
  ].join("\n");
}

/**
 * Soft guidance for the model + hard post-clamp so re-audits stay trustworthy.
 */
export function previousScorePromptBlock(anchor: ConsistencyAnchor | null | undefined) {
  if (!anchor?.score || anchor.score.overall_score == null) return "";
  return formatAnchorBlock(anchor.score, anchor.source);
}

/**
 * Stable seed so the same recording + company standards tend toward the same model path.
 */
export function consistencySeed(parts: {
  fileName?: string | null;
  durationSeconds?: number | null;
  assemblyId?: string | null;
  standardsFingerprint?: string;
}) {
  const raw = [
    (parts.fileName || "").trim().toLowerCase(),
    String(parts.durationSeconds ?? ""),
    parts.assemblyId || "",
    parts.standardsFingerprint || "",
  ].join("|");
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 2147483647;
}

export function standardsFingerprint(
  docs: {
    id: string;
    kind: string;
    extracted_text?: string | null;
    updated_at?: string | null;
    created_at?: string;
  }[],
) {
  return docs
    .map((doc) => {
      const text = (doc.extracted_text || "").trim();
      let hash = 2166136261;
      const sample = text.slice(0, 4000);
      for (let i = 0; i < sample.length; i++) {
        hash ^= sample.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return `${doc.kind}:${doc.id}:${text.length}:${Math.abs(hash)}:${doc.updated_at || doc.created_at || ""}`;
    })
    .sort()
    .join(";");
}

function sameRecording(
  a: {
    file_name?: string | null;
    duration_seconds?: number | null;
    assembly_id?: string | null;
  },
  b: {
    file_name?: string | null;
    duration_seconds?: number | null;
    assembly_id?: string | null;
  },
) {
  if (a.assembly_id && b.assembly_id && a.assembly_id === b.assembly_id) return true;
  const nameA = (a.file_name || "").trim().toLowerCase();
  const nameB = (b.file_name || "").trim().toLowerCase();
  if (!nameA || !nameB || nameA !== nameB) return false;
  const durA = Number(a.duration_seconds ?? 0);
  const durB = Number(b.duration_seconds ?? 0);
  if (!durA || !durB) return false;
  return Math.abs(durA - durB) <= 5;
}

/**
 * Prefer this call's prior score; otherwise a completed peer audit of the same
 * recording inside the company workspace (so different accounts stay consistent).
 */
export async function loadConsistencyAnchor(call: {
  id: string;
  user_id: string;
  file_name?: string | null;
  duration_seconds?: number | null;
  assembly_id?: string | null;
}): Promise<ConsistencyAnchor | null> {
  const db = createAdminClient();

  const { data: sameCall } = await db
    .from("call_scores")
    .select(SCORE_SELECT)
    .eq("call_id", call.id)
    .maybeSingle();
  if (sameCall) {
    return { score: sameCall as PreviousCallScore, source: "same_call" };
  }

  const teamScope = await getTeamScope(call.user_id);
  const { data: peers } = await db
    .from("calls")
    .select("id, file_name, duration_seconds, assembly_id")
    .in("user_id", teamScope)
    .neq("id", call.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(40);

  const match = (peers || []).find((peer) => sameRecording(call, peer));
  if (!match) return null;

  const { data: peerScore } = await db
    .from("call_scores")
    .select(SCORE_SELECT)
    .eq("call_id", match.id)
    .maybeSingle();
  if (!peerScore) return null;

  return { score: peerScore as PreviousCallScore, source: "team_same_recording" };
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
 * Keep overall (and matching company parameters) within ±RESCORE_VARIANCE of a
 * prior audit of the same recording — except a newly applied Auto-Zero, or when
 * company Standards content changed (fingerprint mismatch).
 */
export function stabilizeRescoreAnalysis(
  analysis: CallAnalysis,
  previous: PreviousCallScore | null | undefined,
  source: ConsistencyAnchor["source"] = "same_call",
  options?: { standardsFingerprint?: string },
): CallAnalysis {
  const nextFp = options?.standardsFingerprint?.trim() || "";
  const evidenceBase: MetricEvidence = {
    ...(analysis.metric_evidence || {}),
    ...(nextFp ? { standards_fingerprint: nextFp } : {}),
  };

  if (!previous || previous.overall_score == null) {
    if (hadAutoZero(analysis)) {
      const fromParams = overallFromParameters(evidenceBase.parameters);
      let favoured = Number(evidenceBase.raw_score);
      if (!Number.isFinite(favoured) || (favoured === 0 && fromParams != null && fromParams > 0)) {
        favoured = fromParams ?? 0;
      }
      return {
        ...analysis,
        overall_score: 0,
        verdict: verdictFromOverall(0),
        metric_evidence: {
          ...evidenceBase,
          auto_zero_applied: true,
          raw_score: clampScore(favoured),
        },
      };
    }
    return { ...analysis, metric_evidence: evidenceBase };
  }

  const prevFp = String(previous.metric_evidence?.standards_fingerprint || "").trim();
  if (nextFp && prevFp && nextFp !== prevFp) {
    if (hadAutoZero(analysis)) {
      const fromParams = overallFromParameters(evidenceBase.parameters);
      let favoured = Number(evidenceBase.raw_score);
      if (!Number.isFinite(favoured) || (favoured === 0 && fromParams != null && fromParams > 0)) {
        favoured = fromParams ?? 0;
      }
      return {
        ...analysis,
        overall_score: 0,
        verdict: verdictFromOverall(0),
        metric_evidence: {
          ...evidenceBase,
          auto_zero_applied: true,
          raw_score: clampScore(favoured),
          rescore_variance: {
            previous_overall: Number(previous.overall_score) || 0,
            max_delta: RESCORE_VARIANCE,
            applied: false,
            source,
          },
        },
      };
    }
    return {
      ...analysis,
      metric_evidence: {
        ...evidenceBase,
        rescore_variance: {
          previous_overall: Number(previous.overall_score) || 0,
          max_delta: RESCORE_VARIANCE,
          applied: false,
          source,
        },
      },
    };
  }

  const nextAutoZero = hadAutoZero(analysis);
  const prevAutoZero = hadAutoZero(previous);

  const evidence: MetricEvidence = { ...evidenceBase };
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

  const prevRaw = Number(previous.metric_evidence?.raw_score);

  // Auto Zero: overall is always 0; Favoured Score (raw_score) stays the earned sum.
  if (nextAutoZero) {
    const fromParams = overallFromParameters(evidence.parameters);
    let favoured = Number(evidence.raw_score);
    if (!Number.isFinite(favoured) || favoured < 0) {
      favoured =
        fromParams != null
          ? fromParams
          : prevAutoZero && Number.isFinite(prevRaw)
            ? prevRaw
            : 0;
    }
    // Prefer parameter sum when model/storage left raw_score missing or stuck at 0.
    if (favoured === 0 && fromParams != null && fromParams > 0) {
      favoured = fromParams;
    }
    if (prevAutoZero && Number.isFinite(prevRaw)) {
      favoured = withinVariance(favoured, prevRaw);
    }
    evidence.auto_zero_applied = true;
    evidence.raw_score = clampScore(favoured);
    evidence.rescore_variance = {
      previous_overall: prevAutoZero && Number.isFinite(prevRaw) ? prevRaw : Number(previous.overall_score) || 0,
      max_delta: RESCORE_VARIANCE,
      applied: true,
      source,
    };
    return {
      ...analysis,
      ...(nextAutoZero && !prevAutoZero ? {} : clampedDims),
      overall_score: 0,
      verdict: verdictFromOverall(0),
      metric_evidence: evidence,
    };
  }

  const prevOverall =
    prevAutoZero && Number.isFinite(prevRaw)
      ? prevRaw
      : Number(previous.overall_score) || 0;

  let overall = Number(analysis.overall_score) || 0;
  const fromParams = overallFromParameters(stabilizedParams);
  if (fromParams != null) overall = fromParams;
  overall = withinVariance(overall, prevOverall);
  if (evidence.raw_score != null) {
    delete evidence.raw_score;
  }

  evidence.rescore_variance = {
    previous_overall: prevOverall,
    max_delta: RESCORE_VARIANCE,
    applied: true,
    source,
  };

  return {
    ...analysis,
    ...clampedDims,
    overall_score: overall,
    verdict: verdictFromOverall(overall),
    metric_evidence: evidence,
  };
}
