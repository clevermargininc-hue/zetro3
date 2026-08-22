"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { clearWorkspaceCookie } from "@/lib/workspace-cookie";

// Minimal SVG Icons
const Icons = {
  overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
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
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  standards: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  ),
};

const NAV = [
  {
    label: "Operations",
    items: [
      { href: "/dashboard", label: "Overview", icon: Icons.overview },
      { href: "/upload", label: "Upload", icon: Icons.upload },
      { href: "/calls", label: "Call Audits", icon: Icons.audits },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/leaderboard", label: "Agent ranking", icon: Icons.ranking },
      { href: "/reports", label: "Reports", icon: Icons.reports },
    ],
  },
  {
    label: "Configurations",
    items: [
      { href: "/standards", label: "Standards", icon: Icons.standards },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: Icons.settings },
    ],
  },
];

function linkActive(href: string, pathname: string) {
  if (href === "/calls") {
    return pathname === "/calls" || pathname.startsWith("/calls/");
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
}: {
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  workspaceName?: string | null;
  plan?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const personLabel = username
    ? `@${username}`
    : displayName || (email || "").split("@")[0] || "Member";
  const personInitial = (displayName || username || email || "M").charAt(0);

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
      <aside className={`hidden shrink-0 flex-col border-r border-line/50 bg-surface-2 print:hidden lg:sticky lg:top-0 lg:flex lg:h-screen transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] relative ${collapsed ? "w-20" : "w-64"}`}>
        
        {/* Collapse Toggle */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white shadow-sm text-muted hover:text-ink transition-transform duration-200"
          style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className={`flex items-center h-[72px] border-b border-line/40 bg-white overflow-hidden ${collapsed ? "justify-center px-0" : "px-6"}`}>
          <Logo size={collapsed ? "sm" : "sm"} collapsed={collapsed} />
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <nav className={`space-y-8 py-8 ${collapsed ? "px-3" : "px-4"}`}>
            {NAV.map((group) => (
              <div key={group.label}>
                {!collapsed ? (
                  <p className="px-4 text-[11px] font-bold uppercase tracking-[0.15em] text-muted opacity-70 mb-3 animate-in fade-in duration-200">
                    {group.label}
                  </p>
                ) : (
                  <div className="flex justify-center mb-3">
                    <div className="h-px w-6 bg-line/60" />
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = linkActive(item.href, pathname);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center rounded-xl text-[14px] font-medium transition-all duration-200 group relative ${
                          collapsed ? "justify-center h-10 w-full px-0" : "gap-3 px-4 py-2.5"
                        } ${
                          active 
                            ? "bg-white text-blue shadow-sm border border-line/50" 
                            : "text-muted hover:bg-white/60 hover:text-ink hover:shadow-sm hover:border hover:border-line/30 border border-transparent"
                        }`}
                      >
                        <span className={`shrink-0 transition-colors ${active ? "text-blue" : "text-muted group-hover:text-blue/70"}`}>
                           {item.icon}
                        </span>
                        {!collapsed && <span className="animate-in fade-in duration-200 whitespace-nowrap">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className={`p-4 bg-white border-t border-line/40 overflow-hidden`}>
          <div className={`flex items-center rounded-xl bg-surface-2 border border-line/50 ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"}`}>
            <div className="h-8 w-8 rounded-full bg-blue/10 flex items-center justify-center text-blue font-bold text-xs uppercase shrink-0">
               {personInitial}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 animate-in fade-in duration-200">
                 <p className="truncate text-[13px] font-bold text-ink leading-tight">
                   {personLabel}
                 </p>
                 <p className="truncate text-[11px] text-muted leading-tight">
                   {workspaceName ? `${plan === "solo" ? "Solo" : "Team"} · ` : ""}
                   {workspaceName || "Zetro"}
                 </p>
                 <button
                   type="button"
                   onClick={signOut}
                   className="text-[11px] font-semibold text-muted hover:text-rose transition-colors duration-200"
                 >
                   Sign out
                 </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-line bg-white px-4 print:hidden lg:hidden shadow-sm">
        <Logo size="sm" />
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-2 -mr-2 text-muted hover:text-ink">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </header>

      {/* Mobile Menu */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-[280px] bg-surface-2 p-5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <Logo size="sm" />
               <button type="button" onClick={() => setOpen(false)} className="p-2 -mr-2 text-muted hover:text-ink">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <line x1="18" y1="6" x2="6" y2="18" />
                   <line x1="6" y1="6" x2="18" y2="18" />
                 </svg>
               </button>
            </div>
            
            <nav className="flex-1 space-y-8 overflow-y-auto custom-scrollbar">
              {NAV.map((group) => (
                <div key={group.label}>
                  <p className="px-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted opacity-70 mb-3">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active = linkActive(item.href, pathname);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${
                            active 
                              ? "bg-white text-blue shadow-sm border border-line/50" 
                              : "text-muted hover:bg-white/60 hover:text-ink hover:shadow-sm"
                          }`}
                        >
                          <span className={`transition-colors ${active ? "text-blue" : "text-muted"}`}>
                             {item.icon}
                          </span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            
            <div className="pt-6 mt-6 border-t border-line/40">
               <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white border border-line/50">
                 <div className="h-10 w-10 rounded-full bg-blue/10 flex items-center justify-center text-blue font-bold text-[14px] uppercase shrink-0">
                    {(personInitial)}
                 </div>
                 <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-ink leading-tight">
                      {personLabel}
                    </p>
                    <p className="truncate text-[12px] text-muted">
                      {workspaceName ? `${plan === "solo" ? "Solo" : "Team"} · ` : ""}
                      {workspaceName || "Zetro"}
                    </p>
                    <button
                      type="button"
                      onClick={signOut}
                      className="text-[12px] font-semibold text-muted hover:text-rose mt-1 transition-colors duration-200"
                    >
                      Sign out
                    </button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
