"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { authFetch } from "@/lib/auth-fetch";

const PING_EVERY_MS = 60_000;

/** Tells the server this user is online, so /admin can count live users. Renders nothing. */
export function PresencePing() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let lastPing = 0;

    function ping() {
      if (document.visibilityState !== "visible") return;
      lastPing = Date.now();
      void authFetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathRef.current }),
      }).catch(() => undefined);
    }

    function onVisible() {
      if (document.visibilityState === "visible" && Date.now() - lastPing > PING_EVERY_MS / 3) ping();
    }

    ping();
    const timer = window.setInterval(ping, PING_EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
