import Link from "next/link";
import { Logo } from "@/components/logo";
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
    <div className="marketing-shell flex min-h-full flex-col bg-white">
      <MarketingNav signedIn={signedIn} />

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="mt-auto border-t border-line bg-cream py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 sm:flex-row sm:items-start sm:justify-between lg:px-8">
          <div className="max-w-sm space-y-3">
            <Logo size="sm" />
            <p className="text-[13px] leading-relaxed text-muted">
              Score contact-center calls against your scorecard — in English, Kiswahili, or both.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-[13px] sm:grid-cols-3">
            <div className="space-y-2">
              <p className="font-semibold text-ink">Product</p>
              <Link href="/how-it-works" className="block text-muted hover:text-ink">
                How it works
              </Link>
              <Link href="/solutions" className="block text-muted hover:text-ink">
                Solutions
              </Link>
              <Link href="/pricing" className="block text-muted hover:text-ink">
                Pricing
              </Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-ink">Company</p>
              <Link href="/about" className="block text-muted hover:text-ink">
                About
              </Link>
              <Link href="/talk-sales" className="block text-muted hover:text-ink">
                Talk to sales
              </Link>
              <a
                href={salesMailto("Zetro — contract or sales deal")}
                className="inline-flex items-center gap-1.5 font-semibold text-blue hover:underline text-[13px]"
              >
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{SALES_EMAIL}</span>
              </a>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-ink">Account</p>
              <Link href="/login" className="block text-muted hover:text-ink">
                Sign in
              </Link>
              <Link href="/signup" className="block text-muted hover:text-ink">
                Get started
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col gap-2 border-t border-line/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] leading-relaxed text-muted">
              Zetro is a product of Clevermargins Software Business Solutions (CSBS).
            </p>
            <p className="text-[12px] text-muted">© {new Date().getFullYear()} CSBS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
