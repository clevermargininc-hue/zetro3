"use client";

import { createClient } from "@/lib/supabase/client";
import type { CallStatus } from "@/lib/types";

export async function waitForCallStatus(
  callId: string,
  done: CallStatus[],
  options?: { timeoutMs?: number; intervalMs?: number },
) {
    const timeoutMs = options?.timeoutMs ?? 12 * 60 * 1000;
  const intervalMs = options?.intervalMs ?? 1000;
  const supabase = createClient();
  const started = Date.now();
  let transcribedGraceUsed = false;
  let sawAnalyzing = false;

  while (Date.now() - started < timeoutMs) {
    const { data } = await supabase
      .from("calls")
      .select("status, error_message")
      .eq("id", callId)
      .single();

    if (data?.status === "failed") {
      throw new Error(data.error_message || "Processing failed");
    }

    const status = data?.status as CallStatus | undefined;
    if (status === "analyzing") {
      sawAnalyzing = true;
      transcribedGraceUsed = true;
    } else if (
      status === "transcribed" &&
      done.includes("completed") &&
      !transcribedGraceUsed
    ) {
      transcribedGraceUsed = true;
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
      continue;
    }

    if (
      sawAnalyzing &&
      status === "transcribed" &&
      data?.error_message &&
      done.includes("completed")
    ) {
      throw new Error(data.error_message);
    }

    if (status && done.includes(status)) {
      return status;
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error("This is taking longer than expected. Keep this page open and try again.");
}
