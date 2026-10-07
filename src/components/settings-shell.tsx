"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsProvider, useSettings } from "@/components/settings-provider";
import { PageHeader } from "@/components/ui";
import {
  AccountSettings,
  AuditingSettings,
  TeamSettings,
  WorkspaceSettings,
} from "@/components/settings-sections";
import { TeamBoard } from "@/components/team-board";

const Icons = {
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  workspace: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  team: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  auditing: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
    </svg>
  ),
};

const NAV = [
  {
    label: "You",
    items: [{ href: "/settings/account", label: "Account", icon: Icons.user }],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings/workspace", label: "Workspace", icon: Icons.workspace },
      { href: "/settings/team", label: "Team", icon: Icons.team },
      { href: "/settings/auditing", label: "Scoring", icon: Icons.auditing },
    ],
  },
];

function SettingsPanel() {
  const pathname = usePathname();
  const section = pathname.replace(/^\/settings\/?/, "") || "account";

  if (section === "workspace") return <WorkspaceSettings />;
  if (section === "team") {
    return (
      <div className="space-y-6">
        <TeamSettings />
        <TeamBoard />
      </div>
    );
  }
  if (section === "auditing") return <AuditingSettings />;
  return <AccountSettings />;
}

function SettingsChrome() {
  const pathname = usePathname();
  const { error, info } = useSettings();

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Settings"
        description="Your account, workspace, team access, and scoring rules."
      />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-6">
          <nav className="space-y-5 surface p-4">
            {NAV.map((group) => (
              <div key={group.label}>
                <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#061C52] block mb-1.5">
                  {group.label}
                </span>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href === "/settings/account" && pathname === "/settings");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded px-3 py-2 text-[13px] font-medium transition-colors ${
                          active
                            ? "bg-[#061C52] text-white font-medium"
                            : "text-[#334155] hover:bg-[#F3F6FD] hover:text-[#061C52]"
                        }`}
                      >
                        <span className={active ? "text-white" : "text-[#334155]"}>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-9 min-w-0">
          {error && <p className="alert-error mb-5">{error}</p>}
          {info && <p className="alert-ok mb-5">{info}</p>}
          <SettingsPanel />
        </main>
      </div>
    </div>
  );
}

export function SettingsShell() {
  return (
    <SettingsProvider>
      <SettingsChrome />
    </SettingsProvider>
  );
}
