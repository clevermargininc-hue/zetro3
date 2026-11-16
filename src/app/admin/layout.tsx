import type { Metadata } from "next";
import design from "@/components/workspace-design.module.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Portal | Zetro",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireUser();
  if (!isPlatformAdmin(user.email)) notFound();

  return (
    <div className={`${design.shell} min-h-full print:block lg:flex print:bg-white`}>
      <AdminSidebar userEmail={user.email} />
      <div className="workspace-body flex min-w-0 flex-1 flex-col">
        {/* Top Utility Header for Admin */}
        <header className="workspace-topbar sticky top-0 z-20 hidden items-center justify-between border-b border-line lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-blue/20 bg-blue-soft/60 px-3 py-1 text-[11px] font-semibold text-blue">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-good" />
              </span>
              Platform administration
            </span>
          </div>
          <div className="flex items-center gap-4 text-[13px]">
            <span className="text-muted font-medium">{user.email}</span>
            <div className="h-4 w-px bg-line" />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Client App Workspace</span>
            </Link>
          </div>
        </header>

        <main id="main-content" className="workspace-content mx-auto w-full flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
