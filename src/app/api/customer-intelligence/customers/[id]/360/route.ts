import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { getCustomer360Profile } from "@/lib/customer-360-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id) {
    return NextResponse.json({ error: "Missing customer ID" }, { status: 400 });
  }

  try {
    const profile = await getCustomer360Profile(user.id, id);
    if (!profile) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load Customer 360 profile",
      },
      { status: 500 },
    );
  }
}

