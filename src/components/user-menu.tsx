"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearWorkspaceCookie } from "@/lib/workspace-cookie";

export function UserMenu({
  email,
  username,
  displayName,
  workspaceName,
  plan,
}: {
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  workspaceName?: string | null;
  plan?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const personLabel = username
    ? `@${username}`
    : displayName || (email || "").split("@")[0] || "Member";
  const personInitial = (displayName || username || email || "M").charAt(0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearWorkspaceCookie();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-lg bg-white border border-line/50 hover:border-blue/30 px-3 py-2 transition-colors focus:outline-none"
      >
        <div className="h-8 w-8 rounded-full bg-blue/10 flex items-center justify-center text-blue font-bold text-xs uppercase shrink-0">
          {personInitial}
        </div>
        <div className="flex flex-col text-left">
          <p className="text-[13px] font-bold text-ink leading-tight">
            {personLabel}
          </p>
          <p className="text-[11px] text-muted leading-tight mt-0.5">
            {workspaceName ? `${plan === "solo" ? "Solo" : "Team"} · ` : ""}
            {workspaceName || "Zetro"}
          </p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] min-w-[200px] bg-white border border-line/50 shadow-lg rounded-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-line/40 bg-surface-2/30">
            <p className="text-[12px] text-muted truncate">Signed in as</p>
            <p className="text-[13px] font-medium text-ink truncate mt-0.5">{email}</p>
          </div>
          <div className="p-1.5">
            <button
              onClick={signOut}
              className="w-full text-left px-3 py-2 text-[13px] font-medium text-rose hover:bg-rose/10 rounded-lg transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
