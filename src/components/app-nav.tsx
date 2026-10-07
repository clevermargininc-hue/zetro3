"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { clearWorkspaceCookie } from "@/lib/workspace-cookie";

// Enterprise SVG Icons
const Icons = {
  overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  upload: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  audits: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  ),
  ranking: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  standards: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  ),
  admin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  ),
  logout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

const NAV = [
  {
    label: "Work",
    items: [
      { href: "/dashboard", label: "Overview", icon: Icons.overview },
      { href: "/upload", label: "Score calls", icon: Icons.upload },
      { href: "/calls", label: "Calls", icon: Icons.audits },
    ],
  },
  {
    label: "Quality",
    items: [
      { href: "/leaderboard", label: "Leaderboard", icon: Icons.ranking },
      { href: "/reports", label: "Reports", icon: Icons.reports },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/standards", label: "Scorecard", icon: Icons.standards },
      { href: "/settings", label: "Settings", icon: Icons.settings },
    ],
  },
];

const ADMIN_GROUP = {
  label: "Zetro team",
  items: [{ href: "/admin", label: "Admin dashboard", icon: Icons.admin }],
};

function linkActive(href: string, pathname: string) {
  if (href === "/upload") {
    return pathname === "/upload" || pathname.startsWith("/upload/");
  }
  if (href === "/calls") {
    return pathname === "/calls";
  }
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  email,
  username,
  displayName,
  workspaceName,
  plan,
  isPlatformAdmin = false,
}: {
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  workspaceName?: string | null;
  plan?: string | null;
  isPlatformAdmin?: boolean;
}) {
  const groups = isPlatformAdmin ? [...NAV, ADMIN_GROUP] : NAV;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const personLabel = username
    ? `@${username}`
    : displayName || (email || "").split("@")[0] || "Member";
  const personInitial = (displayName || username || email || "M").charAt(0).toUpperCase();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearWorkspaceCookie();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-[#039EBE] bg-[#061C52] text-white print:hidden lg:sticky lg:top-0 lg:flex lg:h-screen transition-[width] duration-200 relative ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Logo + edge collapse control */}
        <div className={`relative flex h-14 shrink-0 items-center border-b border-[#039EBE] bg-[#061C52] ${collapsed ? "justify-center px-0" : "px-5"}`}>
          <Logo size="sm" collapsed={collapsed} invert />
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-none border border-[#039EBE] bg-[#039EBE] text-white hover:border-[#04B6DA] hover:bg-[#04B6DA] hover:text-white transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={collapsed ? "rotate-180" : ""}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 space-y-6">
          <nav className="space-y-6">
            {groups.map((group) => (
              <div key={group.label} className="space-y-1">
                {!collapsed ? (
                  <span className="px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#E3EBFB] block mb-1.5">
                    {group.label}
                  </span>
                ) : (
                  <div className="flex justify-center mb-2">
                    <div className="h-px w-5 bg-[#039EBE]" />
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = linkActive(item.href, pathname);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center rounded-none text-[13px] font-medium transition-colors ${
                          collapsed
                            ? "justify-center h-9 w-full px-0"
                            : "gap-2.5 px-3 py-2"
                        } ${
                          active
                            ? "bg-[#04B6DA] text-white font-semibold shadow-xs"
                            : "text-white/80 hover:bg-[#039EBE] hover:text-white"
                        }`}
                      >
                        <span className={`shrink-0 ${active ? "text-white" : "text-[#E3EBFB]"}`}>
                          {item.icon}
                        </span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div className="p-3 border-t border-[#039EBE] bg-[#061C52] shrink-0">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2 px-1 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-none bg-[#039EBE] text-white border border-[#039EBE] flex items-center justify-center text-[11px] font-bold shrink-0">
                  {personInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-white truncate leading-tight">{personLabel}</p>
                  <p className="text-[11px] text-[#E3EBFB] truncate leading-tight mt-0.5">
                    {plan === "solo" ? "Solo · " : plan === "team" ? "Team · " : ""}
                    {workspaceName || "Zetro"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                className="text-[#E3EBFB] hover:text-white p-1.5 rounded-none hover:bg-[#039EBE] shrink-0"
              >
                {Icons.logout}
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                className="w-7 h-7 rounded-none bg-[#039EBE] text-white border border-[#039EBE] flex items-center justify-center text-[11px] font-bold"
              >
                {personInitial}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-[#039EBE] bg-[#061C52] px-4 print:hidden lg:hidden text-white">
        <Logo size="sm" invert />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="p-2 text-white hover:text-[#E3EBFB]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </header>

      {/* Mobile Menu Drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#061C52]/60 backdrop-blur-xs transition-opacity" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-72 bg-[#061C52] border-l border-[#039EBE] p-6 shadow-2xl flex flex-col justify-between text-white">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#039EBE]">
                <Logo size="sm" invert />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-[#E3EBFB] hover:text-white"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <nav className="space-y-7">
                {groups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#E3EBFB] block mb-1.5">
                      {group.label}
                    </span>
                    <div className="space-y-1.5">
                      {group.items.map((item) => {
                        const active = linkActive(item.href, pathname);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-none text-[13px] font-medium transition-colors ${
                              active
                                ? "bg-[#04B6DA] text-white font-semibold"
                                : "text-white/80 hover:bg-[#039EBE] hover:text-white"
                            }`}
                          >
                            <span className={active ? "text-white" : "text-[#E3EBFB]"}>
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            {/* Mobile User Bottom */}
            <div className="pt-4 border-t border-[#039EBE] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-none bg-[#039EBE] text-white border border-[#039EBE] flex items-center justify-center text-[11px] font-bold shrink-0">
                  {personInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{personLabel}</p>
                  <p className="text-[11px] text-[#E3EBFB] truncate">{email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="text-[12px] font-medium text-[#E3EBFB] hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
