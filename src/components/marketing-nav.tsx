import Link from "next/link";
import { headers } from "next/headers";
import { Logo } from "@/components/logo";
import { MarketingMobileNav } from "@/components/marketing-mobile-nav";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

export async function MarketingNav({ signedIn }: { signedIn: boolean }) {
  const pathname = (await headers()).get("x-zetro-pathname") || "";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E3EBFB] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Logo size="sm" />

        <div className="hidden items-center gap-8 lg:flex">
          <nav className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-[#F3F6FD] font-semibold text-[#04B6DA] shadow-xs"
                      : "text-[#334155] hover:bg-[#F3F6FD] hover:text-[#061C52]"
                  }`}
                >
                  {active && <span className="h-1.5 w-1.5 bg-[#04B6DA]" />}
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/talk-sales"
              className="px-2.5 py-1 text-[13px] font-medium text-[#334155] transition-colors hover:text-[#061C52]"
            >
              Talk to sales
            </Link>
            {signedIn ? (
              <Link href="/dashboard" className="btn btn-primary text-white text-xs font-semibold px-4 py-2">
                Workspace
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-2.5 py-1 text-[13px] font-medium text-[#334155] transition-colors hover:text-[#061C52]"
                >
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-primary text-white text-xs font-semibold px-4 py-2">
                  Start Free
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
