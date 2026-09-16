import Link from "next/link";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";
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

      <footer className="mt-auto border-t border-line bg-bg py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm space-y-3">
            <Logo size="sm" />
            <p className="text-[13px] leading-relaxed text-muted">
              Company-document call QA for bilingual contact centers — your scorecard, not a generic rubric.
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
      </footer>
    </div>
  );
}
