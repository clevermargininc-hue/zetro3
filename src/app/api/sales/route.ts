import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const { fullName, workEmail, companyName, message } = await request.json();

    if (!fullName || !workEmail || !companyName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const email = String(workEmail).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("sales_requests").insert({
      full_name: String(fullName).trim().slice(0, 200),
      work_email: email.slice(0, 320),
      company_name: String(companyName).trim().slice(0, 200),
      message: message ? String(message).trim().slice(0, 4000) : null,
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
