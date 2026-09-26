import { NextResponse } from "next/server";
import { isBillingPlan } from "@/lib/billing";
import { BILLING_COLUMNS, billingFromRow, isMissingBillingSetup, type BillingRow } from "@/lib/plans";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/request-user";

export const runtime = "nodejs";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function optionalCount(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 10_000_000) {
    throw new Error(`${label} must be a whole number of 0 or more.`);
  }
  return number;
}

function optionalDate(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be a date.`);
  }
  return value;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user } = await getRequestUser(request);
  if (!user || !isPlatformAdmin(user.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (!isBillingPlan(body.plan)) {
    return NextResponse.json({ error: "Choose a plan." }, { status: 400 });
  }

  let row: Omit<BillingRow, "updated_at"> & { updated_at: string };
  try {
    const trialCalls = optionalCount(body.trialCalls, "Trial calls") ?? 50;
    const contractStart = optionalDate(body.contractStart, "Contract start");
    const contractEnd = optionalDate(body.contractEnd, "Contract end");
    if (contractStart && contractEnd && contractEnd < contractStart) {
      throw new Error("Contract end must be after the start.");
    }
    row = {
      workspace_id: id,
      plan: body.plan,
      trial_calls: trialCalls,
      committed_calls: optionalCount(body.committedCalls, "Committed calls"),
      contract_start: contractStart,
      contract_end: contractEnd,
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) || null : null,
      updated_by: user.email ?? null,
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid input." }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: workspace } = await db.from("workspaces").select("id").eq("id", id).maybeSingle();
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const { data, error } = await db
    .from("workspace_billing")
    .upsert(row, { onConflict: "workspace_id" })
    .select(BILLING_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: isMissingBillingSetup(error)
          ? "Plans are not set up yet. Run supabase/billing.sql in the Supabase SQL Editor."
          : error.message,
      },
      { status: isMissingBillingSetup(error) ? 503 : 500 },
    );
  }

  return NextResponse.json({ billing: billingFromRow(data as BillingRow) });
}
