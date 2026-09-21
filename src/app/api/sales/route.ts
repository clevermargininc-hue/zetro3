import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMinutes, formatUsd, quoteCallVolume } from "@/lib/billing";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limited = rateLimit(`sales:${clientKey(request)}`, 5, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
      );
    }

    const body = await request.json();
    const { fullName, workEmail, companyName, message, callsPerDay, ahtMinutes, agents } = body;

    if (!fullName || !workEmail || !companyName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const email = String(workEmail).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
    }

    const calls = Number(callsPerDay);
    const aht = Number(ahtMinutes);
    const agentCount = Number(agents);
    const hasVolume = Number.isFinite(calls) && calls > 0;

    const quote = hasVolume
      ? quoteCallVolume({
          callsPerDay: calls,
          ahtMinutes: Number.isFinite(aht) && aht > 0 ? aht : 4,
          agents: Number.isFinite(agentCount) && agentCount > 0 ? agentCount : 8,
        })
      : null;

    const notes = [
      message ? String(message).trim().slice(0, 4000) : "",
      quote
        ? [
            `Volume: ${quote.callsPerDay} calls/day · ${quote.ahtMinutes} min AHT · ${quote.agents} live agents`,
            `Coaching pack: ${quote.coachingCallsPerAgentPerDay} scored calls/agent/day · ${Math.round(quote.scoredCallsPerDay)} scored calls/day`,
            `Audited minutes: ${formatMinutes(quote.auditedMinutes)} · Rate: ${formatUsd(quote.ratePerMinuteUsd)}/min`,
            `List estimate: ${formatUsd(quote.monthlyUsd)} / mo`,
          ].join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);

    const supabase = createAdminClient();

    const { error } = await supabase.from("sales_requests").insert({
      full_name: String(fullName).trim().slice(0, 200),
      work_email: email.slice(0, 320),
      company_name: String(companyName).trim().slice(0, 200),
      message: notes || null,
    });

    if (error) {
      console.error("Error inserting sales request:", error);
      return NextResponse.json(
        {
          error:
            /relation .*sales_requests.* does not exist/i.test(error.message)
              ? "Sales intake is not set up yet. Run supabase/sales-requests.sql, then try again."
              : "Failed to submit request",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sales request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
