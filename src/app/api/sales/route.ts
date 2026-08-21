import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { fullName, workEmail, companyName, message } = await request.json();

    if (!fullName || !workEmail || !companyName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("sales_requests").insert({
      full_name: fullName,
      work_email: workEmail,
      company_name: companyName,
      message: message || null,
    });

    if (error) {
      console.error("Error inserting sales request:", error);
      return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sales request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
