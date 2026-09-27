import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { ZetroMark } from "@/components/logo";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Zetro",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireUser();
  if (!isPlatformAdmin(user.email)) notFound();

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-3.5 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-3">
              <ZetroMark className="h-8 w-8" />
              <span className="text-[16px] font-bold tracking-[-0.01em] text-ink">
                <span className="font-brand">Zetro</span> <span className="font-semibold text-blue">Admin</span>
              </span>
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-4 text-[13px]">
            <span className="hidden text-muted sm:inline">{user.email}</span>
            <Link href="/dashboard" className="font-semibold text-muted hover:text-ink">
              Open app
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1180px] px-5 py-7 lg:px-8">{children}</main>
    </div>
  );
}
