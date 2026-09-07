import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Legacy alias — scoring is never started here. Use POST /transcribe. */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint was removed. Prepare the call with POST /api/calls/:id/transcribe." },
    { status: 410 },
  );
}
