"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  FileWarning,
  Layers,
  Plug,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Users,
  X,
} from "lucide-react";
import type {
  CustomerDirectoryItem,
  CustomerIntelligenceFilters,
  CustomerIntelligenceOverview,
  IssueSummaryItem,
  TimelineCallEntry,
} from "@/lib/customer-journey-service";
import type { CompanyCatalogue } from "@/lib/company-catalogue";
import {
  aggregateIssueProductsAndServices,
  buildCustomerIntelligenceQueryParams,
  type CustomerBoardFilterState,
} from "@/lib/company-intelligence-utils";
import {
  IssueStatusBadge,
  MatchClassificationBadge,
  ResolutionConfirmationBadge,
  RiskLevelBadge,
  RootCauseBadge,
  formatCategoryLabel,
} from "@/components/customer-intelligence-badges";
import { IntegrationBrandIcon } from "@/components/brand-icon";

interface Props {
  initialData: CustomerIntelligenceOverview;
  initialFilters?: CustomerIntelligenceFilters;
  initialFocusCustomerId?: string;
  initialFocusIssueId?: string;
}

type BoardScope = "repeat" | "all_customers" | "all_issues" | "needs_review";

interface ClassificationDrawerPayload {
  catalogue: CompanyCatalogue;
  issue: IssueSummaryItem;
  events: Array<{
    id: string;
    classification_status?: string;
    classification_confidence?: number;
    classified_by?: string;
    notes?: string | null;
    created_at?: string;
  }>;
}

function formatUtcDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function hasIssueCatalogueTag(issue: IssueSummaryItem): boolean {
  return Boolean(
    issue.product_id ||
      issue.service_id ||
      issue.service_area_id ||
      issue.catalogue_issue_category_id ||
      (issue.catalogue_products && issue.catalogue_products.length > 0) ||
      (issue.catalogue_services && issue.catalogue_services.length > 0) ||
      (issue.catalogue_areas && issue.catalogue_areas.length > 0),
  );
}

function normalizeInitialFilters(f?: CustomerIntelligenceFilters): CustomerBoardFilterState {
  return {
    search: f?.search || "",
    category: f?.category || "",
    product: f?.product || "",
    service: f?.service || "",
    serviceArea: f?.serviceArea || "",
    department: f?.department || "",
    status: f?.status || "",
    rootCause: f?.rootCause || "",
    needsReviewOnly: Boolean(f?.needsReviewOnly),
    unresolvedOnly: Boolean(f?.unresolvedOnly),
  };
}

function deriveInitialScope(
  initialData: CustomerIntelligenceOverview,
  filters: CustomerBoardFilterState,
  initialFocusIssueId?: string,
): BoardScope {
  if (initialFocusIssueId) return "all_issues";
  if (filters.needsReviewOnly) return "needs_review";
  if (
    filters.product ||
    filters.service ||
    filters.serviceArea ||
    filters.category ||
    filters.status ||
    filters.rootCause ||
    filters.unresolvedOnly
  ) {
    return "all_issues";
  }
  const hasReturnCustomers = initialData.customers.items.some((c) => c.total_calls >= 2);
  if (!hasReturnCustomers && initialData.issues.items.length > 0) {
    return "all_issues";
  }
  return "repeat";
}

function buildRepeatCustomerRows(
  customers: CustomerDirectoryItem[],
  interactions: TimelineCallEntry[],
  issues: IssueSummaryItem[],
) {
  const callsByCustomer = new Map<string, TimelineCallEntry[]>();
  for (const call of interactions) {
    const key = call.customer_id;
    if (!key) continue;
    const list = callsByCustomer.get(key) || [];
    list.push(call);
    callsByCustomer.set(key, list);
  }

  const issuesByCustomer = new Map<string, IssueSummaryItem[]>();
  for (const issue of issues) {
    const list = issuesByCustomer.get(issue.customer_id) || [];
    list.push(issue);
    issuesByCustomer.set(issue.customer_id, list);
  }

  const seenCustomerIds = new Set<string>();
  const rows: Array<{
    customer: CustomerDirectoryItem;
    calls: TimelineCallEntry[];
    issues: IssueSummaryItem[];
  }> = [];

  for (const customer of customers) {
    const custCalls = (callsByCustomer.get(customer.id) || []).sort(
      (a, b) => new Date(b.call_date).getTime() - new Date(a.call_date).getTime(),
    );
    if (customer.total_calls < 2 && custCalls.length < 2) continue;
    seenCustomerIds.add(customer.id);
    rows.push({
      customer,
      calls: custCalls,
      issues: issuesByCustomer.get(customer.id) || [],
    });
  }

  // Fallback grouping if pagination truncated a repeat customer in directory
  for (const [custId, custCalls] of callsByCustomer.entries()) {
    if (seenCustomerIds.has(custId) || custCalls.length < 2) continue;
    const sorted = [...custCalls].sort(
      (a, b) => new Date(b.call_date).getTime() - new Date(a.call_date).getTime(),
    );
    const custIssues = issuesByCustomer.get(custId) || [];
    rows.push({
      customer: {
        id: custId,
        primary_identifier: custIssues[0]?.customer_phone || custId.slice(0, 8),
        display_label: custIssues[0]?.customer_label || `Customer ${custId.slice(0, 6)}`,
        normalized_phone: custIssues[0]?.customer_phone || null,
        external_customer_id: null,
        country_code: null,
        total_calls: sorted.length,
        repeat_call_count: Math.max(0, sorted.length - 1),
        recurring_issue_count: custIssues.filter((i) => i.total_calls >= 2).length,
        new_issue_count: custIssues.length,
        unresolved_issue_count: custIssues.filter(
          (i) => i.status !== "resolved" && i.status !== "closed",
        ).length,
        resolved_issue_count: custIssues.filter(
          (i) => i.status === "resolved" || i.status === "closed",
        ).length,
        reopened_issue_count: custIssues.filter((i) => i.reopened_count > 0).length,
        avg_hours_between_calls: null,
        top_issue_categories: Array.from(new Set(custIssues.map((i) => i.category))).slice(0, 3),
        risk_level: "medium",
        needs_identity_review: false,
        first_interaction_at: sorted[sorted.length - 1]?.call_date || null,
        last_interaction_at: sorted[0]?.call_date || null,
      },
      calls: sorted,
      issues: custIssues,
    });
  }

  return rows.sort((a, b) => {
    const tA = a.customer.last_interaction_at ? new Date(a.customer.last_interaction_at).getTime() : 0;
    const tB = b.customer.last_interaction_at ? new Date(b.customer.last_interaction_at).getTime() : 0;
    return tB - tA;
  });
}

