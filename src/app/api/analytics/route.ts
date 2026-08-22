import { NextResponse } from "next/server";
import {
  buildWorkspaceAnalytics,
  parseAnalyticsQuery,
  type AnalyticsCall,
} from "@/lib/analytics";
import { getRequestUser } from "@/lib/supabase/request-user";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseAnalyticsQuery(new URL(request.url));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const [{ data: calls, error: callsError }, { data: agents, error: agentsError }] =
      await Promise.all([
        supabase
          .from("calls")
          .select(
            "*, agents(name), call_scores(overall_score, verdict, audit_mode, compliance_findings, greeting, empathy, professionalism, resolution, communication, language_handling)",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("agents")
          .select("id, name")
          .eq("user_id", user.id)
          .order("name"),
      ]);

    if (callsError) throw new Error(callsError.message);
    if (agentsError) throw new Error(agentsError.message);

    if (!parsed.allAgents && parsed.agentIds.length) {
      const known = new Set((agents || []).map((a) => a.id));
      const missing = parsed.agentIds.filter((id) => !known.has(id));
      if (missing.length) {
        return NextResponse.json({ error: "One or more agents were not found." }, { status: 404 });
      }
    }

    const analytics = buildWorkspaceAnalytics(
      agents || [],
      (calls || []) as AnalyticsCall[],
      parsed,
    );

    return NextResponse.json({
      analytics,
      agents: agents || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
