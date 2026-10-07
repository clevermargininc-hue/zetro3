import Link from "next/link";
import { ZetroMark } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    signedIn = false;
  }

  return (
    <div className="marketing-shell flex min-h-screen flex-col bg-white text-[#061C52] antialiased selection:bg-[#04B6DA] selection:text-white">
      <MarketingNav signedIn={signedIn} />

      <main className="flex flex-1 flex-col">{children}</main>

      {/* Modern Minimalist Footer using enterprise cobalt blue */}
      <footer className="mt-auto border-t border-[#039EBE] bg-[#061C52] text-white pt-16 pb-12">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-5 lg:gap-12">
            {/* Brand column */}
            <div className="md:col-span-2 space-y-4">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <ZetroMark className="h-7 w-7 rounded-none" />
                <span className="font-brand text-[18px] font-bold tracking-tight text-white">
                  Zetro
                </span>
              </Link>
              <p className="max-w-sm text-[13px] leading-relaxed text-[#E3EBFB]">
                Bilingual Quality Assurance platform for East African contact centers. Audit 100% of customer calls against your exact scorecards and compliance policies.
              </p>

              {/* Social icons */}
              <div className="flex items-center gap-3 pt-2 text-[#E3EBFB]">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-none p-1.5 transition-colors hover:bg-[#039EBE] hover:text-white"
                  aria-label="Twitter"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-none p-1.5 transition-colors hover:bg-[#039EBE] hover:text-white"
                  aria-label="LinkedIn"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                <a
                  href="mailto:Clevermargininc@gmail.com"
                  className="rounded-none p-1.5 transition-colors hover:bg-[#039EBE] hover:text-white"
                  aria-label="Email"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-white">Product</p>
              <ul className="mt-3.5 space-y-2.5 text-[13px] text-[#E3EBFB]">
                <li>
                  <Link href="/how-it-works" className="transition-colors hover:text-white">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link href="/solutions" className="transition-colors hover:text-white">
                    Solutions
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="transition-colors hover:text-white">
                    Pricing &amp; Plans
                  </Link>
                </li>
                <li>
                  <Link href="/talk-sales" className="transition-colors hover:text-white">
                    Enterprise SLA
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-white">Company</p>
              <ul className="mt-3.5 space-y-2.5 text-[13px] text-[#E3EBFB]">
                <li>
                  <Link href="/about" className="transition-colors hover:text-white">
                    About Zetro
                  </Link>
                </li>
                <li>
                  <Link href="/talk-sales" className="transition-colors hover:text-white">
                    Talk to sales
                  </Link>
                </li>
                <li>
                  <a
                    href={salesMailto("Zetro Enterprise Inquiry")}
                    className="transition-colors hover:text-white"
                  >
                    Contact support
                  </a>
                </li>
                <li>
                  <span className="inline-flex items-center gap-1.5 text-[#E3EBFB]">
                    <span>Dar es Salaam · Nairobi</span>
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-white">Account</p>
              <ul className="mt-3.5 space-y-2.5 text-[13px] text-[#E3EBFB]">
                <li>
                  <Link href="/login" className="transition-colors hover:text-white">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="transition-colors hover:text-white">
                    Start free trial
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="transition-colors hover:text-white">
                    Open workspace
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar with Status Badge */}
          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[#039EBE] pt-7 text-[12px] text-[#E3EBFB] sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-none border border-[#039EBE] bg-[#039EBE] px-2.5 py-0.5 text-[11px] font-medium text-white">
                <span className="h-1.5 w-1.5 rounded-none bg-[#15803D] animate-pulse" />
                All systems operational
              </span>
              <span className="text-[#039EBE]">|</span>
              <span>© {new Date().getFullYear()} Zetro Inc. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-5 text-[#E3EBFB]">
              <span className="hover:text-white cursor-pointer">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer">Terms &amp; Conditions</span>
              <span className="hover:text-white cursor-pointer">Security Overview</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
