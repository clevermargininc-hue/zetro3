"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ZetroMark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { clearWorkspaceCookie } from "@/lib/workspace-cookie";

const Icons = {
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  companies: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v8" />
      <path d="M18 9h2a2 2 0 0 1 2 2v11" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  ),
  attention: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  trial: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  monthly: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  annual: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  ),
  paused: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="10" y1="15" x2="10" y2="9" />
      <line x1="14" y1="15" x2="14" y2="9" />
    </svg>
  ),
  app: (
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
  logout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

const NAV_GROUPS = [
  {
    label: "Platform Overview",
    items: [
      {
        href: "/admin",
        label: "Analytics & Realtime",
        icon: Icons.analytics,
        exact: true,
      },
      {
        href: "/admin/companies",
        label: "Companies & Plans",
        icon: Icons.companies,
        exact: false,
      },
    ],
  },
  {
    label: "Company Filters",
    items: [
      {
        href: "/admin/companies?plan=attention",
        label: "Needs Attention",
        icon: Icons.attention,
        paramMatch: "attention",
      },
      {
        href: "/admin/companies?plan=trial",
        label: "Free Trials",
        icon: Icons.trial,
        paramMatch: "trial",
      },
      {
        href: "/admin/companies?plan=monthly",
        label: "Monthly Plans",
        icon: Icons.monthly,
        paramMatch: "monthly",
      },
      {
        href: "/admin/companies?plan=annual",
        label: "Annual Contracts",
        icon: Icons.annual,
        paramMatch: "annual",
      },
      {
        href: "/admin/companies?plan=paused",
        label: "Paused Accounts",
        icon: Icons.paused,
        paramMatch: "paused",
      },
    ],
  },
  {
    label: "Platform Quicklinks",
    items: [
      {
        href: "/dashboard",
        label: "Client App Workspace",
        icon: Icons.app,
      },
      {
        href: "/upload",
        label: "Score Calls Sandbox",
        icon: Icons.upload,
      },
    ],
  },
];

export function AdminSidebar({ userEmail }: { userEmail?: string | null }) {
  const email = userEmail || "admin@zetro.io";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearWorkspaceCookie();
    router.push("/login");
    router.refresh();
  }

  function isItemActive(item: { href: string; exact?: boolean; paramMatch?: string }) {
    if (item.paramMatch) {
      return pathname.startsWith("/admin/companies") && planParam === item.paramMatch;
    }
    if (item.exact) {
      return pathname === "/admin";
    }
    if (item.href === "/admin/companies") {
      return (
        (pathname === "/admin/companies" && !planParam) ||
        pathname.startsWith("/admin/workspaces")
      );
    }
    return pathname === item.href;
  }

  const initial = (email || "A").charAt(0).toUpperCase();

  return (
    <>
      {/* Desktop Admin Sidebar */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-line bg-white print:hidden lg:sticky lg:top-0 lg:flex lg:h-screen transition-[width] duration-200 relative z-30 ${
          collapsed ? "w-18" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div
          className={`relative flex h-14 shrink-0 items-center border-b border-line bg-white ${
            collapsed ? "justify-center px-0" : "justify-between px-4"
          }`}
        >
          <Link href="/admin" className="flex items-center gap-2.5">
            <ZetroMark className="h-8 w-8 shrink-0" />
            {!collapsed && (
              <div className="flex items-center gap-1.5">
                <span className="font-brand text-[15px] font-bold tracking-[-0.01em] text-ink">Zetro</span>
                <span className="rounded bg-blue-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue border border-blue/20">
                  Admin
                </span>
              </div>
            )}
          </Link>

          {/* Edge Collapse Button */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center border border-line bg-white text-muted hover:text-ink shadow-xs"
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

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              {!collapsed ? (
                <span className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 block mb-1">
                  {group.label}
                </span>
              ) : (
                <div className="flex justify-center mb-1.5">
                  <div className="h-px w-5 bg-line" />
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isItemActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded text-[13px] font-medium transition-colors ${
                        collapsed ? "justify-center h-9 w-full px-0" : "gap-2.5 px-3 py-2"
                      } ${
                        active
                          ? "bg-blue-soft text-blue font-semibold shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                      }`}
                    >
                      <span className={`shrink-0 ${active ? "text-blue" : "text-slate-400"}`}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Live System Beacon & Profile Card */}
        <div className="p-3 border-t border-line bg-slate-50/70 shrink-0">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1 bg-white border border-line rounded text-[11px] text-muted">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-good" />
                </span>
                <span className="font-semibold text-ink">Superadmin Portal</span>
                <span className="ml-auto text-[10px] font-mono text-slate-400">EAT</span>
              </div>

              <div className="flex items-center justify-between gap-2 px-1 pt-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded bg-navy text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-ink truncate leading-tight">
                      {email.split("@")[0]}
                    </p>
                    <p className="text-[10px] text-blue font-medium truncate leading-tight">
                      Platform Admin
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  title="Sign out"
                  className="text-slate-400 hover:text-ink p-1.5 rounded hover:bg-white shrink-0 border border-transparent hover:border-line"
                >
                  {Icons.logout}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-good" />
              </span>
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                className="w-7 h-7 rounded bg-navy text-white flex items-center justify-center text-[11px] font-bold"
              >
                {initial}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Admin Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-white px-4 print:hidden lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <ZetroMark className="h-7 w-7" />
          <span className="font-brand text-[15px] font-bold text-ink">Zetro</span>
          <span className="rounded bg-blue-soft px-1.5 py-0.5 text-[10px] font-bold text-blue border border-blue/20">
            Admin
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-600 hover:text-ink"
          aria-label="Open navigation menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 transition-opacity" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-72 bg-white p-5 shadow-xl flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <ZetroMark className="h-7 w-7" />
                  <span className="font-brand text-[15px] font-bold text-ink">Zetro Admin</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1 text-slate-400 hover:text-ink"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <nav className="space-y-5">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 block mb-1">
                      {group.label}
                    </span>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const active = isItemActive(item);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium ${
                              active ? "bg-blue-soft text-blue font-semibold" : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span className={active ? "text-blue" : "text-slate-400"}>{item.icon}</span>
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            <div className="border-t border-line pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-navy text-white flex items-center justify-center text-[12px] font-bold">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-ink truncate">{email}</p>
                  <p className="text-[11px] text-blue">Superadmin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 py-2 text-[13px] font-medium text-rose hover:bg-rose/10 rounded border border-rose/20"
              >
                {Icons.logout}
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
