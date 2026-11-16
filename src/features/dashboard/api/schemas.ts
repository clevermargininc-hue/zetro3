import { z } from "zod";

export const SparklinePointSchema = z.object({
  date: z.string(),
  value: z.number(),
});

export const KpiMetricSchema = z.object({
  value: z.number().nullable(),
  previousValue: z.number().nullable(),
  delta: z.number().nullable(),
  sparkline: z.array(SparklinePointSchema),
});

export const KpiSummaryResponseSchema = z.object({
  window: z.object({
    preset: z.string(),
    from: z.string(),
    to: z.string(),
    prevFrom: z.string(),
    prevTo: z.string(),
  }),
  totalWorkspaceCalls: z.number(),
  filteredCallsCount: z.number(),
  orgTargetScore: z.number().nullable(),
  lastAnalyzedAt: z.string().nullable(),
  kpis: z.object({
    callsAnalyzed: KpiMetricSchema,
    avgScore: KpiMetricSchema,
    complianceRate: KpiMetricSchema,
    positiveSentimentPct: KpiMetricSchema,
    needsReviewCount: KpiMetricSchema,
  }),
});

export const QaTrendPointSchema = z.object({
  date: z.string(),
  label: z.string(),
  avgScore: z.number().nullable(),
  complianceRate: z.number().nullable(),
  callCount: z.number(),
});

export const FailureReasonSchema = z.object({
  id: z.string(),
  reason: z.string(),
  kind: z.enum(["compliance", "rubric"]),
  severity: z.enum(["critical", "major", "minor"]),
  failureCount: z.number(),
  failureRatePct: z.number(),
  avgScoreOnFailed: z.number().nullable(),
});

export const QaTrendResponseSchema = z.object({
  range: z.string(),
  targetScore: z.number().nullable(),
  scoredCallCount: z.number(),
  series: z.array(QaTrendPointSchema),
  failureReasons: z.array(FailureReasonSchema),
});

export const SentimentGroupBreakdownSchema = z.object({
  groupKey: z.string(),
  label: z.string(),
  positive: z.number(),
  neutral: z.number(),
  negative: z.number(),
  unknown: z.number(),
  total: z.number(),
});

export const SentimentBreakdownResponseSchema = z.object({
  groupBy: z.enum(["channel", "queue"]),
  totalScored: z.number(),
  counts: z.object({
    positive: z.number(),
    neutral: z.number(),
    negative: z.number(),
    unknown: z.number(),
  }),
  breakdown: z.array(SentimentGroupBreakdownSchema),
});

export type KpiSummaryResponse = z.infer<typeof KpiSummaryResponseSchema>;
export type QaTrendResponse = z.infer<typeof QaTrendResponseSchema>;
export type SentimentBreakdownResponse = z.infer<typeof SentimentBreakdownResponseSchema>;
export type FailureReason = z.infer<typeof FailureReasonSchema>;

