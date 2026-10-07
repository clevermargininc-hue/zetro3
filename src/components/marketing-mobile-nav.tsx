"use client";

import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
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
        <Link href="/dashboard" className="btn btn-primary text-white text-xs font-semibold px-3 py-1.5 rounded-none">
          Workspace
        </Link>
      ) : (
        <Link href="/signup" className="btn btn-primary text-white text-xs font-semibold px-3 py-1.5 rounded-none">
          Start Free
        </Link>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-none border border-[#E3EBFB] bg-[#F3F6FD] text-[#061C52] transition-colors hover:bg-[#E3EBFB]"
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
        <div className="absolute inset-x-0 top-full border-b border-[#E3EBFB] bg-white px-6 py-5 shadow-xl">
          <nav className="flex flex-col gap-2">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-none px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-[#F3F6FD] font-semibold text-[#04B6DA]" : "text-[#334155] hover:bg-[#F3F6FD] hover:text-[#061C52]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="my-2 border-t border-[#E3EBFB]" />
            <Link
              href="/talk-sales"
              onClick={() => setOpen(false)}
              className="rounded-none px-3 py-2 text-sm font-medium text-[#334155] hover:bg-[#F3F6FD] hover:text-[#061C52]"
            >
              Talk to sales
            </Link>
            {!signedIn ? (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-none px-3 py-2 text-sm font-medium text-[#334155] hover:bg-[#F3F6FD] hover:text-[#061C52]"
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