function toggleStringId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function CustomerIntelligenceBoard({
  initialData,
  initialFilters,
  initialFocusCustomerId,
  initialFocusIssueId,
}: Props) {
  const normalizedInitial = useMemo(
    () => normalizeInitialFilters(initialFilters),
    [initialFilters],
  );

  const [data, setData] = useState<CustomerIntelligenceOverview>(initialData);
  const [filters, setFilters] = useState<CustomerBoardFilterState>(normalizedInitial);
  const [searchInput, setSearchInput] = useState<string>(normalizedInitial.search || "");
  const [scope, setScope] = useState<BoardScope>(() =>
    deriveInitialScope(initialData, normalizedInitial, initialFocusIssueId),
  );
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(
    initialFocusCustomerId || null,
  );

  // Quick classification & inspection drawer state
  const [drawerIssueId, setDrawerIssueId] = useState<string | null>(initialFocusIssueId || null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(Boolean(initialFocusIssueId));
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerSuccess, setDrawerSuccess] = useState<string | null>(null);
  const [drawerPayload, setDrawerPayload] = useState<ClassificationDrawerPayload | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedServiceAreaIds, setSelectedServiceAreaIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [classificationNotes, setClassificationNotes] = useState<string>("");

  const applyClassificationSelectionFromIssue = useCallback(
    (payload: ClassificationDrawerPayload) => {
      const iss = payload.issue;
      const productIds = Array.from(
        new Set([
          ...(iss.catalogue_products?.map((p) => p.id) || []),
          ...(iss.product_id ? [iss.product_id] : []),
        ]),
      );
      const serviceIds = Array.from(
        new Set([
          ...(iss.catalogue_services?.map((s) => s.id) || []),
          ...(iss.service_id ? [iss.service_id] : []),
        ]),
      );
      const areaIds = Array.from(
        new Set([
          ...(iss.catalogue_areas?.map((a) => a.id) || []),
          ...(iss.service_area_id ? [iss.service_area_id] : []),
        ]),
      );
      setSelectedProductIds(productIds);
      setSelectedServiceIds(serviceIds);
      setSelectedServiceAreaIds(areaIds);
      setSelectedCategoryId(iss.catalogue_issue_category_id || "");
      setClassificationNotes("");
    },
    [],
  );

  const loadIssueClassificationDrawer = useCallback(
    async (issueId: string) => {
      setDrawerIssueId(issueId);
      setDrawerLoading(true);
      setDrawerError(null);
      setDrawerSuccess(null);
      try {
        const res = await fetch(`/api/company-intelligence/classifications/${issueId}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as ClassificationDrawerPayload & { error?: string };
        if (!res.ok) {
          throw new Error(body.error || "Unable to load Company Data classification options.");
        }
        setDrawerPayload(body);
        applyClassificationSelectionFromIssue(body);
      } catch (err) {
        setDrawerError(
          err instanceof Error ? err.message : "Failed to load issue classification details.",
        );
      } finally {
        setDrawerLoading(false);
      }
    },
    [applyClassificationSelectionFromIssue],
  );

  // Initial deep-linked issue drawer load (?issue=<uuid>) without synchronous setState in effect
  useEffect(() => {
    if (!initialFocusIssueId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/company-intelligence/classifications/${initialFocusIssueId}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as ClassificationDrawerPayload & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setDrawerError(body.error || "Unable to load issue details.");
          return;
        }
        setDrawerPayload(body);
        applyClassificationSelectionFromIssue(body);
      } catch (err) {
        if (!cancelled) {
          setDrawerError(err instanceof Error ? err.message : "Failed to load issue details.");
        }
      } finally {
        if (!cancelled) setDrawerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialFocusIssueId, applyClassificationSelectionFromIssue]);

  const fetchBoard = useCallback(async (nextFilters: CustomerBoardFilterState) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const qs = buildCustomerIntelligenceQueryParams(nextFilters);
      const url = qs ? `/api/customer-intelligence?${qs}` : "/api/customer-intelligence";
      if (typeof window !== "undefined") {
        const nextUrl = qs ? `/customers?${qs}` : "/customers";
        window.history.replaceState(null, "", nextUrl);
      }
      const res = await fetch(url, { cache: "no-store" });
      const body = (await res.json()) as CustomerIntelligenceOverview & { error?: string };
      if (!res.ok) {
        throw new Error(body.error || "Failed to refresh Customer Intelligence.");
      }
      setData(body);
      setFilters(nextFilters);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load Customer Intelligence.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdateFilter = useCallback(
    (patch: Partial<CustomerBoardFilterState>, switchToIssues = true) => {
      const next = { ...filters, ...patch };
      if (switchToIssues && scope === "repeat") {
        setScope("all_issues");
      }
      void fetchBoard(next);
    },
    [filters, scope, fetchBoard],
  );

  const handleResetFilters = useCallback(() => {
    const empty: CustomerBoardFilterState = {
      search: "",
      category: "",
      product: "",
      service: "",
      serviceArea: "",
      department: "",
      status: "",
      rootCause: "",
      needsReviewOnly: false,
      unresolvedOnly: false,
    };
    setSearchInput("");
    void fetchBoard(empty);
  }, [fetchBoard]);

  const handleBackfillAndClassify = useCallback(async () => {
    setSyncing(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/customer-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backfill", classifyUnmapped: true }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        processed?: number;
        classifiedExisting?: number;
        skipped?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error || "Failed to analyze and classify customer issues.");
      }
      const parts: string[] = [];
      if (typeof body.processed === "number" && body.processed > 0) {
        parts.push(`analyzed ${body.processed} call(s)`);
      }
      if (typeof body.classifiedExisting === "number" && body.classifiedExisting > 0) {
        parts.push(`mapped ${body.classifiedExisting} existing issue(s) to Company Data`);
      }
      setStatusMessage(
        parts.length > 0
          ? `Successfully ${parts.join(" and ")}.`
          : "Customer Intelligence and Company Data links are already up to date.",
      );
      await fetchBoard(filters);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to run backfill.");
    } finally {
      setSyncing(false);
    }
  }, [filters, fetchBoard]);

  const handleSaveDrawerClassification = useCallback(async () => {
    if (!drawerIssueId) return;
    setDrawerSaving(true);
    setDrawerError(null);
    setDrawerSuccess(null);
    try {
      const res = await fetch(`/api/company-intelligence/classifications/${drawerIssueId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: selectedProductIds.map((id) => ({ id })),
          services: selectedServiceIds.map((id) => ({ id })),
          service_areas: selectedServiceAreaIds.map((id) => ({ id })),
          issue_category_id: selectedCategoryId || null,
          notes: classificationNotes.trim(),
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error || "Failed to save Company Data classification.");
      }
      setDrawerSuccess("Classification saved and verified.");
      await Promise.all([loadIssueClassificationDrawer(drawerIssueId), fetchBoard(filters)]);
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Failed to save classification.");
    } finally {
      setDrawerSaving(false);
    }
  }, [
    drawerIssueId,
    selectedProductIds,
    selectedServiceIds,
    selectedServiceAreaIds,
    selectedCategoryId,
    classificationNotes,
    loadIssueClassificationDrawer,
    fetchBoard,
    filters,
  ]);

  const repeatRows = useMemo(
    () => buildRepeatCustomerRows(data.customers.items, data.interactions, data.issues.items),
    [data.customers.items, data.interactions, data.issues.items],
  );

  const reviewOrUnmappedIssues = useMemo(
    () =>
      data.issues.items.filter(
        (issue) => issue.needs_review || !hasIssueCatalogueTag(issue),
      ),
    [data.issues.items],
  );

  const { topProducts, topServices } = useMemo(
    () => aggregateIssueProductsAndServices(data.issues.items),
    [data.issues.items],
  );

  const summary = data.connectionSummary;
  const totalIssuesForCoverage = summary?.totalIssues ?? data.kpis.totalIssues;
  const classifiedIssuesCount =
    summary?.classifiedIssuesCount ??
    data.issues.items.filter((i) => hasIssueCatalogueTag(i)).length;
  const unclassifiedCount =
    summary?.unclassifiedIssuesCount ?? Math.max(0, totalIssuesForCoverage - classifiedIssuesCount);
  const coveragePct =
    totalIssuesForCoverage > 0
      ? Math.round((classifiedIssuesCount / totalIssuesForCoverage) * 100)
      : 0;
  const unanalyzedCount = summary?.unanalyzedCallsCount ?? data.unanalyzedCallsCount ?? 0;

  const activeFilterCount = [
    filters.search,
    filters.category,
    filters.product,
    filters.service,
    filters.serviceArea,
    filters.status,
    filters.rootCause,
    filters.needsReviewOnly ? "1" : "",
    filters.unresolvedOnly ? "1" : "",
  ].filter(Boolean).length;

  const catalogueCounts = {
    areas: data.filterOptions.serviceAreas.length,
    products: data.filterOptions.products.length,
    services: data.filterOptions.services.length,
    categories: data.filterOptions.categories.length,
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Company Data Bridge Banner */}
      <section className="rounded-2xl border border-[#DBEAFE] bg-[#0A1A3F] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-100">
              <Building2 className="h-3.5 w-3.5" />
              Customer Intelligence × Company Data
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Customer Issues, Journeys &amp; Operational Impact
            </h1>
            <p className="text-sm text-blue-100/90 leading-relaxed">
              Every customer call is linked to its contact profile, underlying issue, root cause, and your live{" "}
              <Link
                href="/settings/company-intelligence"
                className="font-semibold text-white underline decoration-blue-300/70 underline-offset-4 hover:text-blue-200"
              >
                Company Data catalogue
              </Link>{" "}
              and external CRM/helpdesk connections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleBackfillAndClassify}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2F6BFF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2459E8] disabled:opacity-60"
            >
              <Sparkles className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing
                ? "Analyzing & mapping..."
                : unanalyzedCount > 0 || unclassifiedCount > 0
                  ? `Analyze & classify (${unanalyzedCount + unclassifiedCount})`
                  : "Re-sync with Company Data"}
            </button>
            <Link
              href="/settings/company-intelligence"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Company Data
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/settings/connections"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-blue-100 transition hover:bg-white/10 hover:text-white"
            >
              <Plug className="h-4 w-4" />
              API Sources ({summary?.activeIntegrationsCount ?? 0})
            </Link>
          </div>
        </div>

        {/* Live Bridge Telemetry Strip */}
        <div className="mt-5 grid gap-3 border-t border-white/15 pt-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Active Catalogue Summary */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-100">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-300" />
                Company Catalogue Status
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  data.isCatalogueConfigured
                    ? "bg-emerald-400/20 text-emerald-200"
                    : "bg-amber-400/20 text-amber-200"
                }`}
              >
                {data.isCatalogueConfigured ? "Active" : "Setup needed"}
              </span>
            </div>
            {data.isCatalogueConfigured ? (
              <p className="mt-1.5 text-xs text-blue-100/80">
                {catalogueCounts.areas} service areas · {catalogueCounts.products} products ·{" "}
                {catalogueCounts.services} services · {catalogueCounts.categories} categories
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-amber-100">
                Define products &amp; service areas in{" "}
                <Link href="/settings/company-intelligence" className="underline font-semibold">
                  Settings → Company Data
                </Link>{" "}
                to classify issues automatically.
              </p>
            )}
          </div>

          {/* Classification Coverage */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-100">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-blue-300" />
                Issue-to-Catalogue Coverage
              </span>
              <span className="tabular-nums font-bold text-white">{coveragePct}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#60A5FA] transition-all"
                style={{ width: `${coveragePct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-blue-100/80 tabular-nums">
              {classifiedIssuesCount}/{totalIssuesForCoverage} tagged · {unclassifiedCount} unmapped ·{" "}
              {unanalyzedCount} unanalyzed calls
            </p>
          </div>

          {/* Connected External APIs / Webhooks */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-100">
              <span className="flex items-center gap-1.5">
                <Plug className="h-3.5 w-3.5 text-blue-300" />
                Connected External Systems
              </span>
              <Link
                href="/settings/connections"
                className="text-[11px] font-medium text-blue-200 hover:text-white underline"
              >
                Manage
              </Link>
            </div>
            {summary && summary.integrations.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {summary.integrations.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white"
                  >
                    <IntegrationBrandIcon
                      provider={item.provider}
                      providerProfile={item.providerProfile}
                      sourceSystemId={item.sourceSystemId}
                      name={item.name}
                      integrationType={item.integrationType}
                      size={14}
                      variant="badge"
                      className="!h-5 !w-5 rounded"
                    />
                    <span className="font-medium">{item.name}</span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.connectionStatus === "active"
                          ? "bg-emerald-400"
                          : item.connectionStatus === "failing" || item.connectionStatus === "error"
                            ? "bg-rose-400"
                            : "bg-slate-300"
                      }`}
                    />
                  </span>
                ))}
                {summary.integrations.length > 3 && (
                  <span className="text-[11px] text-blue-200 self-center">
                    +{summary.integrations.length - 3} more
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-blue-100/80">
                No REST API or webhook connected yet. Connect your CRM, ERP, or helpdesk in Settings.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Alerts / Action Feedback */}
      {data.migrationRequired && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold">Customer Intelligence database schema needs synchronization.</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Some database tables or columns could not be reached. Verify migrations on your Supabase project.
            </p>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {statusMessage}
          </span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs text-emerald-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <span className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            {errorMessage}
          </span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Live KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setScope("repeat")}
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 text-left transition hover:border-[#2459E8]/50 hover:shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Return customers
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-[#0A1A3F] tabular-nums">
            {data.kpis.repeatCustomersCount}
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {data.kpis.repeatCustomerRatePct}% of {data.kpis.totalCustomers} tracked customers ·{" "}
            {data.kpis.repeatCallsCount} repeat calls
          </p>
        </button>

        <button
          type="button"
          onClick={() => setScope("all_issues")}
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 text-left transition hover:border-[#2459E8]/50 hover:shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tracked issues
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-[#0A1A3F] tabular-nums">
            {data.kpis.totalIssues}
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {data.kpis.recurringIssuesCount} recurring · {data.kpis.firstContactResolvedCount} resolved 1st call
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleUpdateFilter({ unresolvedOnly: !filters.unresolvedOnly }, true)}
          className={`rounded-2xl border p-5 text-left transition hover:shadow-sm ${
            filters.unresolvedOnly
              ? "border-[#2459E8] bg-[#EFF6FF]"
              : "border-[#E2E8F0] bg-white hover:border-[#2459E8]/50"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Unresolved issues
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-[#0A1A3F] tabular-nums">
            {data.kpis.unresolvedIssuesCount}
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {data.kpis.reopenedIssuesCount} reopened · {data.kpis.needsReviewCount} needs review
          </p>
        </button>

        <button
          type="button"
          onClick={() => setScope("needs_review")}
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 text-left transition hover:border-[#2459E8]/50 hover:shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Catalogue coverage
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-[#0A1A3F] tabular-nums">
            {coveragePct}%
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {classifiedIssuesCount} mapped · {unclassifiedCount} unmapped issues
          </p>
        </button>
      </section>

      {/* Interactive Company Catalogue Impact Breakdowns */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Service Areas */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-bold text-[#0A1A3F]">
                Service Area Breakdown
              </h2>
              <p className="text-xs text-slate-500">Click a service area to filter issues</p>
            </div>
            <Link
              href="/settings/company-intelligence"
              className="text-xs font-semibold text-[#2459E8] hover:underline"
            >
              Configure
            </Link>
          </div>
          {data.breakdowns.byServiceArea.length > 0 ? (
            <div className="mt-4 space-y-2">
              {data.breakdowns.byServiceArea.slice(0, 6).map((area) => {
                const active = filters.serviceArea === area.serviceAreaId;
                return (
                  <button
                    key={area.serviceAreaId}
                    type="button"
                    onClick={() =>
                      handleUpdateFilter(
                        { serviceArea: active ? "" : area.serviceAreaId },
                        true,
                      )
                    }
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                      active
                        ? "border-[#2459E8] bg-[#EFF6FF] text-[#0A1A3F]"
                        : "border-slate-100 bg-[#F8FAFF] text-slate-700 hover:border-[#DBEAFE]"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold text-[#0A1A3F]">{area.name}</p>
                      <p className="text-[11px] text-slate-500 tabular-nums">
                        {area.unresolvedIssues} open · {area.repeatContactRate}% repeat
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-white px-2 py-0.5 font-semibold text-[#0A1A3F] border border-slate-200 tabular-nums">
                      {area.totalIssues}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-[#F8FAFF] p-4 text-xs text-slate-600">
              No service areas mapped to current issues yet. Add service areas in{" "}
              <Link href="/settings/company-intelligence" className="font-semibold text-[#2459E8] underline">
                Company Data
              </Link>{" "}
              or click <strong>Analyze &amp; classify</strong> above.
            </div>
          )}
        </div>

        {/* Top Tagged Products & Services */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-bold text-[#0A1A3F]">
                Products &amp; Services Impact
              </h2>
              <p className="text-xs text-slate-500">Top Company Data items linked to customer calls</p>
            </div>
            <Link
              href="/settings/connections"
              className="text-xs font-semibold text-[#2459E8] hover:underline"
            >
              Sync API
            </Link>
          </div>
          {topProducts.length > 0 || topServices.length > 0 ? (
            <div className="mt-4 space-y-3">
              {topProducts.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Products
                  </p>
                  <div className="space-y-1.5">
                    {topProducts.slice(0, 3).map((prod) => {
                      const active = filters.product === prod.id;
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() =>
                            handleUpdateFilter({ product: active ? "" : prod.id }, true)
                          }
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-xs transition ${
                            active
                              ? "border-[#2459E8] bg-[#EFF6FF]"
                              : "border-slate-100 bg-[#F8FAFF] hover:border-[#DBEAFE]"
                          }`}
                        >
                          <span className="truncate font-semibold text-[#0A1A3F]">{prod.name}</span>
                          <span className="shrink-0 text-[11px] text-slate-600 tabular-nums">
                            {prod.totalIssues} ({prod.unresolvedIssues} open)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {topServices.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Services
                  </p>
                  <div className="space-y-1.5">
                    {topServices.slice(0, 3).map((svc) => {
                      const active = filters.service === svc.id;
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() =>
                            handleUpdateFilter({ service: active ? "" : svc.id }, true)
                          }
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-xs transition ${
                            active
                              ? "border-[#2459E8] bg-[#EFF6FF]"
                              : "border-slate-100 bg-[#F8FAFF] hover:border-[#DBEAFE]"
                          }`}
                        >
                          <span className="truncate font-semibold text-[#0A1A3F]">{svc.name}</span>
                          <span className="shrink-0 text-[11px] text-slate-600 tabular-nums">
                            {svc.totalIssues} ({svc.unresolvedIssues} open)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-[#F8FAFF] p-4 text-xs text-slate-600">
              No products or services linked in this view yet. Import via CSV/API or tag an issue inline below.
            </div>
          )}
        </div>

        {/* Category & Root Cause Summary */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-bold text-[#0A1A3F]">
                Categories &amp; Root Causes
              </h2>
              <p className="text-xs text-slate-500">Why customers contact support again</p>
            </div>
            <span className="text-xs font-medium text-slate-400 tabular-nums">
              {data.totalAnalyzedCalls} calls
            </span>
          </div>
          {data.breakdowns.byCategory.length > 0 ? (
            <div className="mt-4 space-y-2">
              {data.breakdowns.byCategory.slice(0, 4).map((cat) => {
                const active = filters.category === cat.category;
                return (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() =>
                      handleUpdateFilter({ category: active ? "" : cat.category }, true)
                    }
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                      active
                        ? "border-[#2459E8] bg-[#EFF6FF]"
                        : "border-slate-100 bg-[#F8FAFF] hover:border-[#DBEAFE]"
                    }`}
                  >
                    <span className="truncate font-semibold text-[#0A1A3F]">
                      {cat.label || formatCategoryLabel(cat.category)}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-600 tabular-nums">
                      {cat.totalIssues} issues · {cat.unresolvedCount} open
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-[#F8FAFF] p-4 text-xs text-slate-600">
              No analyzed issue categories available for the current filter selection.
            </div>
          )}
        </div>
      </section>

      {/* Filter Bar & Scope Switcher */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Operational View Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#F8FAFF] p-1 border border-[#E2E8F0]">
            {[
              { id: "repeat" as const, label: "Return customers", count: repeatRows.length },
              { id: "all_customers" as const, label: "All customers", count: data.customers.total },
              { id: "all_issues" as const, label: "All issues", count: data.issues.total },
              {
                id: "needs_review" as const,
                label: "Needs review / Unmapped",
                count: reviewOrUnmappedIssues.length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  scope === tab.id
                    ? "bg-[#0A1A3F] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#0A1A3F]"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                    scope === tab.id ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateFilter({ search: searchInput }, false);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search customer, phone, ISS-..., product..."
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFF] py-2 pl-9 pr-3 text-xs text-[#0A1A3F] placeholder:text-slate-400 focus:border-[#2459E8] focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#0A1A3F] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#13295E] disabled:opacity-60"
            >
              {loading ? "Filtering..." : "Search"}
            </button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Reset ({activeFilterCount})
              </button>
            )}
          </form>
        </div>

        {/* Company Data & Lifecycle Dropdown Filters */}
        <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 pt-1 border-t border-slate-100">
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <SlidersHorizontal className="h-3 w-3" /> Service Area
            </span>
            <select
              value={filters.serviceArea || ""}
              onChange={(e) => handleUpdateFilter({ serviceArea: e.target.value }, true)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] px-2.5 py-1.5 text-xs text-[#0A1A3F] focus:border-[#2459E8] focus:outline-none"
            >
              <option value="">All service areas</option>
              {data.filterOptions.serviceAreas.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Product</span>
            <select
              value={filters.product || ""}
              onChange={(e) => handleUpdateFilter({ product: e.target.value }, true)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] px-2.5 py-1.5 text-xs text-[#0A1A3F] focus:border-[#2459E8] focus:outline-none"
            >
              <option value="">All products</option>
              {data.filterOptions.products.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Service</span>
            <select
              value={filters.service || ""}
              onChange={(e) => handleUpdateFilter({ service: e.target.value }, true)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] px-2.5 py-1.5 text-xs text-[#0A1A3F] focus:border-[#2459E8] focus:outline-none"
            >
              <option value="">All services</option>
              {data.filterOptions.services.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Category</span>
            <select
              value={filters.category || ""}
              onChange={(e) => handleUpdateFilter({ category: e.target.value }, true)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] px-2.5 py-1.5 text-xs text-[#0A1A3F] focus:border-[#2459E8] focus:outline-none"
            >
              <option value="">All categories</option>
              {data.filterOptions.categories.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Status</span>
            <select
              value={filters.status || ""}
              onChange={(e) => handleUpdateFilter({ status: e.target.value }, true)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] px-2.5 py-1.5 text-xs text-[#0A1A3F] focus:border-[#2459E8] focus:outline-none"
            >
              <option value="">All statuses</option>
              {data.filterOptions.statuses.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Root Cause</span>
            <select
              value={filters.rootCause || ""}
              onChange={(e) => handleUpdateFilter({ rootCause: e.target.value }, true)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] px-2.5 py-1.5 text-xs text-[#0A1A3F] focus:border-[#2459E8] focus:outline-none"
            >
              <option value="">All root causes</option>
              {data.filterOptions.rootCauses.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Main Content Area by Active Scope */}
      {scope === "repeat" && (
        <section className="space-y-3">
          {repeatRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-3 font-display text-base font-bold text-[#0A1A3F]">
                No return customers matching the current filter
              </h3>
              <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">
                Customers with 2 or more recorded calls appear here automatically. You can inspect all single-call
                customers or issues right now using the tabs above.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setScope("all_issues")}
                  className="rounded-xl bg-[#0A1A3F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#13295E]"
                >
                  View all {data.issues.total} issues
                </button>
                <button
                  type="button"
                  onClick={() => setScope("all_customers")}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-[#0A1A3F] hover:bg-slate-50"
                >
                  Browse all customers
                </button>
              </div>
            </div>
          ) : (
            repeatRows.map(({ customer, calls, issues }) => {
              const isExpanded = expandedCustomerId === customer.id;
              return (
                <article
                  key={customer.id}
                  className={`rounded-2xl border bg-white p-5 transition ${
                    initialFocusCustomerId === customer.id
                      ? "border-[#2459E8] ring-2 ring-[#2459E8]/15"
                      : "border-[#E2E8F0]"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-display text-base font-bold text-[#0A1A3F] hover:text-[#2459E8]"
                        >
                          {customer.display_label}
                        </Link>
                        {customer.normalized_phone && (
                          <span className="rounded-md bg-[#F8FAFF] border border-[#E2E8F0] px-2 py-0.5 text-[11px] font-mono text-slate-600">
                            {customer.normalized_phone}
                          </span>
                        )}
                        <RiskLevelBadge risk={customer.risk_level} />
                        <span className="rounded-md bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 text-[11px] font-semibold text-[#2459E8] tabular-nums">
                          {customer.total_calls} calls
                        </span>
                        {customer.unresolved_issue_count > 0 && (
                          <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-semibold text-rose-700 tabular-nums">
                            {customer.unresolved_issue_count} unresolved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Last contact {formatUtcDate(customer.last_interaction_at)} ·{" "}
                        {issues.length} linked issue(s)
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCustomerId(isExpanded ? null : customer.id)
                        }
                        className="rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#0A1A3F] hover:bg-[#F8FAFF]"
                      >
                        {isExpanded ? "Hide timeline" : `Show ${calls.length || customer.total_calls} calls`}
                      </button>
                      <Link
                        href={`/customers/${customer.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#0A1A3F] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#13295E]"
                      >
                        Full 360° Journey
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Linked Issues Preview Strip */}
                  {issues.length > 0 && (
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {issues.slice(0, 4).map((issue) => (
                        <div
                          key={issue.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-[#F8FAFF] p-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-mono font-semibold text-slate-500">
                                {issue.issue_code}
                              </span>
                              <IssueStatusBadge status={issue.status} />
                              {issue.service_area_name && (
                                <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-[#0A1A3F]">
                                  {issue.service_area_name}
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/customers/issues/${issue.id}`}
                              className="block truncate text-xs font-semibold text-[#0A1A3F] hover:text-[#2459E8]"
                            >
                              {issue.title}
                            </Link>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                              <RootCauseBadge category={issue.primary_root_cause} />
                              {issue.product_name && <span>· {issue.product_name}</span>}
                              {issue.service_name && <span>· {issue.service_name}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void loadIssueClassificationDrawer(issue.id)}
                            className="shrink-0 rounded-lg border border-[#DBEAFE] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2459E8] hover:bg-[#EFF6FF]"
                          >
                            {hasIssueCatalogueTag(issue) ? "Verify" : "Classify"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded Call Sequence */}
                  {isExpanded && calls.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
                      {calls.map((call) => (
                        <div
                          key={call.id}
                          className="flex flex-col gap-2 rounded-xl border border-slate-100 px-3.5 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-[#0A1A3F]">
                                Call #{call.customer_contact_sequence}
                              </span>
                              <Link
                                href={`/calls/${call.call_id}`}
                                className="font-medium text-[#2459E8] hover:underline"
                              >
                                {call.call_title}
                              </Link>
                              <MatchClassificationBadge classification={call.match_classification} />
                            </div>
                            <p className="text-[11px] text-slate-600">
                              {call.extracted_issue_summary}
                            </p>
                          </div>
                          <div className="shrink-0 text-right text-[11px] text-slate-500">
                            <p>{formatUtcDate(call.call_date)}</p>
                            <p>Agent: {call.agent_name || "Unassigned"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      )}

      {scope === "all_customers" && (
        <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
          {data.customers.items.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">
              No customers match the active filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFF] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Calls</th>
                    <th className="px-4 py-3">Unresolved / Recurring</th>
                    <th className="px-4 py-3">Risk</th>
                    <th className="px-4 py-3">Top Categories</th>
                    <th className="px-4 py-3">Last Contact</th>
                    <th className="px-4 py-3 text-right">Journey</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.customers.items.map((cust) => (
                    <tr key={cust.id} className="hover:bg-[#F8FAFF]/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/customers/${cust.id}`}
                          className="font-semibold text-[#0A1A3F] hover:text-[#2459E8]"
                        >
                          {cust.display_label}
                        </Link>
                        {cust.normalized_phone && (
                          <div className="text-[11px] font-mono text-slate-500">
                            {cust.normalized_phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#0A1A3F] tabular-nums">
                        {cust.total_calls}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">
                        {cust.unresolved_issue_count} open · {cust.recurring_issue_count} repeat
                      </td>
                      <td className="px-4 py-3">
                        <RiskLevelBadge risk={cust.risk_level} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(cust.top_issue_categories || []).slice(0, 2).map((c) => (
                            <span
                              key={c}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                            >
                              {formatCategoryLabel(c)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 tabular-nums">
                        {formatUtcDate(cust.last_interaction_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/customers/${cust.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-semibold text-[#2459E8] hover:bg-[#DBEAFE]"
                        >
                          Open 360°
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {(scope === "all_issues" || scope === "needs_review") && (
        <section className="space-y-3">
          {(() => {
            const visibleIssues =
              scope === "needs_review" ? reviewOrUnmappedIssues : data.issues.items;
            if (visibleIssues.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-8 text-center">
                  <FileWarning className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-3 font-display text-base font-bold text-[#0A1A3F]">
                    {scope === "needs_review"
                      ? "All visible issues are reviewed and mapped"
                      : "No customer issues match the current filters"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Adjust your filters or analyze new calls using the button above.
                  </p>
                </div>
              );
            }

            return visibleIssues.map((issue) => {
              const isTagged = hasIssueCatalogueTag(issue);
              const products =
                issue.catalogue_products && issue.catalogue_products.length > 0
                  ? issue.catalogue_products
                  : issue.product_id && issue.product_name
                    ? [{ id: issue.product_id, name: issue.product_name }]
                    : [];
              const services =
                issue.catalogue_services && issue.catalogue_services.length > 0
                  ? issue.catalogue_services
                  : issue.service_id && issue.service_name
                    ? [{ id: issue.service_id, name: issue.service_name }]
                    : [];

              return (
                <article
                  key={issue.id}
                  className={`rounded-2xl border bg-white p-5 transition ${
                    drawerIssueId === issue.id
                      ? "border-[#2459E8] ring-2 ring-[#2459E8]/15"
                      : "border-[#E2E8F0]"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2 max-w-4xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-[#0A1A3F]">
                          {issue.issue_code}
                        </span>
                        <IssueStatusBadge status={issue.status} />
                        <ResolutionConfirmationBadge confirmation={issue.resolution_confirmation} />
                        <RootCauseBadge category={issue.primary_root_cause} />
                        <span className="rounded-md bg-[#F8FAFF] border border-[#E2E8F0] px-2 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums">
                          {issue.total_calls} {issue.total_calls === 1 ? "call" : "calls"}
                        </span>
                        {issue.human_verified && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </span>
                        )}
                      </div>

                      <div>
                        <Link
                          href={`/customers/issues/${issue.id}`}
                          className="font-display text-base font-bold text-[#0A1A3F] hover:text-[#2459E8]"
                        >
                          {issue.title}
                        </Link>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{issue.summary}</p>
                      </div>

                      {/* Company Catalogue Links Row */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {issue.service_area_name && (
                          <button
                            type="button"
                            onClick={() =>
                              issue.service_area_id &&
                              handleUpdateFilter({ serviceArea: issue.service_area_id }, true)
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-[#DBEAFE] bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8] hover:bg-[#DBEAFE]"
                          >
                            <Layers className="h-3 w-3" />
                            {issue.service_area_name}
                          </button>
                        )}
                        {products.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleUpdateFilter({ product: p.id }, true)}
                            className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 hover:bg-teal-100"
                          >
                            <Tag className="h-3 w-3" />
                            {p.name}
                          </button>
                        ))}
                        {services.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleUpdateFilter({ service: s.id }, true)}
                            className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100"
                          >
                            {s.name}
                          </button>
                        ))}
                        {issue.catalogue_issue_category_name ? (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {issue.catalogue_issue_category_name}
                          </span>
                        ) : (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                            {formatCategoryLabel(issue.category)}
                          </span>
                        )}
                        {!isTagged && (
                          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            Unmapped to Company Data
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 lg:items-end shrink-0">
                      <div className="text-xs text-slate-500 lg:text-right">
                        <Link
                          href={`/customers/${issue.customer_id}`}
                          className="font-semibold text-[#0A1A3F] hover:text-[#2459E8]"
                        >
                          {issue.customer_label}
                        </Link>
                        <div>Updated {formatUtcDate(issue.latest_reported_at)}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void loadIssueClassificationDrawer(issue.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#2459E8] hover:bg-[#DBEAFE]"
                        >
                          <Tag className="h-3.5 w-3.5" />
                          {isTagged ? "Verify tags" : "Assign Company Data"}
                        </button>
                        <Link
                          href={`/customers/issues/${issue.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#0A1A3F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#13295E]"
                        >
                          Investigate
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            });
          })()}
        </section>
      )}

      {/* Slide-Over Quick Company Data Classification Drawer */}
      {drawerIssueId && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#0A1A3F]/40 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Classify issue against Company Data"
        >
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-[#E2E8F0]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFF] px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2459E8]">
                  Company Data Classification
                </p>
                <h2 className="font-display text-lg font-bold text-[#0A1A3F]">
                  {drawerPayload?.issue?.issue_code || "Issue Inspection"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerIssueId(null)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-white hover:text-[#0A1A3F]"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {drawerLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600 py-8 justify-center">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#2459E8]" />
                  Loading Company Data catalogue...
                </div>
              ) : drawerError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                  {drawerError}
                </div>
              ) : drawerPayload ? (
                <>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFF] p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <IssueStatusBadge status={drawerPayload.issue.status} />
                      <RootCauseBadge category={drawerPayload.issue.primary_root_cause} />
                    </div>
                    <p className="font-display text-sm font-bold text-[#0A1A3F]">
                      {drawerPayload.issue.title}
                    </p>
                    <p className="text-xs text-slate-600">{drawerPayload.issue.summary}</p>
                    {drawerPayload.issue.root_cause_explanation && (
                      <p className="text-[11px] text-slate-500 border-t border-slate-200/70 pt-2">
                        Root cause note: {drawerPayload.issue.root_cause_explanation}
                      </p>
                    )}
                    <div className="pt-1">
                      <Link
                        href={`/customers/issues/${drawerPayload.issue.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#2459E8] hover:underline"
                      >
                        Open full issue investigation page
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  {drawerSuccess && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
                      {drawerSuccess}
                    </div>
                  )}

                  {drawerPayload.catalogue.serviceAreas.length === 0 &&
                  drawerPayload.catalogue.products.length === 0 &&
                  drawerPayload.catalogue.services.length === 0 &&
                  drawerPayload.catalogue.issueCategories.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
                      <p className="font-semibold">Your Company Data catalogue has no entries yet.</p>
                      <p>
                        Add Service Areas, Products, Services, or Issue Categories in Company Data first so
                        issues can be linked directly to your operations.
                      </p>
                      <Link
                        href="/settings/company-intelligence"
                        className="inline-flex items-center gap-1 font-semibold text-[#2459E8] underline"
                      >
                        Configure Company Data now
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Service Areas */}
                      {drawerPayload.catalogue.serviceAreas.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-bold text-[#0A1A3F]">Service Areas</p>
                          <div className="flex flex-wrap gap-1.5">
                            {drawerPayload.catalogue.serviceAreas
                              .filter((a) => a.isActive)
                              .map((area) => {
                                const selected = selectedServiceAreaIds.includes(area.id);
                                return (
                                  <button
                                    key={area.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedServiceAreaIds((prev) =>
                                        toggleStringId(prev, area.id),
                                      )
                                    }
                                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                                      selected
                                        ? "border-[#2459E8] bg-[#2459E8] text-white"
                                        : "border-[#E2E8F0] bg-white text-slate-700 hover:border-[#2459E8]"
                                    }`}
                                  >
                                    {area.name}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Products */}
                      {drawerPayload.catalogue.products.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-bold text-[#0A1A3F]">Products</p>
                          <div className="flex flex-wrap gap-1.5">
                            {drawerPayload.catalogue.products
                              .filter((p) => p.isActive)
                              .map((prod) => {
                                const selected = selectedProductIds.includes(prod.id);
                                return (
                                  <button
                                    key={prod.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedProductIds((prev) => toggleStringId(prev, prod.id))
                                    }
                                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                                      selected
                                        ? "border-teal-600 bg-teal-600 text-white"
                                        : "border-[#E2E8F0] bg-white text-slate-700 hover:border-teal-500"
                                    }`}
                                  >
                                    {prod.name}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Services */}
                      {drawerPayload.catalogue.services.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-bold text-[#0A1A3F]">Services</p>
                          <div className="flex flex-wrap gap-1.5">
                            {drawerPayload.catalogue.services
                              .filter((s) => s.isActive)
                              .map((svc) => {
                                const selected = selectedServiceIds.includes(svc.id);
                                return (
                                  <button
                                    key={svc.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedServiceIds((prev) => toggleStringId(prev, svc.id))
                                    }
                                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                                      selected
                                        ? "border-indigo-600 bg-indigo-600 text-white"
                                        : "border-[#E2E8F0] bg-white text-slate-700 hover:border-indigo-500"
                                    }`}
                                  >
                                    {svc.name}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Issue Category */}
                      {drawerPayload.catalogue.issueCategories.length > 0 && (
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold text-[#0A1A3F]">
                            Company Issue Category
                          </span>
                          <select
                            value={selectedCategoryId}
                            onChange={(e) => setSelectedCategoryId(e.target.value)}
                            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFF] px-3 py-2 text-xs text-[#0A1A3F] focus:border-[#2459E8] focus:bg-white focus:outline-none"
                          >
                            <option value="">None / Unassigned</option>
                            {drawerPayload.catalogue.issueCategories
                              .filter((c) => c.isActive)
                              .map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-[#0A1A3F]">
                          Supervisor Verification Note (optional)
                        </span>
                        <textarea
                          rows={2}
                          value={classificationNotes}
                          onChange={(e) => setClassificationNotes(e.target.value)}
                          placeholder="Reason for assigning or correcting catalogue links..."
                          className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFF] px-3 py-2 text-xs text-[#0A1A3F] focus:border-[#2459E8] focus:bg-white focus:outline-none"
                        />
                      </label>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#E2E8F0] bg-[#F8FAFF] px-6 py-4">
              <button
                type="button"
                onClick={() => setDrawerIssueId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={drawerSaving || drawerLoading || !drawerPayload}
                onClick={() => void handleSaveDrawerClassification()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2459E8] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {drawerSaving ? "Saving..." : "Save & verify classification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
