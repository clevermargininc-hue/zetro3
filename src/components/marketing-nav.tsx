import Link from "next/link";
import { Logo } from "@/components/logo";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-sm">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Logo size="sm" />
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-muted hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/talk-sales"
            className="hidden text-[13px] font-medium text-muted hover:text-ink sm:block"
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
                className="hidden text-[13px] font-medium text-muted hover:text-ink sm:block"
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
    </header>
  );
}
