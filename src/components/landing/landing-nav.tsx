"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const groups = [
  { label: "Products", items: [
    ["/how-it-works", "Call quality auditing", "Your scorecard, supported by conversation evidence."],
    ["/solutions", "Customer intelligence", "Understand repeat calls, unresolved issues and root causes."],
    ["/how-it-works#bilingual", "English & Kiswahili", "Follow both sides of every conversation."],
  ] },
  { label: "Solutions", items: [
    ["/solutions", "Contact center teams", "Connect quality, coaching and customer outcomes."],
    ["/solutions", "Telecom & financial services", "Understand service issues and compliance risks."],
    ["/solutions", "BPO & customer support", "Review performance against each company’s standards."],
  ] },
  { label: "Resources", items: [
    ["/how-it-works", "How Zetro works", "From call recording to a clearer customer journey."],
    ["/about", "About Zetro", "Our approach to conversation intelligence."],
    ["/talk-sales", "Talk to our team", "Discuss your systems, scorecards and workspace."],
  ] },
];

export function LandingNav({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const root = useRef<HTMLElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const close = () => { setOpen(null); setMobile(false); };
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setOpen(null); setMobile(false); } };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { if (open) triggers.current[open]?.focus(); setOpen(null); setMobile(false); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <header className="public-nav" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null); }}>
    <div className="public-nav-inner">
      <Link href="/" className="public-brand" aria-label="Zetro home" onClick={close}><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 5h19a3 3 0 0 1 2 5L13 23h12v-4h5v8a3 3 0 0 1-3 3H5a3 3 0 0 1-2-5L19 12H8v4H2V9a4 4 0 0 1 5-4Z" fill="currentColor"/></svg><span>Zetro</span></Link>
      <button type="button" className="public-mobile-toggle" aria-expanded={mobile} aria-controls="public-navigation" onClick={() => setMobile(!mobile)}>{mobile ? "Close ✕" : "Menu ☰"}</button>
      <nav id="public-navigation" aria-label="Main navigation" className={`public-links ${mobile ? "is-mobile-open" : ""}`}>
        {groups.map((group,index) => <div className="public-nav-group" key={group.label}>
          {index === 2 ? <Link href="/pricing" className="public-pricing" aria-current={pathname === "/pricing" ? "page" : undefined} onClick={close}>Pricing</Link> : null}
          <button ref={el => { triggers.current[group.label] = el; }} type="button" aria-expanded={open === group.label} aria-controls={`public-${group.label}`} onClick={() => setOpen(open === group.label ? null : group.label)} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(group.label); requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>(`#public-${group.label} a`)?.focus()); } }}>{group.label}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></button>
          {open === group.label ? <div id={`public-${group.label}`} className="public-dropdown"><p>{group.label === "Products" ? "Two engines. One clear picture." : group.label === "Solutions" ? "Built around your team" : "Explore Zetro"}</p><ul>{group.items.map(([href,title,note]) => <li key={title}><Link href={href} onClick={close}><span>{title}<i aria-hidden="true">↗</i></span><small>{note}</small></Link></li>)}</ul><Link className="public-dropdown-footer" href={group.label === "Solutions" ? "/solutions" : "/how-it-works"} onClick={close}>Explore {group.label.toLowerCase()} →</Link></div> : null}
        </div>)}
        <div className="public-mobile-actions"><Link href={signedIn ? "/dashboard" : "/login"} onClick={close}>{signedIn ? "Workspace" : "Sign in"}</Link><Link href="/talk-sales" onClick={close}>Request a Demo →</Link></div>
      </nav>
      <div className="public-nav-actions"><Link href={signedIn ? "/dashboard" : "/login"}>{signedIn ? "Workspace" : "Sign in"}</Link><Link href="/talk-sales" className="public-demo">Request a Demo →</Link></div>
    </div>
  </header>;
}
