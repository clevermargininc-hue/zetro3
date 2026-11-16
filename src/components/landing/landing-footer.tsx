"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";

export function LandingFooter() {
  return (
    <footer className="bg-[#08162E] text-slate-400 border-t border-blue-900/40 pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Columns */}
        <div className="grid grid-cols-2 gap-10 md:grid-cols-12 lg:gap-8 items-start">
          {/* Column 1: Brand & Tagline */}
          <div className="col-span-2 md:col-span-4 lg:col-span-3 text-left">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#175CD3] to-[#2563EB] shadow-md shadow-blue-900/40">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path
                    d="M4 6.5h11l-8.5 11H20"
                    stroke="currentColor"
                    strokeWidth="2.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-xl font-bold tracking-tight text-white font-sans">
                Zetro
              </span>
            </Link>
            <p className="mt-3 text-xs text-slate-400 font-normal">
              Every Conversation. Understood.
            </p>
          </div>

          {/* Column 2: Product */}
          <div className="col-span-1 md:col-span-2 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Product
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  Call QA
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  Analytics
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-white transition-colors">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Solutions */}
          <div className="col-span-1 md:col-span-2 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Solutions
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/solutions" className="hover:text-white transition-colors">
                  Contact Centers
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-white transition-colors">
                  Sales Teams
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-white transition-colors">
                  Customer Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Resources */}
          <div className="col-span-1 md:col-span-2 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Resources
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/talk-sales" className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Request a Demo & Socials */}
          <div className="col-span-2 md:col-span-2 lg:col-span-3 flex flex-col items-start lg:items-end gap-5">
            <Link
              href="/talk-sales"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#175CD3] px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-900/40 transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02]"
            >
              <span>Request a Demo</span>
              <ArrowRight className="h-[13px] w-[13px]" />
            </Link>

            {/* Social Icons matching reference image */}
            <div className="flex items-center gap-4 text-slate-400">
              {/* LinkedIn */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <BrandIcon brand="linkedin" size={17} variant="mark" />
              </a>

              {/* X / Twitter */}
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
                aria-label="X Twitter"
              >
                <BrandIcon brand="x" size={15} variant="mark" />
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
                aria-label="YouTube"
              >
                <BrandIcon brand="youtube" size={18} variant="mark" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Hairline Legal Bar */}
        <div className="mt-14 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2025 Zetro. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-slate-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-slate-400 transition-colors">
              Terms of Service
            </Link>
            <Link href="/about" className="hover:text-slate-400 transition-colors">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
