"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Menu = "product" | "solutions" | null;
type MenuColumn = { label: string; items: readonly { href: string; title: string; note?: string }[] };

const productColumns: readonly MenuColumn[] = [
  { label: "Quality auditing", items: [
    { href: "/#in-action", title: "Weighted call audits", note: "Score every conversation against your rules." },
    { href: "/#capabilities", title: "Scorecard ingestion", note: "Use your Excel, Word, or PDF standards." },
    { href: "/#coaching", title: "Evidence & coaching", note: "Move from timestamped proof to action." },
  ]},
  { label: "Customer intelligence", items: [
    { href: "/how-it-works", title: "Repeat customer detection", note: "Know who called again and when." },
    { href: "/how-it-works", title: "Issue journey", note: "Same unresolved issue, reopened issue, or new need." },
    { href: "/solutions", title: "Root cause intelligence", note: "See system, process, provider, or agent blockers." },
  ]},
  { label: "Platform", items: [
    { href: "/#bilingual", title: "English + Kiswahili", note: "Understand code-switched conversations." },
    { href: "/how-it-works", title: "Company data", note: "Ground analysis in your products and services." },
    { href: "/#security", title: "Security & privacy", note: "Tenant isolation and encrypted customer data." },
  ]},
];
const solutionColumns: readonly MenuColumn[] = [
  { label: "Teams", items: [
    { href: "/solutions", title: "Quality assurance" }, { href: "/solutions", title: "Operations leadership" },
    { href: "/solutions", title: "Customer experience" }, { href: "/solutions", title: "Contact center agents" },
  ]},
  { label: "Industries", items: [
    { href: "/solutions", title: "Telecom & mobile money" }, { href: "/solutions", title: "Banking & financial services" },
    { href: "/solutions", title: "BPO & outsourcing" }, { href: "/solutions", title: "E-commerce & logistics" },
  ]},
];

export function MarketingDesktopNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState<Menu>(null);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => { const target=event.target as Element;if (!navRef.current?.contains(target) && !target.closest?.("[data-mega-panel]")) setOpen(null); };
    const keyboard = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", keyboard); };
  }, []);

  const dropdown = (id: Exclude<Menu, null>, label: string, columns: readonly MenuColumn[]) => (
    <div>
      <button type="button" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id} aria-controls={`${id}-menu`} className={`flex items-center gap-2 py-4 text-[14px] font-medium transition-colors ${open === id ? "text-navy" : "text-neutral-700 hover:text-navy"}`}>
        {label}<svg className={`size-3 transition-transform ${open === id ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor"><path d="m2.5 4.5 3.5 3 3.5-3" /></svg>
      </button>
      {open === id && typeof document !== "undefined" ? createPortal(<div data-mega-panel id={`${id}-menu`} className={`mega-panel fixed left-1/2 top-[65px] z-[60] border border-black/10 bg-[#f7f7f2] px-11 py-9 font-sans shadow-[0_24px_60px_rgba(18,43,49,.16)] ${columns.length === 3 ? "w-[min(1120px,calc(100vw-48px))]" : "w-[min(880px,calc(100vw-48px))]"}`}>
        <div className={`grid ${columns.length === 3 ? "grid-cols-3 gap-14" : "grid-cols-2 gap-16"}`}>
          {columns.map(column => <section key={column.label}><p className="mb-2 border-b border-black/[.1] pb-3 text-[10px] font-bold uppercase tracking-[.15em] text-neutral-500">{column.label}</p><ul>{column.items.map(item => <li key={`${item.href}-${item.title}`}><Link href={item.href} onClick={() => setOpen(null)} className="group block border-b border-black/[.055] py-4 last:border-0"><span className="flex items-center justify-between gap-5 text-[15px] font-semibold leading-5 tracking-[-.01em] text-[#19363b] group-hover:text-blue">{item.title}<i className="text-xs not-italic opacity-0 transition-opacity group-hover:opacity-100">↗</i></span>{item.note ? <span className="mt-1.5 block max-w-[280px] text-[11px] leading-[1.55] text-neutral-600">{item.note}</span> : null}</Link></li>)}</ul></section>)}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-black/[.09] pt-5 text-[11px]"><span className="font-medium text-neutral-600">Quality performance and customer outcomes, connected.</span><Link href={id === "product" ? "/how-it-works" : "/solutions"} onClick={() => setOpen(null)} className="font-semibold text-blue">Explore {label.toLowerCase()} →</Link></div>
      </div>, document.body) : null}
    </div>
  );

  return <nav ref={navRef} className="mega-nav hidden items-center justify-center gap-12 lg:flex xl:gap-16">
    {dropdown("product", "Products", productColumns)}{dropdown("solutions", "Solutions", solutionColumns)}
    {[{ href: "/pricing", label: "Pricing" }, { href: "/about", label: "About" }].map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={`whitespace-nowrap text-[14px] ${pathname === link.href ? "font-semibold text-navy" : "font-medium text-neutral-700 hover:text-navy"}`}>{link.label}</Link>)}
  </nav>;
}
