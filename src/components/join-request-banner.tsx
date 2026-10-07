"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

export function JoinRequestBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await authFetch("/api/team");
        if (!response.ok) return;
        const data = (await response.json()) as { requests?: unknown[] };
        if (!cancelled) setCount(data.requests?.length || 0);
      } catch {
        // Ignore network blips; the Team page is the source of truth.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (count < 1) return null;

  return (
    <p className="surface px-4 py-3 text-sm text-ink">
      {count === 1 ? "1 person wants to join this workspace." : `${count} people want to join this workspace.`}{" "}
      <Link href="/settings/team" className="font-semibold text-[#04B6DA] hover:text-[#039EBE] underline">
        Review requests
      </Link>
    </p>
  );
}
