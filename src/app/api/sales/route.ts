import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bandLabel, formatTzs, formatUsdFromTzs, isBillingCycle, quotePrice } from "@/lib/billing";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { notifyTeam } from "@/lib/team-notify";

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
    const { fullName, workEmail, companyName, message, callsPerMonth, talkMinutes, billing } = body;

    if (!fullName || !workEmail || !companyName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const email = String(workEmail).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
    }

    const calls = Number(callsPerMonth);
    const minutes = Number(talkMinutes);
    const cycle = isBillingCycle(billing) ? billing : "monthly";
    const hasVolume = Number.isFinite(calls) && calls > 0;

    const quote = hasVolume
      ? quotePrice({
          callsPerMonth: calls,
          talkMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 4,
          cycle,
        })
      : null;

    const notes = [
      message ? String(message).trim().slice(0, 3000) : "",
      quote
        ? [
            `Volume: ${quote.callsPerMonth.toLocaleString("en-US")} scored calls/month · ${quote.talkMinutes} min talk time`,
            `Band: ${bandLabel(quote.band)} · Level: ${quote.tier.label} · ${formatTzs(quote.pricePerCallTzs)}/call`,
            `Billing: ${cycle} · Estimate: ${formatTzs(quote.monthlyTzs)}/month (${formatUsdFromTzs(quote.monthlyTzs)}) excl. VAT`,
            `Setup: ${quote.setupTzs ? formatTzs(quote.setupTzs) : "waived"} · First year: ${formatTzs(quote.firstYearTzs)}`,
            quote.overLength ? "Calls over 15 min — quote separately." : "",
            quote.largeVolume ? "Over 100,000 calls — custom rate." : "",
          ]
            .filter(Boolean)
            .join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);

    const supabase = createAdminClient();
    const name = String(fullName).trim().slice(0, 200);
    const company = String(companyName).trim().slice(0, 200);

    const { error } = await supabase.from("sales_requests").insert({
      full_name: name,
      work_email: email.slice(0, 320),
      company_name: company,
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

    after(() =>
      notifyTeam(`Sales request — ${company}`, [`Name: ${name}`, `Email: ${email}`, `Company: ${company}`, "", notes]),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sales request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
