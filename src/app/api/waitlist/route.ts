import { NextResponse, after } from "next/server";
import { countryNameFor } from "@/lib/countries";
import { countryFromHeaders, isAllowedCountry, normalizeCountryCode } from "@/lib/geo";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyTeam } from "@/lib/team-notify";

export async function POST(request: Request) {
  try {
    const limited = rateLimit(`waitlist:${clientKey(request)}`, 5, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const code = normalizeCountryCode(typeof body.country === "string" ? body.country : null);
    const fullName = String(body.fullName ?? "").trim().slice(0, 200);
    const email = String(body.workEmail ?? "").trim().toLowerCase().slice(0, 320);
    const company = String(body.companyName ?? "").trim().slice(0, 200);
    const message = String(body.message ?? "").trim().slice(0, 3000);

    if (!code) {
      return NextResponse.json({ error: "Choose where you are from." }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
    }

    const countryName = countryNameFor(code) || code;
    const detected = countryFromHeaders(request.headers);
    const kind = isAllowedCountry(code) ? "Access help" : "Country waitlist";
    const notes = [
      `${kind}: ${countryName} (${code})`,
      `Network country: ${detected ? `${countryNameFor(detected) || detected} (${detected})` : "unknown"}`,
      message,
    ]
      .filter(Boolean)
      .join("\n\n");

    const supabase = createAdminClient();
    const { error } = await supabase.from("sales_requests").insert({
      full_name: fullName,
      work_email: email,
      company_name: company || "(not given)",
      message: notes,
    });

    if (error) {
      console.error("Error inserting waitlist request:", error);
      return NextResponse.json(
        {
          error: /relation .*sales_requests.* does not exist/i.test(error.message)
            ? "Sign-ups are not set up yet. Run supabase/sales-requests.sql, then try again."
            : "Could not send your details. Try again.",
        },
        { status: 500 },
      );
    }

    after(() =>
      notifyTeam(`${kind} — ${countryName}`, [
        `Name: ${fullName}`,
        `Email: ${email}`,
        `Company: ${company || "(not given)"}`,
        "",
        notes,
      ]),
    );

    return NextResponse.json({ success: true, country: countryName });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
