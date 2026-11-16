import { z } from "zod";

export const AgentLeaderboardRowSchema = z.object({
  key: z.string(),
  agentId: z.string().nullable(),
  agentName: z.string(),
  teamName: z.string().nullable(),
  callCount: z.number(),
  avgScore: z.number(),
  previousAvgScore: z.number().nullable(),
  scoreDelta: z.number().nullable(),
  complianceRate: z.number().nullable(),
  needsReviewCount: z.number(),
  openCoachingCount: z.number(),
});

export const AgentLeaderboardResponseSchema = z.object({
  totalAgents: z.number(),
  agents: z.array(AgentLeaderboardRowSchema),
});

export type AgentLeaderboardRow = z.infer<typeof AgentLeaderboardRowSchema>;
export type AgentLeaderboardResponse = z.infer<typeof AgentLeaderboardResponseSchema>;

