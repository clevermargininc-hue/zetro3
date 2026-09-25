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
            <p className="text-[13px] font-semibold leading-relaxed text-ink">
              Score contact-center calls against your scorecard — in English, Kiswahili, or both.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-[13px] sm:grid-cols-3">
            <div className="space-y-2">
              <p className="font-semibold text-ink">Product</p>
              <Link href="/how-it-works" className="block font-semibold text-ink hover:text-blue">
                How it works
              </Link>
              <Link href="/solutions" className="block font-semibold text-ink hover:text-blue">
                Solutions
              </Link>
              <Link href="/pricing" className="block font-semibold text-ink hover:text-blue">
                Pricing
              </Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-ink">Company</p>
              <Link href="/about" className="block font-semibold text-ink hover:text-blue">
                About
              </Link>
              <Link href="/talk-sales" className="block font-semibold text-ink hover:text-blue">
                Talk to sales
              </Link>
              <a
                href={salesMailto("Zetro — contract or sales deal")}
                className="block break-all font-semibold text-ink hover:text-blue"
              >
                {SALES_EMAIL}
              </a>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-ink">Account</p>
              <Link href="/login" className="block font-semibold text-ink hover:text-blue">
                Sign in
              </Link>
              <Link href="/signup" className="block font-semibold text-ink hover:text-blue">
                Get started
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col gap-2 border-t border-line/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] font-semibold leading-relaxed text-ink">
              Zetro is a product of Clevermargins Software Business Solutions (CSBS).
            </p>
            <p className="text-[12px] font-semibold text-ink">© {new Date().getFullYear()} CSBS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
