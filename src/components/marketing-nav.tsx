"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function MarketingNav({ signedIn }: { signedIn: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white/90 backdrop-blur-md transition-shadow">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
        <Logo size="sm" />

        {/* Desktop Navigation */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[13px] font-semibold transition-colors ${
                  active ? "text-blue font-bold" : "text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/talk-sales"
            className="text-[13px] font-semibold text-muted transition-colors hover:text-ink"
          >
            Talk to sales
          </Link>
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-blue shadow-xs">
              Open workspace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[13px] font-semibold text-muted transition-colors hover:text-ink"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-blue shadow-xs">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-sm btn-blue px-3 py-1.5 text-xs">
              Workspace
            </Link>
          ) : (
            <Link href="/signup" className="btn btn-sm btn-blue px-3 py-1.5 text-xs">
              Start Free
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2 text-ink hover:bg-bg transition-colors"
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="border-b border-line bg-white/98 px-6 py-5 shadow-lg backdrop-blur-md md:hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col gap-3">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    active ? "bg-blue-soft text-blue font-bold" : "text-ink hover:bg-bg"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="my-2 border-t border-line/60" />
            <Link
              href="/talk-sales"
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-bg hover:text-ink"
            >
              Talk to sales
            </Link>
            {!signedIn && (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-bg hover:text-ink"
              >
                Sign in to your account
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
