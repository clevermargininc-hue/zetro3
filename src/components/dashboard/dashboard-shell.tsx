"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DropdownMenu, Popover } from "radix-ui";
import {
  Award,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronsUpDown,
  ClipboardCheck,
  GraduationCap,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneCall,
  Plug,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { clearWorkspaceCookie } from "@/lib/workspace-cookie";
import { setActiveWorkspaceId } from "@/lib/api/client";
import { formatDateTimeInTz } from "@/lib/i18n/dashboard";
import type { DashboardCapability } from "@/lib/rbac/roles";
import type { SessionResponse } from "@/features/session/api/schemas";
import { useDashboardContext } from "@/components/dashboard/providers";
import { GlobalCommandPalette } from "@/components/dashboard/command-palette";
import {
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/features/notifications/api/queries";
import { useQueuesQuery, useTeamsQuery } from "@/features/teams/api/queries";

type NavItem = {
  id: string;
  href: string;
  label: string;
  capability: DashboardCapability;
  icon: typeof LayoutDashboard;
  matchPrefix?: string[];
};

type SidebarContentProps = {
  isMobile?: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  filteredGroups: Array<{ label: string; items: NavItem[] }>;
  isItemActive: (item: NavItem) => boolean;
  session: SessionResponse;
  userInitial: string;
  switchWorkspaceLabel: string;
  signOutLabel: string;
  onSwitchWorkspace: (workspaceId: string) => void;
  onSignOut: () => void;
};

function SidebarContent({
  isMobile = false,
  collapsed,
  onToggleCollapse,
  onCloseMobile,
  filteredGroups,
  isItemActive,
  session,
  userInitial,
  switchWorkspaceLabel,
  signOutLabel,
  onSwitchWorkspace,
  onSignOut,
}: SidebarContentProps) {
  const isCollapsed = !isMobile && collapsed;
  return (
    <div className="flex h-full flex-col bg-[var(--z-surface)]">
      {/* Sidebar Header + Logo + Collapse button */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-[var(--z-border)] px-4",
          isCollapsed ? "justify-center px-2" : "justify-between",
        )}
      >
        <Link
          href="/dashboard"
          aria-label="Zetro overview"
          className="z-focus inline-flex items-center gap-2.5 rounded-[var(--z-radius-control)]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#0A1A3F] text-white font-bold text-[14px] z-display">
            Z
          </div>
          {!isCollapsed ? (
            <span className="z-display text-[17px] font-bold tracking-[-0.03em] text-[var(--z-ink)]">
              Zetro
            </span>
          ) : null}
        </Link>

        {isMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="z-focus rounded-[var(--z-radius-control)] p-1.5 text-[var(--z-ink-secondary)] hover:bg-[var(--z-surface-muted)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="z-focus rounded-[var(--z-radius-control)] p-1.5 text-[var(--z-ink-muted)] hover:text-[var(--z-ink)] hover:bg-[var(--z-surface-muted)] transition-colors"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* Grouped Navigation (RBAC Filtered) */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
      >
        {filteredGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--z-ink-muted)]">
                {group.label}
              </div>
            ) : (
              <div className="mx-auto my-2 h-px w-5 bg-[var(--z-border)]" />
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      title={isCollapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "z-focus relative flex items-center rounded-[var(--z-radius-control)] text-[13px] transition-colors duration-150",
                        isCollapsed ? "h-9 justify-center px-0" : "gap-3 px-3 py-2",
                        active
                          ? "bg-[var(--z-accent-tint)] text-[var(--z-accent)] font-semibold"
                          : "text-[var(--z-ink-secondary)] font-medium hover:bg-[var(--z-surface-muted)] hover:text-[var(--z-ink)]",
                      )}
                    >
                      {active && !isCollapsed ? (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[var(--z-accent)]"
                        />
                      ) : null}
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Organization Switcher & User Card */}
      <div className="border-t border-[var(--z-border)] p-3 shrink-0 space-y-2">
        {!isCollapsed ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Switch organization workspace"
                className="z-focus w-full flex items-center justify-between gap-2 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] px-2.5 py-2 text-left hover:border-[var(--z-border-strong)] transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--z-navy)] text-[var(--z-surface)] text-[11.5px] font-bold">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-[var(--z-ink)] truncate">
                      {session.workspace.name}
                    </div>
                    <div className="text-[11px] text-[var(--z-ink-muted)] truncate">
                      {session.user.fullName} · {session.user.role.replace("_", " ")}
                    </div>
                  </div>
                </div>
                <ChevronsUpDown
                  className="h-3.5 w-3.5 shrink-0 text-[var(--z-ink-muted)]"
                  aria-hidden="true"
                />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="top"
                align="start"
                sideOffset={8}
                className="z-50 z-panel w-60 p-1.5 space-y-1"
              >
                <DropdownMenu.Label className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--z-ink-muted)]">
                  {switchWorkspaceLabel}
                </DropdownMenu.Label>
                {session.workspaces.map((ws) => (
                  <DropdownMenu.Item
                    key={ws.id}
                    onSelect={() => onSwitchWorkspace(ws.id)}
                    className="flex items-center justify-between gap-2 rounded-[6px] px-2 py-1.5 text-[12.5px] text-[var(--z-ink)] outline-none cursor-pointer hover:bg-[var(--z-surface-muted)]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-3.5 w-3.5 text-[var(--z-ink-muted)] shrink-0" />
                      <span className="truncate font-medium">{ws.name}</span>
                    </div>
                    {ws.id === session.workspace.id ? (
                      <Check className="h-3.5 w-3.5 text-[var(--z-accent)] shrink-0" />
                    ) : null}
                  </DropdownMenu.Item>
                ))}
                <DropdownMenu.Separator className="my-1 h-px bg-[var(--z-border)]" />
                <DropdownMenu.Item
                  onSelect={onSignOut}
                  className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[12.5px] font-medium text-[var(--z-fail)] outline-none cursor-pointer hover:bg-[var(--z-fail-tint)]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{signOutLabel}</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : (
          <button
            type="button"
            onClick={onSignOut}
            title={signOutLabel}
            aria-label={signOutLabel}
            className="z-focus mx-auto flex h-9 w-9 items-center justify-center rounded-[var(--z-radius-control)] text-[var(--z-ink-secondary)] hover:bg-[var(--z-surface-muted)]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export function DashboardShell({
  isPlatformAdmin = false,
  planBanner,
  children,
}: {
  isPlatformAdmin?: boolean;
  planBanner?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    session,
    theme,
    locale,
    timezone,
    copy,
    can,
    setTheme,
    setLocale,
    switchWorkspace,
  } = useDashboardContext();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const notificationsQuery = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const teamsQuery = useTeamsQuery();
  const queuesQuery = useQueuesQuery();

  const teams = teamsQuery.data?.teams ?? [];
  const queues = queuesQuery.data?.queues ?? [];

  const navGroups: Array<{ label: string; items: NavItem[] }> = [
    {
      label: copy.nav.groupOperations,
      items: [
        {
          id: "overview",
          href: "/dashboard",
          label: copy.nav.overview,
          capability: "overview:view",
          icon: LayoutDashboard,
        },
        {
          id: "calls",
          href: "/calls",
          label: copy.nav.calls,
          capability: "calls:view",
          icon: PhoneCall,
          matchPrefix: ["/calls", "/upload"],
        },
        {
          id: "agents",
          href: "/leaderboard",
          label: copy.nav.agents,
          capability: "agents:view",
          icon: Award,
        },
        {
          id: "teams",
          href: "/team",
          label: copy.nav.teams,
          capability: "teams:view",
          icon: Users,
        },
      ],
    },
    {
      label: copy.nav.groupQuality,
      items: [
        {
          id: "scorecards",
          href: "/standards",
          label: copy.nav.scorecards,
          capability: "scorecards:view",
          icon: ClipboardCheck,
        },
        {
          id: "compliance",
          href: "/calls?flagged=1",
          label: copy.nav.compliance,
          capability: "compliance:view",
          icon: ShieldCheck,
        },
        {
          id: "coaching",
          href: "/reports?view=coaching",
          label: copy.nav.coaching,
          capability: "coaching:view",
          icon: GraduationCap,
        },
        {
          id: "reports",
          href: "/reports",
          label: copy.nav.reports,
          capability: "reports:view",
          icon: BarChart3,
        },
      ],
    },
    {
      label: copy.nav.groupAdmin,
      items: [
        {
          id: "integrations",
          href: "/settings/connections",
          label: copy.nav.integrations,
          capability: "integrations:view",
          icon: Plug,
        },
        {
          id: "settings",
          href: "/settings",
          label: copy.nav.settings,
          capability: "settings:view",
          icon: Settings,
        },
      ],
    },
  ];

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(item.capability)),
    }))
    .filter((group) => group.items.length > 0);

  if (isPlatformAdmin) {
    filteredGroups.push({
      label: "Zetro",
      items: [
        {
          id: "platform-admin",
          href: "/admin",
          label: copy.nav.admin,
          capability: "overview:view",
          icon: ShieldAlert,
        },
      ],
    });
  }

  function isItemActive(item: NavItem): boolean {
    if (item.id === "compliance") {
      return pathname === "/calls" && searchParams.get("flagged") === "1";
    }
    if (item.id === "coaching") {
      return pathname === "/reports" && searchParams.get("view") === "coaching";
    }
    if (item.href === "/dashboard") return pathname === "/dashboard";
    if (item.href === "/settings") {
      return pathname === "/settings" || (pathname.startsWith("/settings/") && pathname !== "/settings/connections");
    }
    if (item.matchPrefix) {
      return item.matchPrefix.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearWorkspaceCookie();
    setActiveWorkspaceId(null);
    router.push("/login");
    router.refresh();
  }

  function pushTeamOrQueueFilter(key: "teamId" | "queueId", val: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (val) sp.set(key, val);
    else sp.delete(key);
    sp.delete("page");
    const qs = sp.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
  }

  const userInitial = (session.user.fullName || session.user.email || "Z")
    .charAt(0)
    .toUpperCase();

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const notificationItems = notificationsQuery.data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar (240px <-> 72px) */}
      <aside
        className={cn(
          "hidden lg:flex shrink-0 sticky top-0 h-screen border-r border-[var(--z-border)] transition-[width] duration-200",
          collapsed ? "w-[72px]" : "w-[240px]",
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onCloseMobile={() => setMobileOpen(false)}
          filteredGroups={filteredGroups}
          isItemActive={isItemActive}
          session={session}
          userInitial={userInitial}
          switchWorkspaceLabel={copy.topbar.switchWorkspace}
          signOutLabel={copy.topbar.signOut}
          onSwitchWorkspace={switchWorkspace}
          onSignOut={() => void handleSignOut()}
        />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-[rgba(10,26,63,0.45)]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-[260px] border-r border-[var(--z-border)] shadow-xl">
            <SidebarContent
              isMobile
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed((c) => !c)}
              onCloseMobile={() => setMobileOpen(false)}
              filteredGroups={filteredGroups}
              isItemActive={isItemActive}
              session={session}
              userInitial={userInitial}
              switchWorkspaceLabel={copy.topbar.switchWorkspace}
              signOutLabel={copy.topbar.signOut}
              onSwitchWorkspace={switchWorkspace}
              onSignOut={() => void handleSignOut()}
            />
          </div>
        </div>
      ) : null}

      {/* Main Content Frame */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Top Utility Bar */}
        <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-[var(--z-border)] bg-[var(--z-surface)] px-4 lg:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="z-focus lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--z-radius-control)] border border-[var(--z-border)] text-[var(--z-ink)]"
            >
              <Menu className="h-4.5 w-4.5" aria-hidden="true" />
            </button>

            {/* Cmd/Ctrl+K Search Trigger */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open global search command palette"
              className="z-focus flex h-9 w-full max-w-[320px] items-center justify-between gap-2 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] px-3 text-[12.5px] text-[var(--z-ink-muted)] hover:border-[var(--z-border-strong)] transition-colors"
            >
              <span className="inline-flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{copy.topbar.searchPlaceholder}</span>
              </span>
              <kbd className="hidden sm:inline rounded-[5px] border border-[var(--z-border)] bg-[var(--z-surface)] px-1.5 py-0.5 text-[10.5px] font-semibold">
                {copy.topbar.searchShortcutHint}
              </kbd>
            </button>

            {/* Quick Topbar Team / Queue Selectors */}
            {pathname === "/dashboard" && (teams.length > 0 || queues.length > 0) ? (
              <div className="hidden xl:flex items-center gap-2">
                {teams.length > 0 ? (
                  <select
                    aria-label="Topbar team filter"
                    value={searchParams.get("teamId") || ""}
                    onChange={(e) => pushTeamOrQueueFilter("teamId", e.target.value)}
                    className="z-focus h-9 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-2.5 text-[12px] font-medium text-[var(--z-ink)]"
                  >
                    <option value="">{copy.topbar.allTeams}</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                {queues.length > 0 ? (
                  <select
                    aria-label="Topbar queue filter"
                    value={searchParams.get("queueId") || ""}
                    onChange={(e) => pushTeamOrQueueFilter("queueId", e.target.value)}
                    className="z-focus h-9 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-2.5 text-[12px] font-medium text-[var(--z-ink)]"
                  >
                    <option value="">{copy.topbar.allQueues}</option>
                    {queues.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Right Controls: Language Toggle (EN/SW), Theme Toggle, Notifications, User */}
          <div className="flex items-center gap-2 shrink-0">
            {/* EN / SW Toggle */}
            <div
              role="group"
              aria-label="Language toggle"
              className="inline-flex h-9 items-center rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] p-0.5"
            >
              <Languages className="ml-1.5 mr-1 h-3.5 w-3.5 text-[var(--z-ink-muted)] hidden sm:block" aria-hidden="true" />
              {(["en", "sw"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  aria-pressed={locale === lang}
                  onClick={() => setLocale(lang)}
                  className={cn(
                    "z-focus h-7.5 rounded-[6px] px-2 text-[11.5px] font-semibold uppercase transition-colors",
                    locale === lang
                      ? "bg-[var(--z-surface)] text-[var(--z-ink)] shadow-2xs"
                      : "text-[var(--z-ink-muted)] hover:text-[var(--z-ink)]",
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Light / Dark Mode Toggle (persisted per user) */}
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? copy.topbar.themeLight : copy.topbar.themeDark}
              title={theme === "dark" ? copy.topbar.themeLight : copy.topbar.themeDark}
              className="z-focus inline-flex h-9 w-9 items-center justify-center rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] text-[var(--z-ink-secondary)] hover:text-[var(--z-ink)] hover:border-[var(--z-border-strong)] transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {/* Notifications Bell Popover */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  aria-label={`${copy.topbar.notificationsTitle} (${unreadCount} unread)`}
                  className="z-focus relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] text-[var(--z-ink-secondary)] hover:text-[var(--z-ink)] hover:border-[var(--z-border-strong)] transition-colors"
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--z-fail)] px-1 text-[10px] font-bold text-white z-tabular">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 z-panel w-80 max-w-[92vw] overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-[var(--z-border)] px-4 py-3">
                    <span className="text-[12.5px] font-semibold text-[var(--z-ink)]">
                      {copy.topbar.notificationsTitle}
                    </span>
                    {unreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => markRead.mutate({ markAll: true })}
                        className="z-focus text-[11.5px] font-semibold text-[var(--z-accent)] hover:underline"
                      >
                        {copy.topbar.markAllRead}
                      </button>
                    ) : null}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[var(--z-border)]">
                    {notificationItems.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[12.5px] text-[var(--z-ink-muted)]">
                        {copy.topbar.noNotifications}
                      </div>
                    ) : (
                      notificationItems.map((n) => (
                        <Link
                          key={n.id}
                          href={n.callId ? `/dashboard?inspect=${encodeURIComponent(n.callId)}` : n.linkHref || "/calls"}
                          onClick={() => {
                            if (!n.readAt && !n.id.startsWith("call-alert-")) {
                              markRead.mutate({ id: n.id });
                            }
                          }}
                          className="block px-4 py-3 hover:bg-[var(--z-surface-muted)] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[12.5px] font-semibold text-[var(--z-ink)]">
                              {n.title}
                            </span>
                            {!n.readAt ? (
                              <span className="mt-1 h-2 w-2 rounded-full bg-[var(--z-accent)] shrink-0" />
                            ) : null}
                          </div>
                          {n.body ? (
                            <p className="mt-0.5 text-[12px] text-[var(--z-ink-secondary)] line-clamp-2">
                              {n.body}
                            </p>
                          ) : null}
                          <div className="mt-1 text-[11px] text-[var(--z-ink-muted)] z-tabular">
                            {formatDateTimeInTz(n.createdAt, timezone, locale)}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            {/* User Account Menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="User account menu"
                  className="z-focus inline-flex h-9 items-center gap-2 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-2.5 text-[12.5px] font-semibold text-[var(--z-ink)] hover:border-[var(--z-border-strong)]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A1A3F] text-white text-[11px] font-bold">
                    {userInitial}
                  </span>
                  <span className="hidden md:inline max-w-[110px] truncate">
                    {session.user.fullName}
                  </span>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 z-panel w-56 p-2 space-y-1 text-[12.5px]"
                >
                  <div className="px-2 py-1.5 border-b border-[var(--z-border)]">
                    <div className="font-semibold text-[var(--z-ink)] truncate">
                      {session.user.fullName}
                    </div>
                    <div className="text-[11px] text-[var(--z-ink-muted)] truncate">
                      {session.user.email}
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-[var(--z-accent)]">
                      {timezone}
                    </div>
                  </div>
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/settings/account"
                      className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[var(--z-ink)] outline-none hover:bg-[var(--z-surface-muted)]"
                    >
                      <Settings className="h-3.5 w-3.5 text-[var(--z-ink-muted)]" />
                      <span>Account & Preferences</span>
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => void handleSignOut()}
                    className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 font-medium text-[var(--z-fail)] outline-none cursor-pointer hover:bg-[var(--z-fail-tint)]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>{copy.topbar.signOut}</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        {/* Main Scroll Region */}
        <main className="flex-1 min-w-0 px-4 py-6 lg:px-8 max-w-[1600px] w-full mx-auto">
          {planBanner}
          {children}
        </main>
      </div>

      {/* Global Cmd+K Command Palette */}
      <GlobalCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        placeholder={copy.topbar.searchPlaceholder}
        onSelectCall={(callId) => {
          const sp = new URLSearchParams(searchParams.toString());
          sp.set("inspect", callId);
          router.push(`/dashboard?${sp.toString()}`);
        }}
        onSelectAgent={(agentId) => {
          const sp = new URLSearchParams(searchParams.toString());
          sp.set("agentId", agentId);
          sp.delete("page");
          router.push(`/dashboard?${sp.toString()}`);
        }}
      />
    </div>
  );
}
