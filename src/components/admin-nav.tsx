"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Analytics" },
  { href: "/admin/companies", label: "Companies" },
];

function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`) || (href === "/admin/companies" && pathname.startsWith("/admin/workspaces"));
}

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {TABS.map((tab) => {
        const active = isActive(tab.href, pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              active ? "bg-[#04B6DA] text-white font-semibold" : "text-[#E3EBFB] hover:text-white hover:bg-[#039EBE]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
