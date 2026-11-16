"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { CompanyIntelligenceSettings } from "@/components/company-intelligence-settings";
import { DataConnectionsSettings } from "@/components/data-connections-settings";
import type { CompanyCatalogue } from "@/lib/company-catalogue";
import type { CompanyConnectionSummary } from "@/lib/company-intelligence-bridge";

type View = "catalogue" | "connections";

export function CompanyDataSettings() {
  const [view, setView] = useState<View>("catalogue");
  const [snapshot, setSnapshot] = useState<{
    catalogue: CompanyCatalogue | null;
    connectionSummary: CompanyConnectionSummary | null;
  }>({ catalogue: null, connectionSummary: null });

  const refreshSnapshot = useCallback(async () => {
    try {
      const res = await fetch("/api/company-intelligence/catalogue", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setSnapshot({
        catalogue: json.catalogue || null,
        connectionSummary: json.connectionSummary || null,
      });
    } catch {
      // Ignore background refresh error
    }
  }, []);

  const handleChildSnapshot = useCallback(
    (payload: { catalogue: CompanyCatalogue; connectionSummary: CompanyConnectionSummary | null }) => {
      setSnapshot(payload);
    },
    [],
  );

  const cat = snapshot.catalogue;
  const stats = snapshot.connectionSummary;
  const activeCatalogueCount = cat
    ? [
        ...cat.products.filter((p) => p.isActive),
        ...cat.services.filter((s) => s.isActive),
        ...cat.serviceAreas.filter((a) => a.isActive),
        ...cat.issueCategories.filter((c) => c.isActive),
      ].length
    : null;

  const coverageValue = stats
    ? stats.totalIssues > 0
      ? `${stats.classifiedIssuesCount}/${stats.totalIssues} issues`
      : "No issues yet"
    : "Loading…";

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-[#E3E9F5] bg-white shadow-sm">
        <div className="bg-[#0A1A3F] px-6 py-7 text-white sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-emerald-300">
                Zetro knowledge layer
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Company data
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Define what your company sells and connect external systems. Zetro shares this live
                catalogue with Call Scoring and Customer Intelligence to classify issues accurately.
              </p>
            </div>
            <Link
              href="/customers"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Open Customer Intelligence →
            </Link>
          </div>

          <div className="mt-6 grid gap-3 text-xs sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                1. Connected sources
              </p>
              <p className="mt-1 font-display text-sm font-bold text-white tabular-nums">
                {stats ? `${stats.activeIntegrationsCount} active / ${stats.integrationsCount}` : "Loading…"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                2. Active catalogue
              </p>
              <p className="mt-1 font-display text-sm font-bold text-white tabular-nums">
                {activeCatalogueCount !== null ? `${activeCatalogueCount} entries` : "Loading…"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                3. Issue coverage
              </p>
              <p className="mt-1 font-display text-sm font-bold text-white tabular-nums">
                {coverageValue}
              </p>
            </div>
            <Link
              href="/customers?category=unclassified"
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 transition hover:bg-white/10"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                4. Intelligence queue →
              </p>
              <p className="mt-1 font-display text-sm font-bold text-white tabular-nums">
                {stats ? `${stats.unclassifiedIssuesCount} unclassified` : "Loading…"}
              </p>
            </Link>
          </div>
        </div>

        <div className="grid border-t border-[#E3E9F5] sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setView("catalogue")}
            aria-pressed={view === "catalogue"}
            className={`px-6 py-5 text-left transition ${
              view === "catalogue"
                ? "bg-[#EEF3FF] text-[#2459E8]"
                : "bg-white text-[#5A6882] hover:bg-[#F8FAFF]"
            }`}
          >
            <span className="block text-sm font-semibold">Catalogue</span>
            <span className="mt-1 block text-xs opacity-80">
              Products, services, service areas, and issue categories
            </span>
          </button>
          <button
            type="button"
            onClick={() => setView("connections")}
            aria-pressed={view === "connections"}
            className={`border-t border-[#E3E9F5] px-6 py-5 text-left transition sm:border-l sm:border-t-0 ${
              view === "connections"
                ? "bg-[#EEF3FF] text-[#2459E8]"
                : "bg-white text-[#5A6882] hover:bg-[#F8FAFF]"
            }`}
          >
            <span className="block text-sm font-semibold">Sources &amp; sync</span>
            <span className="mt-1 block text-xs opacity-80">
              Connect read-only REST APIs and sync recordings or catalogue entries
            </span>
          </button>
        </div>
      </div>

      {view === "catalogue" ? (
        <CompanyIntelligenceSettings embedded onSyncSnapshot={handleChildSnapshot} />
      ) : (
        <DataConnectionsSettings
          embedded
          onOpenCatalogue={() => setView("catalogue")}
          onConnectionsChanged={() => void refreshSnapshot()}
        />
      )}
    </section>
  );
}
