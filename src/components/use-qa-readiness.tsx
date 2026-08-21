"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { readinessErrorMessage } from "@/lib/qa-kinds";
import type { QaReadiness } from "@/lib/qa-kinds";

export function useQaReadiness() {
  const [readiness, setReadiness] = useState<QaReadiness | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/documents")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Could not load standards");
        if (!cancelled) setReadiness(body as QaReadiness);
      })
      .catch(() => {
        if (!cancelled) {
          setReadiness({
            ready: false,
            missing: ["document", "scorecard", "compliance"],
            counts: { document: 0, scorecard: 0, compliance: 0 },
            documents: [],
            setupRequired: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const blockedMessage = readiness
    ? readinessErrorMessage(readiness.missing, readiness.setupRequired)
    : "";

  return { readiness, blocked: Boolean(readiness && !readiness.ready), blockedMessage };
}
