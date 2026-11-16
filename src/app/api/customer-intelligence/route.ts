import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import {
  analyzeCallCustomerJourney,
  backfillWorkspaceCustomerJourneys,
  getCustomerIntelligenceOverview,
  type CustomerIntelligenceFilters,
} from "@/lib/customer-journey-service";
import { getTeamScope } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters: CustomerIntelligenceFilters = {
    search: url.searchParams.get("search") || undefined,
    category: url.searchParams.get("category") || undefined,
    status: url.searchParams.get("status") || undefined,
    rootCause: url.searchParams.get("rootCause") || undefined,
    agent: url.searchParams.get("agent") || undefined,
    product: url.searchParams.get("product") || undefined,
    service: url.searchParams.get("service") || undefined,
    serviceArea: url.searchParams.get("serviceArea") || undefined,
    department: url.searchParams.get("department") || undefined,
    serviceProvider: url.searchParams.get("serviceProvider") || undefined,
    location: url.searchParams.get("location") || undefined,
    riskLevel: url.searchParams.get("riskLevel") || undefined,
    dateFrom: url.searchParams.get("dateFrom") || undefined,
    dateTo: url.searchParams.get("dateTo") || undefined,
    needsReviewOnly: url.searchParams.get("needsReviewOnly") === "true",
    unresolvedOnly: url.searchParams.get("unresolvedOnly") === "true",
    repeatCountMin: Math.max(0, Number.parseInt(url.searchParams.get("repeatCountMin") || "0", 10) || 0),
    page: Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1),
    pageSize: Math.min(
      100,
      Math.max(5, Number.parseInt(url.searchParams.get("pageSize") || "25", 10) || 25),
    ),
  };

  try {
    const overview = await getCustomerIntelligenceOverview(user.id, filters);
    return NextResponse.json(overview);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not load customer intelligence overview",
      },
      { status: 500 },
    );
  }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer intelligence request failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody: unknown = await request.json().catch(() => null);
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json({ error: "A valid JSON object is required" }, { status: 400 });
  }
  const values = rawBody as Record<string, unknown>;
  if (["action","callId"].some(key => values[key] != null && typeof values[key] !== "string") || ["force","classifyUnmapped"].some(key => values[key] !== undefined && typeof values[key] !== "boolean")) {
    return NextResponse.json({ error: "Invalid request field type" }, { status: 400 });
  }
  const body = rawBody as {
    action?: "backfill" | "analyze_call";
    callId?: string;
    force?: boolean;
    classifyUnmapped?: boolean;
  };

  if (body.action && body.action !== "backfill" && body.action !== "analyze_call") return NextResponse.json({ error: "Unknown analysis action" }, { status: 400 });
  if (body.action === "analyze_call" && (typeof body.callId !== "string" || !body.callId.trim())) return NextResponse.json({ error: "callId is required" }, { status: 400 });
  if (body.action === "analyze_call" && body.callId) {
    const teamScope = await getTeamScope(user.id);
    const { data: call } = await supabase
      .from("calls")
      .select("id, user_id")
      .eq("id", body.callId)
      .maybeSingle();

    if (!call || !teamScope.includes(call.user_id)) {
      return NextResponse.json({ error: "Call not found in workspace" }, { status: 404 });
    }

    const res = await analyzeCallCustomerJourney(body.callId, {
      force: Boolean(body.force),
    });
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  }

  const backfill = await backfillWorkspaceCustomerJourneys(user.id, {
    force: Boolean(body.force),
    classifyUnmapped: Boolean(body.classifyUnmapped),
  });
  return NextResponse.json(backfill, { status: backfill.ok ? 200 : backfill.migrationRequired ? 409 : 500 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer intelligence request failed" }, { status: 500 });
  }
}
