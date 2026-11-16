import { z } from "zod";

export const CallListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  fileName: z.string().nullable(),
  hasAudio: z.boolean(),
  durationSeconds: z.number().nullable(),
  language: z.string(),
  status: z.enum(["queued", "transcribing", "transcribed", "analyzing", "completed", "failed"]),
  channel: z.enum(["voice", "whatsapp", "email", "chat", "other"]),
  agentId: z.string().nullable(),
  agentName: z.string(),
  teamId: z.string().nullable(),
  teamName: z.string().nullable(),
  queueId: z.string().nullable(),
  queueName: z.string().nullable(),
  reviewStatus: z.enum(["pending", "approved", "needs_coaching", "escalated"]),
  createdAt: z.string(),
  auditedAt: z.string(),
  overallScore: z.number().nullable(),
  verdict: z.string().nullable(),
  sentiment: z.enum(["positive", "neutral", "negative", "unknown"]),
  compliancePct: z.number().nullable(),
  complianceFailedCount: z.number(),
  criticalFailureCount: z.number(),
  needsReview: z.boolean(),
  summary: z.string().nullable(),
});

export const FlaggedCallsResponseSchema = z.object({
  items: z.array(CallListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
  totalWorkspaceCalls: z.number(),
  lastAnalyzedAt: z.string().nullable(),
});

export const CallUtteranceSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  speakerLabel: z.string(),
  role: z.string(),
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  confidence: z.number().nullable(),
});

export const CallScorecardItemSchema = z.object({
  name: z.string(),
  score: z.number(),
  weightPct: z.number().nullable(),
  note: z.string().nullable(),
  gapNote: z.string().nullable(),
  quote: z.string().nullable(),
  startS: z.number().nullable(),
});

export const CallComplianceItemSchema = z.object({
  rule: z.string(),
  fileName: z.string(),
  result: z.string(),
  severity: z.string(),
  note: z.string().nullable(),
  quote: z.string().nullable(),
  startS: z.number().nullable(),
});

export const CallHighlightSchema = z.object({
  id: z.string(),
  kind: z.enum(["gap", "compliance", "strength"]),
  label: z.string(),
  quote: z.string(),
  startS: z.number().nullable(),
  note: z.string().nullable(),
});

export const CoachingTaskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string(),
  criterion: z.string().nullable(),
  priority: z.string(),
  status: z.string(),
  dueAt: z.string().nullable(),
  createdAt: z.string(),
});

export const CallDetailResponseSchema = z.object({
  call: z.object({
    id: z.string().uuid(),
    title: z.string(),
    fileName: z.string().nullable(),
    hasAudio: z.boolean(),
    durationSeconds: z.number().nullable(),
    language: z.string(),
    channel: z.string(),
    agentId: z.string().nullable(),
    agentName: z.string(),
    status: z.string(),
    reviewStatus: z.string(),
    createdAt: z.string(),
    completedAt: z.string().nullable(),
  }),
  summary: z.string().nullable(),
  overallScore: z.number().nullable(),
  verdict: z.string().nullable(),
  sentiment: z.enum(["positive", "neutral", "negative", "unknown"]),
  complianceFollowedPct: z.number().nullable(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  scorecard: z.array(CallScorecardItemSchema),
  complianceChecks: z.array(CallComplianceItemSchema),
  highlights: z.array(CallHighlightSchema),
  utterances: z.array(CallUtteranceSchema),
  coachingTasks: z.array(CoachingTaskItemSchema),
});

export const CallAudioUrlResponseSchema = z.object({
  signedUrl: z.string().nullable(),
  expiresAt: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  reason: z.string().nullable(),
});

export const BulkCallActionResponseSchema = z.object({
  updatedCount: z.number(),
  reviewStatus: z.enum(["approved", "needs_coaching", "escalated"]),
});

export type CallListItem = z.infer<typeof CallListItemSchema>;
export type FlaggedCallsResponse = z.infer<typeof FlaggedCallsResponseSchema>;
export type CallDetailResponse = z.infer<typeof CallDetailResponseSchema>;
export type CallAudioUrlResponse = z.infer<typeof CallAudioUrlResponseSchema>;
export type CoachingTaskItem = z.infer<typeof CoachingTaskItemSchema>;

