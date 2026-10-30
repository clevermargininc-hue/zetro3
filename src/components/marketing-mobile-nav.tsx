"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function MarketingMobileNav({
  children,
  signedIn,
  pathname,
}: {
  children: ReactNode;
  signedIn: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 lg:hidden">
      {children}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white/80 text-[#0f172a] shadow-xs backdrop-blur-md transition-all hover:bg-white active:scale-95"
        aria-expanded={open}
        aria-label="Toggle navigation menu"
      >
        {open ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full border-b border-black/[0.06] bg-white/95 px-6 py-5 shadow-2xl backdrop-blur-2xl">
          <nav className="flex flex-col gap-2">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-black/[0.05] text-[#0f172a]"
                      : "text-neutral-600 hover:bg-black/[0.03] hover:text-black"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="my-1 border-t border-black/[0.06]" />
            <Link
              href="/talk-sales"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-black/[0.03] hover:text-black"
            >
              Talk to sales
            </Link>
            {!signedIn ? (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-black/[0.03] hover:text-black"
              >
                Sign in to your account
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
