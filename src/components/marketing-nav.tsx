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
    <header className="sticky top-0 z-50 border-b border-black/[0.05] bg-white/75 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-6 py-3.5 lg:grid-cols-[1fr_auto_1fr]">
        <div className="justify-self-start">
          <Logo size="sm" />
        </div>

        <nav className="hidden items-center justify-center gap-8 lg:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap text-[13px] transition-colors ${
                  active
                    ? "font-semibold text-[#0f172a]"
                    : "font-normal text-neutral-600 hover:text-[#0f172a]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center justify-end gap-5 justify-self-end lg:flex">
          <Link
            href="/talk-sales"
            className="whitespace-nowrap text-[13px] font-normal text-neutral-600 transition-colors hover:text-[#0f172a]"
          >
            Talk to sales
          </Link>
          {signedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2 text-[13px] font-medium text-white shadow-xs transition-all duration-200 hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98]"
            >
              Open workspace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap text-[13px] font-normal text-neutral-600 transition-colors hover:text-[#0f172a]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2 text-[13px] font-medium text-white shadow-xs transition-all duration-200 hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98]"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <div className="justify-self-end lg:hidden">
          <MarketingMobileNav signedIn={signedIn} pathname={pathname}>
            {signedIn ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-black px-3.5 py-1.5 text-[12px] font-medium text-white"
              >
                Workspace
              </Link>
            ) : (
              <Link
                href="/signup"
                className="rounded-full bg-black px-3.5 py-1.5 text-[12px] font-medium text-white"
              >
                Start free
              </Link>
            )}
          </MarketingMobileNav>
        </div>
      </div>
    </header>
  );
}
