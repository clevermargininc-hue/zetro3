import { z } from "zod";

export const SearchCallItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  agentName: z.string(),
  overallScore: z.number().nullable(),
  status: z.string(),
  needsReview: z.boolean(),
  createdAt: z.string(),
});

export const SearchAgentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const GlobalSearchResponseSchema = z.object({
  calls: z.array(SearchCallItemSchema),
  agents: z.array(SearchAgentItemSchema),
});

export type GlobalSearchResponse = z.infer<typeof GlobalSearchResponseSchema>;

