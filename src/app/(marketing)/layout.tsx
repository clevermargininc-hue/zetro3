import Link from "next/link";
import { Logo } from "@/components/logo";
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
    <div className="flex min-h-full flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-line bg-white">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo size="sm" />
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex">
            <Link href="/about" className="text-[13px] font-medium text-muted hover:text-ink">
              About
            </Link>
            <Link href="/how-it-works" className="text-[13px] font-medium text-muted hover:text-ink">
              How it works
            </Link>
            <Link href="/solutions" className="text-[13px] font-medium text-muted hover:text-ink">
              Solutions
            </Link>
            <Link href="/pricing" className="text-[13px] font-medium text-muted hover:text-ink">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/talk-sales" className="hidden text-[13px] font-medium text-muted hover:text-ink sm:block">
              Talk to sales
            </Link>
            {signedIn ? (
              <Link href="/dashboard" className="btn btn-blue">
                Open workspace
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden text-[13px] font-medium text-muted hover:text-ink sm:block">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-blue">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="mt-auto border-t border-line bg-white py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo size="sm" />
            <p className="mt-4 text-[13px] leading-relaxed text-muted">
              Quality intelligence for bilingual contact centers in East Africa and beyond.
            </p>
          </div>
          <div>
            <h4 className="text-[12px] font-medium uppercase tracking-wider text-muted">Product</h4>
            <ul className="mt-3 space-y-2 text-[13px] text-muted">
              <li>
                <Link href="/how-it-works" className="hover:text-ink">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-ink">
                  Solutions
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-ink">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[12px] font-medium uppercase tracking-wider text-muted">Company</h4>
            <ul className="mt-3 space-y-2 text-[13px] text-muted">
              <li>
                <Link href="/about" className="hover:text-ink">
                  About
                </Link>
              </li>
              <li>
                <Link href="/talk-sales" className="hover:text-ink">
                  Contact sales
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[12px] font-medium uppercase tracking-wider text-muted">Legal</h4>
            <ul className="mt-3 space-y-2 text-[13px] text-muted">
              <li>
                <span className="cursor-not-allowed">Privacy policy</span>
              </li>
              <li>
                <span className="cursor-not-allowed">Terms of service</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-line px-6 pt-6">
          <p className="text-[13px] text-muted">
            &copy; {new Date().getFullYear()} Zetro Quality Intelligence. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
