import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { displayCountry } from "@/lib/locale";
import {
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  type DashboardLocale,
} from "@/lib/i18n/dashboard";
import {
  capabilitiesForRole,
  hasCapability,
  normalizeOperationalRole,
  type DashboardCapability,
  type OperationalRole,
} from "@/lib/rbac/roles";
import { reportServerError } from "@/lib/telemetry/error-reporter";

export type WorkspaceSummary = {
  id: string;
  name: string;
  plan: string;
  country: string;
  timezone: string;
  role: OperationalRole;
  qaTargetScore: number | null;
  reviewScoreThreshold: number;
  currency: string;
};

export type UserPreferences = {
  theme: "light" | "dark";
  locale: DashboardLocale;
  timezone: string;
};

export type WorkspaceAuthContext = {
  requestId: string;
  user: User;
  admin: ReturnType<typeof createAdminClient>;
  workspace: WorkspaceSummary;
  workspaces: Array<{ id: string; name: string; plan: string; role: OperationalRole }>;
  teamScope: string[];
  operationalRole: OperationalRole;
  capabilities: DashboardCapability[];
  preferences: UserPreferences;
};

export function apiErrorResponse(
  status: number,
  message: string,
  requestId: string,
  code = "REQUEST_ERROR",
) {
  return NextResponse.json(
    { error: message, code, requestId },
    { status, headers: { "x-request-id": requestId, "Cache-Control": "no-store" } },
  );
}

export function apiSuccessResponse<T>(data: T, requestId: string, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
  });
}

function parseOrgConfiguration(raw: unknown): {
  qaTargetScore: number | null;
  reviewScoreThreshold: number;
  currency: string;
} {
  if (!raw || typeof raw !== "object") {
    return { qaTargetScore: null, reviewScoreThreshold: 75, currency: DEFAULT_CURRENCY };
  }
  const obj = raw as Record<string, unknown>;
  const target =
    typeof obj.qa_target_score === "number" &&
    Number.isFinite(obj.qa_target_score) &&
    obj.qa_target_score > 0 &&
    obj.qa_target_score <= 100
      ? Math.round(obj.qa_target_score)
      : null;
  const threshold =
    typeof obj.review_score_threshold === "number" &&
    Number.isFinite(obj.review_score_threshold) &&
    obj.review_score_threshold >= 10 &&
    obj.review_score_threshold <= 100
      ? Math.round(obj.review_score_threshold)
      : 75;
  const currency =
    typeof obj.currency === "string" && obj.currency.trim()
      ? obj.currency.trim().toUpperCase()
      : DEFAULT_CURRENCY;
  return { qaTargetScore: target, reviewScoreThreshold: threshold, currency };
}

function isMissingColumnErr(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    err.code === "PGRST204" ||
    err.code === "42703" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("column")
  );
}

async function loadProfileAndPreferences(
  admin: ReturnType<typeof createAdminClient>,
  user: User,
  workspaceTimezone: string,
): Promise<{
  fullName: string | null;
  username: string | null;
  profileOperationalRole: string | null;
  preferences: UserPreferences;
}> {
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const metaTheme = meta.theme_preference === "dark" ? "dark" : "light";
  const metaLocale = meta.locale_preference === "sw" ? "sw" : "en";
  const metaTz =
    typeof meta.timezone_preference === "string" && meta.timezone_preference.trim()
      ? meta.timezone_preference.trim()
      : workspaceTimezone;

  const fullAttempt = await admin
    .from("profiles")
    .select(
      "full_name, username, theme_preference, locale_preference, timezone_preference, operational_role",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!fullAttempt.error && fullAttempt.data) {
    const row = fullAttempt.data as Record<string, unknown>;
    return {
      fullName: typeof row.full_name === "string" ? row.full_name : null,
      username: typeof row.username === "string" ? row.username : null,
      profileOperationalRole:
        typeof row.operational_role === "string" ? row.operational_role : null,
      preferences: {
        theme: row.theme_preference === "dark" ? "dark" : metaTheme,
        locale: row.locale_preference === "sw" ? "sw" : metaLocale,
        timezone:
          typeof row.timezone_preference === "string" && row.timezone_preference.trim()
            ? row.timezone_preference.trim()
            : metaTz,
      },
    };
  }

  // Graceful fallback before dashboard-enterprise.sql migration is run
  const baseAttempt = await admin
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const row = (baseAttempt.data || {}) as Record<string, unknown>;
  return {
    fullName: typeof row.full_name === "string" ? row.full_name : null,
    username: typeof row.username === "string" ? row.username : null,
    profileOperationalRole: null,
    preferences: {
      theme: metaTheme,
      locale: metaLocale,
      timezone: metaTz,
    },
  };
}

export type ResolvedWorkspaceResult =
  | { ok: true; ctx: WorkspaceAuthContext & { fullName: string | null; username: string | null } }
  | { ok: false; status: number; code: string; message: string; requestId: string; response: NextResponse };

