import { SALES_EMAIL } from "@/lib/contact";
import {
  TRIAL_CALLS,
  emptyBandCounts,
  isBillingPlan,
  type BandCounts,
  type BillingPlan,
  type LengthBand,
} from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMembership } from "@/lib/workspaces";

export type WorkspaceBilling = {
  workspaceId: string;
  plan: BillingPlan;
  trialCalls: number;
  committedCalls: number | null;
  contractStart: string | null;
  contractEnd: string | null;
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type PlanStatus = WorkspaceBilling & {
  scoredCalls: number;
  trialRemaining: number | null;
  canScore: boolean;
  /** supabase/billing.sql has not been run yet — nothing is enforced. */
  setupMissing: boolean;
};

export type BillingRow = {
  workspace_id: string;
  plan: string;
  trial_calls: number | null;
  committed_calls: number | null;
  contract_start: string | null;
  contract_end: string | null;
  notes: string | null;
  updated_by: string | null;
  updated_at: string | null;
};

export const BILLING_COLUMNS =
  "workspace_id, plan, trial_calls, committed_calls, contract_start, contract_end, notes, updated_by, updated_at";

export function isMissingBillingSetup(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const message = (error.message || "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "42883" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    /workspace_billing|score_events|workspace_scored_calls|workspace_usage|workspace_band_usage/.test(message)
  );
}

export function defaultBilling(workspaceId: string): WorkspaceBilling {
  return {
    workspaceId,
    plan: "trial",
    trialCalls: TRIAL_CALLS,
    committedCalls: null,
    contractStart: null,
    contractEnd: null,
    notes: null,
    updatedBy: null,
    updatedAt: null,
  };
}

export function billingFromRow(row: BillingRow): WorkspaceBilling {
  return {
    workspaceId: row.workspace_id,
    plan: isBillingPlan(row.plan) ? row.plan : "trial",
    trialCalls: row.trial_calls ?? TRIAL_CALLS,
    committedCalls: row.committed_calls,
    contractStart: row.contract_start,
    contractEnd: row.contract_end,
    notes: row.notes,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export async function getWorkspaceBilling(workspaceId: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("workspace_billing")
    .select(BILLING_COLUMNS)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) {
    if (isMissingBillingSetup(error)) return { billing: defaultBilling(workspaceId), setupMissing: true };
    throw new Error(error.message);
  }
  return {
    billing: data ? billingFromRow(data as BillingRow) : defaultBilling(workspaceId),
    setupMissing: false,
  };
}

export async function getPlanStatus(workspaceId: string): Promise<PlanStatus> {
  const { billing, setupMissing } = await getWorkspaceBilling(workspaceId);
  let scoredCalls = 0;
  let missing = setupMissing;
  if (!missing) {
    const { data, error } = await createAdminClient().rpc("workspace_scored_calls", { target: workspaceId });
    if (error) {
      if (!isMissingBillingSetup(error)) throw new Error(error.message);
      missing = true;
    } else {
      scoredCalls = Number(data) || 0;
    }
  }
  const trialRemaining = billing.plan === "trial" ? Math.max(0, billing.trialCalls - scoredCalls) : null;
  const canScore =
    missing || billing.plan === "monthly" || billing.plan === "annual" || (trialRemaining ?? 0) > 0;
  return { ...billing, scoredCalls, trialRemaining, canScore, setupMissing: missing };
}

export function planBlockMessage(status: Pick<PlanStatus, "plan" | "trialCalls">) {
  if (status.plan === "paused") {
    return `Scoring is paused on this workspace. Email ${SALES_EMAIL} to restart your plan.`;
  }
  return `Your ${status.trialCalls}-call free trial is used. Email ${SALES_EMAIL} to choose a monthly or annual plan.`;
}

export type ScoringCheck =
  | { ok: true; workspaceId: string | null }
  | { ok: false; code: "PLAN_PAUSED" | "TRIAL_USED"; message: string };

/** Re-scores are allowed on trial; new calls stop once the trial allowance is used. */
export async function checkScoringAllowed(userId: string, options: { rescore: boolean }): Promise<ScoringCheck> {
  const membership = await getMembership(userId);
  if (!membership) return { ok: true, workspaceId: null };
  const status = await getPlanStatus(membership.workspaceId);
  if (status.setupMissing) return { ok: true, workspaceId: membership.workspaceId };
  if (status.plan === "paused") {
    return { ok: false, code: "PLAN_PAUSED", message: planBlockMessage(status) };
  }
  if (status.plan === "trial" && !options.rescore && (status.trialRemaining ?? 0) <= 0) {
    return { ok: false, code: "TRIAL_USED", message: planBlockMessage(status) };
  }
  return { ok: true, workspaceId: membership.workspaceId };
}

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

/** First instant of the current month in Tanzania (UTC+3), where invoices are issued. */
export function billingMonthStart(now = new Date()) {
  const local = new Date(now.getTime() + EAT_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - EAT_OFFSET_MS);
}

export function billingMonthLabel(since: Date) {
  return since.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Africa/Dar_es_Salaam" });
}

/** Scores and re-scores this billing month, by length band. Empty until billing.sql is run. */
export async function getMonthBandUsage(workspaceId: string) {
  const since = billingMonthStart();
  const first: BandCounts = emptyBandCounts();
  const rescore: BandCounts = emptyBandCounts();
  const { data, error } = await createAdminClient().rpc("workspace_band_usage", {
    target: workspaceId,
    since: since.toISOString(),
  });
  if (error && !isMissingBillingSetup(error)) throw new Error(error.message);
  for (const row of (data || []) as { kind: string; band: LengthBand; calls: number }[]) {
    const bucket = row.kind === "rescore" ? rescore : first;
    if (row.band in bucket) bucket[row.band] += Number(row.calls) || 0;
  }
  return { since, first, rescore };
}

export async function recordScoreEvent(input: {
  workspaceId: string | null;
  callId: string;
  userId: string;
  kind: "first" | "rescore";
  durationSeconds: number | null;
}) {
  if (!input.workspaceId) return;
  const { error } = await createAdminClient().from("score_events").insert({
    workspace_id: input.workspaceId,
    call_id: input.callId,
    user_id: input.userId,
    kind: input.kind,
    duration_seconds: input.durationSeconds,
  });
  if (error && !isMissingBillingSetup(error)) {
    console.error("Could not record score event:", error.message);
  }
}
