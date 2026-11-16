import { ISSUE_STATUSES, ISSUE_CATEGORIES, ROOT_CAUSE_CATEGORIES, RESOLUTION_CONFIRMATIONS } from "@/lib/ai/prompts/customer-journey";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import {
  getIssueInvestigationDetail,
  submitHumanIssueReview,
} from "@/lib/customer-journey-service";
import type {
  IssueCategory,
  IssueLifecycleStatus,
  ResolutionConfirmation,
  RootCauseCategory,
} from "@/lib/ai/prompts/customer-journey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ issueId: string }> },
) {
  try {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { issueId } = await context.params;
  const detail = await getIssueInvestigationDetail(user.id, issueId);

  if (!detail.issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer intelligence request failed" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ issueId: string }> },
) {
  try {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { issueId } = await context.params;
  const rawBody: unknown = await request.json().catch(() => null);
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json({ error: "A valid JSON object is required" }, { status: 400 });
  }
  const values = rawBody as Record<string, unknown>;
  if (["callId","reviewType","newStatus","resolutionConfirmation","newCategory","newSubcategory","newRootCause","newRootCauseDetail","responsibleTeam","notes"].some(key => values[key] != null && typeof values[key] !== "string") || [].some(key => values[key] !== undefined && typeof values[key] !== "boolean")) {
    return NextResponse.json({ error: "Invalid request field type" }, { status: 400 });
  }
  const body = rawBody as {
    callId?: string | null;
    reviewType?:
      | "confirm_match"
      | "reject_match"
      | "reassign_customer"
      | "update_category"
      | "confirm_root_cause"
      | "reject_root_cause"
      | "update_status"
      | "confirm_resolution"
      | "assign_team"
      | "investigation_note";
    newStatus?: IssueLifecycleStatus;
    resolutionConfirmation?: ResolutionConfirmation;
    newCategory?: IssueCategory;
    newSubcategory?: string;
    newRootCause?: RootCauseCategory;
    newRootCauseDetail?: string;
    responsibleTeam?: string;
    notes?: string;
  };

  if (!body.reviewType) {
    return NextResponse.json({ error: "reviewType is required" }, { status: 400 });
  }

  const reviewTypes = ["confirm_match", "reject_match", "update_category", "confirm_root_cause", "reject_root_cause", "update_status", "confirm_resolution", "assign_team", "investigation_note"];
  if (!reviewTypes.includes(body.reviewType)) return NextResponse.json({ error: "Unsupported review type" }, { status: 400 });
  if ((body.newStatus !== undefined && !ISSUE_STATUSES.includes(body.newStatus)) ||
      (body.newCategory !== undefined && !ISSUE_CATEGORIES.includes(body.newCategory)) ||
      (body.newRootCause !== undefined && !ROOT_CAUSE_CATEGORIES.includes(body.newRootCause)) ||
      (body.resolutionConfirmation !== undefined && !RESOLUTION_CONFIRMATIONS.includes(body.resolutionConfirmation))) {
    return NextResponse.json({ error: "Invalid review value" }, { status: 400 });
  }
  if ((body.reviewType === "update_status" && !body.newStatus) ||
      (body.reviewType === "update_category" && !body.newCategory) ||
      (body.reviewType === "confirm_root_cause" && !body.newRootCause) ||
      (body.reviewType === "assign_team" && !body.responsibleTeam?.trim()) ||
      (body.reviewType === "investigation_note" && !body.notes?.trim()) ||
      ((body.reviewType === "confirm_match" || body.reviewType === "reject_match") && !body.callId)) {
    return NextResponse.json({ error: "The selected review action is missing its required value" }, { status: 400 });
  }

  const reviewerName =
    user.user_metadata?.full_name ||
    user.user_metadata?.username ||
    user.email ||
    "Reviewer";

  const res = await submitHumanIssueReview({
    reviewerId: user.id,
    reviewerName: String(reviewerName),
    issueId,
    callId: body.callId,
    reviewType: body.reviewType,
    newStatus: body.newStatus,
    resolutionConfirmation: body.resolutionConfirmation,
    newCategory: body.newCategory,
    newSubcategory: body.newSubcategory,
    newRootCause: body.newRootCause,
    newRootCauseDetail: body.newRootCauseDetail,
    responsibleTeam: body.responsibleTeam,
    notes: body.notes,
  });

  if (!res.ok) {
    return NextResponse.json({ error: res.error || "Review failed" }, { status: 400 });
  }

  const updated = await getIssueInvestigationDetail(user.id, issueId);
  return NextResponse.json({ ok: true, detail: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer intelligence request failed" }, { status: 500 });
  }
}
