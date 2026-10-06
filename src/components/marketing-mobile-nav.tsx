"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function MarketingMobileNav({
  signedIn,
  pathname,
}: {
  signedIn: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 lg:hidden">
      {signedIn ? (
        <Link href="/dashboard" className="btn btn-blue px-3 py-1.5 text-[12px]">
          Workspace
        </Link>
      ) : (
        <Link href="/signup" className="btn btn-blue px-3 py-1.5 text-[12px]">
          Start free
        </Link>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2 text-ink hover:bg-bg"
        aria-expanded={open}
        aria-label="Toggle navigation menu"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full border-b border-line bg-white px-6 py-5">
          <nav className="flex flex-col gap-3">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    active ? "bg-blue-soft text-blue" : "text-ink hover:bg-bg"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="my-2 border-t border-line/60" />
            <Link
              href="/talk-sales"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-bg hover:text-ink"
            >
              Talk to sales
            </Link>
            {!signedIn ? (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-bg hover:text-ink"
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
