import Link from "next/link";
import { headers } from "next/headers";
import { Logo } from "@/components/logo";
import { MarketingMobileNav } from "@/components/marketing-mobile-nav";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
] as const;

export async function MarketingNav({ signedIn }: { signedIn: boolean }) {
  const pathname = (await headers()).get("x-zetro-pathname") || "";

  return (
    <header className="relative sticky top-0 z-50 border-b border-line/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-6 py-3.5 lg:grid-cols-[1fr_auto_1fr]">
        <div className="justify-self-start">
          <Logo size="sm" />
        </div>

        <nav className="hidden items-center justify-center gap-7 lg:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap text-[13px] font-semibold transition-colors ${
                  active ? "text-blue" : "text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center justify-end gap-3 justify-self-end lg:flex">
          <Link
            href="/talk-sales"
            className="whitespace-nowrap text-[13px] font-semibold text-muted transition-colors hover:text-ink"
          >
            Talk to sales
          </Link>
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-blue">
              Open workspace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap text-[13px] font-semibold text-muted transition-colors hover:text-ink"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-blue">
                Get started
              </Link>
            </>
          )}
        </div>

        <div className="justify-self-end lg:hidden">
          <MarketingMobileNav signedIn={signedIn} pathname={pathname}>
            {signedIn ? (
              <Link href="/dashboard" className="btn btn-blue px-3 py-1.5 text-[12px]">
                Workspace
              </Link>
            ) : (
              <Link href="/signup" className="btn btn-blue px-3 py-1.5 text-[12px]">
                Start free
              </Link>
            )}
          </MarketingMobileNav>
        </div>
      </div>
    </header>
  );
}
