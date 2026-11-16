import { z } from "zod";

export const OperationalRoleSchema = z.enum([
  "admin",
  "qa_manager",
  "team_lead",
  "compliance_officer",
  "executive",
  "member",
]);

export const DashboardCapabilitySchema = z.enum([
  "overview:view",
  "calls:view",
  "calls:upload",
  "calls:review",
  "calls:bulk_action",
  "agents:view",
  "teams:view",
  "scorecards:view",
  "scorecards:manage",
  "compliance:view",
  "coaching:view",
  "coaching:assign",
  "reports:view",
  "integrations:view",
  "integrations:manage",
  "settings:view",
  "settings:org_manage",
]);

export const UserPreferencesSchema = z.object({
  theme: z.enum(["light", "dark"]),
  locale: z.enum(["en", "sw"]),
  timezone: z.string(),
});

export const WorkspaceSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  plan: z.string(),
  country: z.string(),
  timezone: z.string(),
  role: OperationalRoleSchema,
  qaTargetScore: z.number().nullable(),
  reviewScoreThreshold: z.number(),
  currency: z.string(),
});

export const SessionResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string(),
    fullName: z.string(),
    username: z.string().nullable(),
    role: OperationalRoleSchema,
    capabilities: z.array(DashboardCapabilitySchema),
  }),
  workspace: WorkspaceSummarySchema,
  workspaces: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      plan: z.string(),
      role: OperationalRoleSchema,
    }),
  ),
  preferences: UserPreferencesSchema,
});

export const PreferencesUpdateResponseSchema = z.object({
  preferences: UserPreferencesSchema,
  workspace: WorkspaceSummarySchema,
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type PreferencesUpdateResponse = z.infer<typeof PreferencesUpdateResponseSchema>;

