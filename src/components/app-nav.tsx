"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Award,
  Bell,
  Building2,
  FileBarChart2,
  GitBranch,
  LayoutDashboard,
  LayoutPanelTop,
  LogOut,
  Mic,
  Search,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { clearWorkspaceCookie } from "@/lib/workspace-cookie";

const Icons = {
  overview: <LayoutDashboard className="h-[18px] w-[18px]" />,
  upload: <Upload className="h-[18px] w-[18px]" />,
  audits: <Mic className="h-[18px] w-[18px]" />,
  journey: <GitBranch className="h-[18px] w-[18px]" />,
  ranking: <Award className="h-[18px] w-[18px]" />,
  reports: <FileBarChart2 className="h-[18px] w-[18px]" />,
  standards: <ShieldCheck className="h-[18px] w-[18px]" />,
  settings: <Settings className="h-[18px] w-[18px]" />,
  admin: <LayoutPanelTop className="h-[18px] w-[18px]" />,
  logout: <LogOut className="h-[15px] w-[15px]" />,
  search: <Search className="h-[15px] w-[15px]" />,
  bell: <Bell className="h-[17px] w-[17px]" />,
  building: <Building2 className="h-[14px] w-[14px]" />,
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
    label: "Quality & Intelligence",
    items: [
      { href: "/customers", label: "Customer Intelligence", icon: Icons.journey },
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
  label: "Zetro Team",
  items: [{ href: "/admin", label: "Admin dashboard", icon: Icons.admin }],
};

function linkActive(href: string, pathname: string) {
  if (href === "/upload") {
    return pathname === "/upload" || pathname.startsWith("/upload/");
  }
  if (href === "/calls") {
    return pathname === "/calls" || pathname.startsWith("/calls/");
  }
  if (href === "/customers") {
    return pathname === "/customers" || pathname.startsWith("/customers/");
  }
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPageBreadcrumb(pathname: string): { section: string; page: string } {
  if (pathname.startsWith("/customers/issues/")) {
    return { section: "Customer Intelligence", page: "Issue Investigation" };
  }
  if (pathname.startsWith("/customers/")) {
    return { section: "Customer Intelligence", page: "Customer Journey" };
  }
  if (pathname === "/customers") {
    return { section: "Quality & Intelligence", page: "Customer Intelligence" };
  }
  if (pathname.startsWith("/upload/score/")) {
    return { section: "Score Calls", page: "QA Evaluation Scorecard" };
  }
  if (pathname.startsWith("/upload/prepare/")) {
    return { section: "Score Calls", page: "Transcript & Diarization" };
  }
  if (pathname.startsWith("/upload")) {
    return { section: "Work", page: "Score Calls Pipeline" };
  }
  if (pathname.startsWith("/calls")) {
    return { section: "Work", page: "Calls Inventory" };
  }
  if (pathname.startsWith("/leaderboard")) {
    return { section: "Quality & Intelligence", page: "Agent Leaderboard" };
  }
  if (pathname.startsWith("/reports")) {
    return { section: "Quality & Intelligence", page: "Executive & Coaching Reports" };
  }
  if (pathname.startsWith("/standards")) {
    return { section: "Workspace", page: "Scorecard & Compliance Standards" };
  }
  if (pathname.startsWith("/settings")) {
    return { section: "Workspace", page: "Workspace Settings" };
  }
  return { section: "Work", page: "Overview Dashboard" };
}

export function AppTopBar({
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
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { section, page } = getPageBreadcrumb(pathname);

  const personLabel = username
    ? `@${username}`
    : displayName || (email || "").split("@")[0] || "Member";
  const personInitial = (displayName || username || email || "M").charAt(0).toUpperCase();

  function handleGlobalSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (/^[+0-9\s-]{6,}$/.test(q) || /^ISS-/i.test(q) || /^CUST-/i.test(q)) {
      router.push(`/customers`);
    } else {
      router.push(`/calls`);
    }
  }

  return (
    <header className="workspace-topbar sticky top-0 z-10 hidden shrink-0 items-center justify-between border-b border-line bg-white px-6 print:hidden lg:flex">
      {/* Breadcrumb / Page Title */}
      <div className="flex items-center gap-2 text-[13px] min-w-0">
        <span className="text-muted font-medium truncate">{section}</span>
        <span className="text-subtle">/</span>
        <span className="font-semibold text-navy truncate">{page}</span>
      </div>

      {/* Right Cluster: Search, Organization Badge, Notifications, User Profile */}
      <div className="flex items-center gap-3.5">
        <form onSubmit={handleGlobalSearch} className="relative hidden xl:block w-64">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {Icons.search}
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search calls, MSISDN, issues…"
            aria-label="Global workspace search"
            className="w-full rounded-lg border border-line bg-surface-2 py-1.5 pl-8.5 pr-3 text-[12.5px] text-ink placeholder:text-subtle focus:border-blue focus:bg-white focus:outline-none"
          />
        </form>

        {/* Organization Info Pill */}
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-ink-soft">
          <span className="text-teal">{Icons.building}</span>
          <span className="font-semibold text-navy truncate max-w-[140px]">
            {workspaceName || "Enterprise Workspace"}
          </span>
          {plan ? (
            <span className="rounded bg-blue-soft px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider text-blue">
              {plan}
            </span>
          ) : null}
        </div>

        {/* Notifications Link */}
        <Link
          href="/customers"
          title="Repeat Issue & Compliance Alerts"
          aria-label="Repeat Issue & Compliance Alerts"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink-soft hover:bg-surface-2 hover:text-navy transition-colors"
        >
          {Icons.bell}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal ring-2 ring-white" />
        </Link>

        {/* User Profile */}
        <Link
          href="/settings/account"
          className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 hover:border-line hover:bg-surface-2 transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
            {personInitial}
          </div>
          <span className="text-[12.5px] font-semibold text-ink max-w-[120px] truncate">
            {personLabel}
          </span>
        </Link>
      </div>
    </header>
  );
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
      {/* Desktop Sidebar — Clean White Enterprise Sidebar */}
      <aside
        className={`workspace-sidebar hidden shrink-0 flex-col border-r border-line bg-white print:hidden lg:sticky lg:top-0 lg:flex lg:h-screen transition-[width] duration-200 relative ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Logo + edge collapse control */}
        <div
          className={`relative flex h-14 shrink-0 items-center border-b border-line bg-white ${
            collapsed ? "justify-center px-0" : "px-5"
          }`}
        >
          <Logo size="sm" collapsed={collapsed} href="/dashboard" />
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-muted hover:text-navy shadow-2xs"
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
                  <span className="px-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted block mb-1.5">
                    {group.label}
                  </span>
                ) : (
                  <div className="flex justify-center mb-2">
                    <div className="h-px w-5 bg-line" />
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = linkActive(item.href, pathname);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center rounded-lg text-[13.5px] transition-colors ${
                          collapsed
                            ? "justify-center h-9 w-full px-0"
                            : "gap-3 px-3 py-2"
                        } ${
                          active
                            ? "bg-blue-soft text-blue font-semibold"
                            : "text-ink-soft font-medium hover:bg-surface-2 hover:text-ink"
                        }`}
                      >
                        <span className={`shrink-0 ${active ? "text-blue" : "text-muted"}`}>
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
        <div className="p-3 border-t border-line bg-white shrink-0">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2 px-1.5 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-[12px] font-bold shrink-0">
                  {personInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate leading-tight">
                    {personLabel}
                  </p>
                  <p className="text-[11.5px] text-muted truncate leading-tight mt-0.5">
                    {plan === "solo" ? "Solo · " : plan === "team" ? "Team · " : ""}
                    {workspaceName || "Zetro"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                aria-label="Sign out"
                className="text-muted hover:text-ink p-1.5 rounded-lg hover:bg-surface-2 shrink-0"
              >
                {Icons.logout}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                title={`${personLabel} · Expand sidebar`}
                aria-label={`${personLabel} · Expand sidebar`}
                className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-[12px] font-bold"
              >
                {personInitial}
              </button>
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                aria-label="Sign out"
                className="text-muted hover:text-ink p-1.5 rounded-lg hover:bg-surface-2"
              >
                {Icons.logout}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-20 flex h-13 items-center justify-between border-b border-line bg-white px-4 print:hidden lg:hidden">
        <Logo size="sm" href="/dashboard" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="p-2 text-ink-soft hover:text-ink"
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
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-0 right-0 h-full w-72 bg-white p-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-line">
                <Logo size="sm" href="/dashboard" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-1.5 text-muted hover:text-ink"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <nav className="space-y-6">
                {groups.map((group) => (
                  <div key={group.label} className="space-y-1.5">
                    <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1">
                      {group.label}
                    </span>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const active = linkActive(item.href, pathname);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] ${
                              active
                                ? "bg-blue-soft text-blue font-semibold"
                                : "text-ink-soft font-medium hover:bg-surface-2 hover:text-ink"
                            }`}
                          >
                            <span className={active ? "text-blue" : "text-muted"}>
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
            <div className="pt-4 border-t border-line flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-[12px] font-bold shrink-0">
                  {personInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">{personLabel}</p>
                  <p className="text-[11.5px] text-muted truncate">{email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="text-[12.5px] font-semibold text-ink-soft hover:text-rose"
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
