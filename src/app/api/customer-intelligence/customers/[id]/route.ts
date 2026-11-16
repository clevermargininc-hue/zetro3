import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import {
  getCustomerJourneyDetail,
  updateCustomerIdentityReview,
} from "@/lib/customer-journey-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const detail = await getCustomerJourneyDetail(user.id, id);

  if (!detail.customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer intelligence request failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const rawBody: unknown = await request.json().catch(() => null);
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json({ error: "A valid JSON object is required" }, { status: 400 });
  }
  const values = rawBody as Record<string, unknown>;
  if (["phoneInput","externalCustomerId","displayLabel","notes"].some(key => values[key] != null && typeof values[key] !== "string") || ["verifyIdentity"].some(key => values[key] !== undefined && typeof values[key] !== "boolean")) {
    return NextResponse.json({ error: "Invalid request field type" }, { status: 400 });
  }
  const body = rawBody as {
    phoneInput?: string | null;
    externalCustomerId?: string | null;
    displayLabel?: string | null;
    verifyIdentity?: boolean;
    notes?: string;
  };

  const reviewerName =
    user.user_metadata?.full_name ||
    user.user_metadata?.username ||
    user.email ||
    "Reviewer";

  const res = await updateCustomerIdentityReview({
    reviewerId: user.id,
    reviewerName: String(reviewerName),
    customerId: id,
    phoneInput: body.phoneInput,
    externalCustomerId: body.externalCustomerId,
    displayLabel: body.displayLabel,
    verifyIdentity: body.verifyIdentity,
    notes: body.notes,
  });

  if (!res.ok) {
    return NextResponse.json({ error: res.error || "Update failed" }, { status: 400 });
  }

  const detail = await getCustomerJourneyDetail(user.id, id);
  return NextResponse.json({ ok: true, detail });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer intelligence request failed" }, { status: 500 });
  }
}
