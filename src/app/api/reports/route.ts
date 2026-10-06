import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { loadQaReport } from "@/lib/load-qa-report";
import { parseReportQuery } from "@/lib/reports";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { period, date, agentId } = parseReportQuery(new URL(request.url));
  if (!period) {
    return NextResponse.json(
      { error: "Period must be all, daily, weekly, monthly, or annually." },
      { status: 400 },
    );
  }

  try {
    const report = await loadQaReport(supabase, user.id, period, date, agentId);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build report";
    const status = message === "Agent not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
