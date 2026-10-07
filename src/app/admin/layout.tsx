import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    <div className="min-h-full bg-white print:block lg:flex print:bg-white">
      <AdminSidebar userEmail={user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Utility Header for Admin */}
        <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-[#E3EBFB] bg-white/95 px-6 backdrop-blur-xs lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-none border border-[#04B6DA]/30 bg-[#F3F6FD] px-3 py-1 text-[11px] font-semibold text-[#061C52]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#04B6DA] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#04B6DA]" />
              </span>
              Platform Superadmin Mode
            </span>
          </div>
          <div className="flex items-center gap-4 text-[13px]">
            <span className="text-[#334155] font-medium">{user.email}</span>
            <div className="h-4 w-px bg-[#E3EBFB]" />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-none border border-[#E3EBFB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#061C52] hover:bg-[#F3F6FD] transition-colors shadow-2xs"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>Client App Workspace</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-7 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