export async function resolveWorkspaceForUser(
  user: User,
  options?: {
    requestedWorkspaceId?: string | null;
    requiredCapability?: DashboardCapability;
    requestId?: string;
  },
): Promise<ResolvedWorkspaceResult> {
  const requestId = options?.requestId || crypto.randomUUID();
  const fail = (status: number, message: string, code: string): ResolvedWorkspaceResult => ({
    ok: false,
    status,
    code,
    message,
    requestId,
    response: apiErrorResponse(status, message, requestId, code),
  });

  try {
    const admin = createAdminClient();
    const requestedWorkspaceId = options?.requestedWorkspaceId?.trim() || null;

    // Fetch all memberships for user so switcher and tenancy validation use DB ground truth
    let memberAttempt = await admin
      .from("workspace_members")
      .select("workspace_id, role, operational_role, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (memberAttempt.error && isMissingColumnErr(memberAttempt.error)) {
      memberAttempt = (await admin
        .from("workspace_members")
        .select("workspace_id, role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })) as typeof memberAttempt;
    }

    if (memberAttempt.error) {
      return fail(500, memberAttempt.error.message, "DB_ERROR");
    }

    const memberships = (memberAttempt.data || []) as Array<{
      workspace_id: string;
      role: string;
      operational_role?: string | null;
    }>;

    if (memberships.length === 0) {
      return fail(403, "You do not belong to any active Zetro workspace.", "NO_WORKSPACE");
    }

    const activeMembership = requestedWorkspaceId
      ? memberships.find((m) => m.workspace_id === requestedWorkspaceId) || null
      : memberships[0];

    if (!activeMembership) {
      return fail(403, "Permission denied for the requested workspace.", "FORBIDDEN");
    }

    const wsIds = memberships.map((m) => m.workspace_id);
    let wsQuery = await admin
      .from("workspaces")
      .select("id, name, plan, country, timezone, configuration")
      .in("id", wsIds);

    if (wsQuery.error && isMissingColumnErr(wsQuery.error)) {
      wsQuery = (await admin
        .from("workspaces")
        .select("id, name, plan, country")
        .in("id", wsIds)) as typeof wsQuery;
    }

    if (wsQuery.error) {
      return fail(500, wsQuery.error.message, "DB_ERROR");
    }

    const wsMap = new Map<string, Record<string, unknown>>(
      (wsQuery.data || []).map((row) => [String(row.id), row as Record<string, unknown>]),
    );

    const activeWsRow = wsMap.get(activeMembership.workspace_id);
    if (!activeWsRow) {
      return fail(404, "Workspace record not found.", "NOT_FOUND");
    }

    const wsTimezone =
      typeof activeWsRow.timezone === "string" && activeWsRow.timezone.trim()
        ? activeWsRow.timezone.trim()
        : DEFAULT_TIMEZONE;

    const { fullName, username, profileOperationalRole, preferences } =
      await loadProfileAndPreferences(admin, user, wsTimezone);

    const operationalRole = normalizeOperationalRole(
      activeMembership.role,
      activeMembership.operational_role || profileOperationalRole,
    );
    const capabilities = capabilitiesForRole(operationalRole);

    if (
      options?.requiredCapability &&
      !hasCapability(capabilities, options.requiredCapability)
    ) {
      return fail(403, "Your role does not permit this action.", "FORBIDDEN");
    }

    const { data: teamRows } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", activeMembership.workspace_id);

    const teamScope =
      teamRows && teamRows.length > 0
        ? teamRows.map((r) => String(r.user_id))
        : [user.id];

    const orgConfig = parseOrgConfiguration(activeWsRow.configuration);

    const workspaces = memberships
      .map((m) => {
        const ws = wsMap.get(m.workspace_id);
        if (!ws) return null;
        return {
          id: String(ws.id),
          name: String(ws.name || "Workspace"),
          plan: String(ws.plan || "team"),
          role: normalizeOperationalRole(m.role, m.operational_role),
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return {
      ok: true,
      ctx: {
        requestId,
        user,
        admin,
        fullName,
        username,
        workspace: {
          id: String(activeWsRow.id),
          name: String(activeWsRow.name || "Zetro Workspace"),
          plan: String(activeWsRow.plan || "team"),
          country: displayCountry(
            typeof activeWsRow.country === "string" ? activeWsRow.country : null,
          ),
          timezone: preferences.timezone || wsTimezone,
          role: operationalRole,
          qaTargetScore: orgConfig.qaTargetScore,
          reviewScoreThreshold: orgConfig.reviewScoreThreshold,
          currency: orgConfig.currency,
        },
        workspaces,
        teamScope,
        operationalRole,
        capabilities,
        preferences,
      },
    };
  } catch (error) {
    reportServerError(error, { area: "resolveWorkspaceForUser", requestId });
    const message = error instanceof Error ? error.message : "Authentication failed.";
    return fail(500, message, "AUTH_INTERNAL_ERROR");
  }
}

export async function resolveWorkspaceAuth(
  request: Request,
  options?: { requiredCapability?: DashboardCapability },
): Promise<
  | { ok: true; ctx: WorkspaceAuthContext & { fullName: string | null; username: string | null } }
  | { ok: false; response: NextResponse }
> {
  const requestId = crypto.randomUUID();
  try {
    const { user } = await getRequestUser(request);
    if (!user) {
      return {
        ok: false,
        response: apiErrorResponse(401, "Session expired or unauthorized.", requestId, "UNAUTHORIZED"),
      };
    }

    const url = new URL(request.url);
    const requestedWorkspaceId =
      request.headers.get("x-workspace-id")?.trim() ||
      url.searchParams.get("workspaceId")?.trim() ||
      null;

    const result = await resolveWorkspaceForUser(user, {
      requestedWorkspaceId,
      requiredCapability: options?.requiredCapability,
      requestId,
    });
    if (!result.ok) {
      return { ok: false, response: result.response };
    }
    return { ok: true, ctx: result.ctx };
  } catch (error) {
    reportServerError(error, { area: "resolveWorkspaceAuth", requestId });
    const message = error instanceof Error ? error.message : "Authentication failed.";
    return {
      ok: false,
      response: apiErrorResponse(500, message, requestId, "AUTH_INTERNAL_ERROR"),
    };
  }
}
