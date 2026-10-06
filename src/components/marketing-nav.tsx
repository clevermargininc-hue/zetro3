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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
        <Logo size="sm" />

        <div className="hidden items-center gap-8 lg:flex">
          <nav className="flex items-center gap-6">
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
          <div className="flex items-center gap-3">
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
        </div>

        <MarketingMobileNav signedIn={signedIn} pathname={pathname} />
      </div>
    </header>
  );
}
