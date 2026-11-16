"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function ZetroBrandGlyph({
  size = 30,
  invert = false,
}: {
  size?: number;
  invert?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="36" height="36" rx="10" fill={invert ? "#2F6BFF" : "#0A1A3F"} />
      <path
        d="M9.5 11.5H22.5L13 24.5H26.5"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="23.5"
        y="9.5"
        width="3"
        height="7"
        rx="1.5"
        fill={invert ? "#DCE6FF" : "#2F6BFF"}
      />
      <rect
        x="27.5"
        y="11.5"
        width="3"
        height="5"
        rx="1.5"
        fill={invert ? "#DCE6FF" : "#2F6BFF"}
      />
    </svg>
  );
}

const HOME_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/talk-sales", label: "Book a demo" },
] as const;

const SUBPAGE_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/talk-sales", label: "Book a demo" },
] as const;

export function ZetroPublicNav({
  signedIn = false,
  isHome = false,
}: {
  signedIn?: boolean;
  isHome?: boolean;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function closeMenu() {
    menuRef.current?.removeAttribute("open");
  }

  const navLinks = isHome || pathname === "/" ? HOME_LINKS : SUBPAGE_LINKS;

  return (
    <header className="z-nav" data-z-nav data-scrolled={scrolled ? "true" : "false"}>
      <div className="z-nav-inner">
        <Link href="/" className="z-brand" aria-label="Zetro home" onClick={closeMenu}>
          <ZetroBrandGlyph size={30} />
          <span className="z-brand-name">Zetro</span>
        </Link>

        <nav className="z-nav-links" aria-label="Primary">
          {navLinks.map((item) => {
            const active = !item.href.startsWith("#") && pathname === item.href;
            return item.href.startsWith("#") ? (
              <a key={item.href} href={item.href} className="z-nav-link">
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="z-nav-link"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="z-nav-actions">
          <Link
            href={signedIn ? "/dashboard" : "/login"}
            className="z-btn z-btn-outline z-nav-login"
          >
            {signedIn ? "Dashboard" : "Log in"}
          </Link>
          <Link href="/signup" className="z-btn z-btn-solid">
            Get started
          </Link>

          <details className="z-menu" ref={menuRef} data-z-menu>
            <summary aria-label="Toggle navigation menu">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <nav className="z-menu-panel" aria-label="Mobile navigation">
              <Link href="/" onClick={closeMenu}>
                Overview
              </Link>
              <Link href="/how-it-works" onClick={closeMenu}>
                How it works
              </Link>
              <Link href="/solutions" onClick={closeMenu}>
                Solutions
              </Link>
              <Link href="/pricing" onClick={closeMenu}>
                Pricing
              </Link>
              <Link href="/about" onClick={closeMenu}>
                About us
              </Link>
              <Link href="/talk-sales" onClick={closeMenu}>
                Book a demo
              </Link>
              <Link href={signedIn ? "/dashboard" : "/login"} onClick={closeMenu}>
                {signedIn ? "Dashboard" : "Log in"}
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function ZetroPublicCta({
  eyebrow,
  title = "Hear what 100% of your calls are telling you.",
  body = "Upload your first 50 Swahili or English recordings today and see every score, compliance flag, and coaching note in minutes.",
  primaryHref = "/signup",
  primaryLabel = "Start 50-call free trial",
  secondaryHref = "/talk-sales",
  secondaryLabel = "Or book a live walkthrough with our Dar es Salaam team →",
}: {
  eyebrow?: string;
  title?: string;
  body?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="z-cta-shell">
      <section className="z-cta" aria-labelledby="cta-heading">
        {eyebrow ? (
          <span
            className="z-eyebrow"
            style={{
              marginBottom: "18px",
              background: "rgb(255 255 255 / 0.1)",
              borderColor: "rgb(255 255 255 / 0.2)",
              color: "#DCE6FF",
            }}
          >
            {eyebrow}
          </span>
        ) : null}
        <h2 id="cta-heading" className="z-h2">
          {title}
        </h2>
        <p>{body}</p>
        <div className="z-cta-actions">
          <Link href={primaryHref} className="z-btn-pill">
            <span>{primaryLabel}</span>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <Link href={secondaryHref} className="z-cta-link">
            {secondaryLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}

export function ZetroPublicFooter({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <footer className="z-footer">
      <div className="z-container">
        <div className="z-footer-grid">
          <div className="z-footer-brand">
            <Link href="/" className="z-brand" aria-label="Zetro home">
              <ZetroBrandGlyph size={28} invert />
              <span className="z-brand-name" style={{ color: "#FFFFFF" }}>
                Zetro
              </span>
            </Link>
            <p>
              We build AI quality assurance and customer intelligence for contact centers in Tanzania and East Africa.
            </p>
          </div>

          <div>
            <h2>Platform</h2>
            <ul>
              <li>
                <Link href="/#how-it-works">How it works</Link>
              </li>
              <li>
                <Link href="/#features">Auto scoring</Link>
              </li>
              <li>
                <Link href="/#features">Compliance detection</Link>
              </li>
              <li>
                <Link href="/#platform">Supervisor dashboard</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2>Sectors</h2>
            <ul>
              <li>
                <Link href="/solutions#banks">Banks &amp; Microfinance</Link>
              </li>
              <li>
                <Link href="/solutions#telecoms">Telecoms &amp; Mobile Money</Link>
              </li>
              <li>
                <Link href="/solutions#insurers-hospitals">Insurers &amp; Hospitals</Link>
              </li>
              <li>
                <Link href="/solutions#saccos">SACCOs &amp; Public Desks</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2>Resources</h2>
            <ul>
              <li>
                <Link href="/how-it-works#steps">Pipeline guide</Link>
              </li>
              <li>
                <Link href="/pricing#calculator">TZS tariff calculator</Link>
              </li>
              <li>
                <Link href="/#faq">FAQ</Link>
              </li>
              <li>
                <Link href="/talk-sales">Book a demo</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2>Company</h2>
            <ul>
              <li>
                <Link href="/about">About us</Link>
              </li>
              <li>
                <Link href="/talk-sales">Contact sales</Link>
              </li>
              <li>
                <Link href={signedIn ? "/dashboard" : "/login"}>
                  {signedIn ? "Workspace dashboard" : "Sign in"}
                </Link>
              </li>
              <li>
                <Link href="/signup">Start free trial</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="z-footer-bottom">
          <span>
            © {new Date().getFullYear()} Clevermargins Software Business Solutions (CSBS) · Dar es Salaam, Tanzania.
          </span>
          <span>TZS Invoiced · Swahili + English Native</span>
        </div>
      </div>
    </footer>
  );
}

