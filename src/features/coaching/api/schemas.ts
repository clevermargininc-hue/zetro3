import { z } from "zod";

export const CoachingTaskSchema = z.object({
  id: z.string(),
  callId: z.string().nullable(),
  agentId: z.string().nullable(),
  title: z.string(),
  notes: z.string(),
  criterion: z.string().nullable(),
  priority: z.string(),
  status: z.string(),
  dueAt: z.string().nullable(),
  createdAt: z.string(),
});

export const CoachingTasksListResponseSchema = z.object({
  tasks: z.array(CoachingTaskSchema),
});

export const CreateCoachingTaskResponseSchema = z.object({
  task: CoachingTaskSchema,
});

export type CoachingTask = z.infer<typeof CoachingTaskSchema>;

