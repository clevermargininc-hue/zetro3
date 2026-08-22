"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsProvider, useSettings } from "@/components/settings-provider";
import {
  AccountSettings,
  AuditingSettings,
  TeamSettings,
  WorkspaceSettings,
} from "@/components/settings-sections";
import { TeamBoard } from "@/components/team-board";

const NAV = [
  {
    label: "You",
    items: [{ href: "/settings/account", label: "Account" }],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings/workspace", label: "General" },
      { href: "/settings/team", label: "Team" },
      { href: "/settings/auditing", label: "Auditing" },
    ],
  },
];

function SettingsPanel() {
  const pathname = usePathname();
  const section = pathname.replace(/^\/settings\/?/, "") || "account";

  if (section === "workspace") return <WorkspaceSettings />;
  if (section === "team") {
    return (
      <>
        <TeamSettings />
        <TeamBoard embedded />
      </>
    );
  }
  if (section === "auditing") return <AuditingSettings />;
  return <AccountSettings />;
}

function SettingsChrome() {
  const pathname = usePathname();
  const { error, info } = useSettings();

  return (
    <div className="-mx-5 -my-8 flex min-h-[calc(100vh-4rem)] lg:-mx-10 lg:min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line/60 bg-surface-2/80 px-3 py-8 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <p className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Settings</p>
        <nav className="mt-6 space-y-6">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">
                {group.label}
              </p>
              <div className="mt-2 space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href === "/settings/account" && pathname === "/settings");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                        active
                          ? "bg-white text-blue shadow-sm border border-line/50"
                          : "border border-transparent text-muted hover:bg-white/70 hover:text-ink"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 px-5 py-8 lg:px-10">
        <div className="mb-6 flex gap-1 overflow-x-auto pb-1 lg:hidden">
          {NAV.flatMap((group) => group.items).map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/settings/account" && pathname === "/settings");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
                  active ? "bg-blue text-white" : "bg-white text-muted border border-line"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {error ? <p className="alert-error mb-4">{error}</p> : null}
        {info ? <p className="alert-ok mb-4">{info}</p> : null}
        <div className="max-w-2xl">
          <SettingsPanel />
        </div>
      </div>
    </div>
  );
}

export function SettingsShell({ children: _children }: { children?: ReactNode }) {
  return (
    <SettingsProvider>
      <SettingsChrome />
    </SettingsProvider>
  );
}
