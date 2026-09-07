"use client";

import { createClient } from "@/lib/supabase/client";
import type { CallStatus } from "@/lib/types";
import { friendlyPrepareError, isFetchFailure } from "@/lib/prepare-error";

export async function waitForCallStatus(
  callId: string,
  done: CallStatus[],
  options?: { timeoutMs?: number; intervalMs?: number },
) {
  const timeoutMs = options?.timeoutMs ?? 6 * 60 * 1000;
  const intervalMs = options?.intervalMs ?? 1000;
  const supabase = createClient();
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const { data, error } = await supabase
        .from("calls")
        .select("status, error_message")
        .eq("id", callId)
        .single();

      if (error) {
        if (isFetchFailure(error.message)) {
          await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
          continue;
        }
      } else {
        if (data?.status === "failed") {
          throw new Error(friendlyPrepareError(data.error_message));
        }

        const status = data?.status as CallStatus | undefined;

        if (
          status === "transcribed" &&
          done.includes("completed") &&
          data?.error_message
        ) {
          throw new Error(friendlyPrepareError(data.error_message));
        }

        if (status && done.includes(status)) {
          return status;
        }
      }
    } catch (error) {
      if (error instanceof Error && !isFetchFailure(error)) {
        throw error;
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error("This is taking longer than expected. Keep this page open and try again.");
}
