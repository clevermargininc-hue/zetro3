import { z } from "zod";

export const TeamOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string().nullable(),
});

export const QueueOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  channel: z.string(),
  teamId: z.string().nullable(),
});

export const TeamsResponseSchema = z.object({
  teams: z.array(TeamOptionSchema),
});

export const QueuesResponseSchema = z.object({
  queues: z.array(QueueOptionSchema),
});

export type TeamOption = z.infer<typeof TeamOptionSchema>;
export type QueueOption = z.infer<typeof QueueOptionSchema>;

