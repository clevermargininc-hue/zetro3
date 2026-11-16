export type OperationalRole =
  | "admin"
  | "qa_manager"
  | "team_lead"
  | "compliance_officer"
  | "executive"
  | "member";

export type DashboardCapability =
  | "overview:view"
  | "calls:view"
  | "calls:upload"
  | "calls:review"
  | "calls:bulk_action"
  | "agents:view"
  | "teams:view"
  | "scorecards:view"
  | "scorecards:manage"
  | "compliance:view"
  | "coaching:view"
  | "coaching:assign"
  | "reports:view"
  | "integrations:view"
  | "integrations:manage"
  | "settings:view"
  | "settings:org_manage";

const ALL_CAPABILITIES: DashboardCapability[] = [
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
];

const ROLE_CAPABILITIES: Record<OperationalRole, readonly DashboardCapability[]> = {
  admin: ALL_CAPABILITIES,
  qa_manager: [
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
    "settings:view",
  ],
  team_lead: [
    "overview:view",
    "calls:view",
    "calls:upload",
    "calls:review",
    "calls:bulk_action",
    "agents:view",
    "teams:view",
    "scorecards:view",
    "compliance:view",
    "coaching:view",
    "coaching:assign",
    "reports:view",
    "settings:view",
  ],
  compliance_officer: [
    "overview:view",
    "calls:view",
    "calls:review",
    "calls:bulk_action",
    "agents:view",
    "scorecards:view",
    "scorecards:manage",
    "compliance:view",
    "reports:view",
    "settings:view",
  ],
  executive: [
    "overview:view",
    "calls:view",
    "agents:view",
    "teams:view",
    "compliance:view",
    "reports:view",
    "settings:view",
  ],
  member: [
    "overview:view",
    "calls:view",
    "calls:upload",
    "calls:review",
    "agents:view",
    "teams:view",
    "scorecards:view",
    "compliance:view",
    "coaching:view",
    "coaching:assign",
    "reports:view",
    "settings:view",
  ],
};

export function normalizeOperationalRole(
  workspaceRole: string | null | undefined,
  operationalRole?: string | null,
): OperationalRole {
  const candidate = (operationalRole || "").trim().toLowerCase();
  if (
    candidate === "admin" ||
    candidate === "qa_manager" ||
    candidate === "team_lead" ||
    candidate === "compliance_officer" ||
    candidate === "executive" ||
    candidate === "member"
  ) {
    // Workspace admin always retains administrative privileges.
    if (workspaceRole === "admin" && candidate === "member") return "admin";
    return candidate;
  }
  return workspaceRole === "admin" ? "admin" : "member";
}

export function capabilitiesForRole(role: OperationalRole): DashboardCapability[] {
  return [...ROLE_CAPABILITIES[role]];
}

export function hasCapability(
  capabilities: readonly DashboardCapability[],
  required: DashboardCapability,
): boolean {
  return capabilities.includes(required);
}

