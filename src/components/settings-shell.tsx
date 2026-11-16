"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Database, Plug, Sliders, User, Users } from "lucide-react";
import { SettingsProvider, useSettings } from "@/components/settings-provider";
import { PageHeader } from "@/components/ui";
import {
  AccountSettings,
  AuditingSettings,
  TeamSettings,
  WorkspaceSettings,
} from "@/components/settings-sections";
import { TeamBoard } from "@/components/team-board";
import { CompanyDataSettings } from "@/components/company-data-settings";

const Icons = {
  user: <User className="h-4 w-4" />,
  workspace: <Briefcase className="h-4 w-4" />,
  catalogue: <Database className="h-4 w-4" />,
  connections: <Plug className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  auditing: <Sliders className="h-4 w-4" />,
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
      { href: "/settings/company-intelligence", label: "Company data", icon: Icons.catalogue },
      { href: "/settings/team", label: "Team", icon: Icons.team },
      { href: "/settings/auditing", label: "Scoring", icon: Icons.auditing },
    ],
  },
];

function SettingsPanel() {
  const pathname = usePathname();
  const section = pathname.replace(/^\/settings\/?/, "") || "account";

  if (section === "workspace") return <WorkspaceSettings />;
  if (section === "company-intelligence") return <CompanyDataSettings />;
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
          <nav className="settings-navigation space-y-5 surface p-4">
            {NAV.map((group) => (
              <div key={group.label}>
                <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
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
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2.5 rounded px-3 py-2 text-[13px] font-medium ${
                          active
                            ? "bg-blue-soft text-blue"
                            : "text-slate-600 hover:bg-slate-50 hover:text-ink"
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
