export interface EntityIssueCounts {
  products: Record<string, number>;
  services: Record<string, number>;
  serviceAreas: Record<string, number>;
  issueCategories: Record<string, number>;
}

export interface ConnectedIntegrationSummary {
  id: string;
  name: string;
  provider: string;
  providerProfile?: string | null;
  sourceSystemId?: string | null;
  integrationType: string;
  entityType: string;
  connectionStatus: string;
  lastSyncAt: string | null;
  latestRunStatus: string | null;
  latestRunProcessed: number | null;
  latestRunError: string | null;
}

export interface CompanyConnectionSummary {
  totalIssues: number;
  classifiedIssuesCount: number;
  unclassifiedIssuesCount: number;
  needsReviewIssuesCount: number;
  unanalyzedCallsCount: number;
  integrationsCount: number;
  activeIntegrationsCount: number;
  lastSyncAt: string | null;
  integrations: ConnectedIntegrationSummary[];
  issueCountsByEntity: EntityIssueCounts;
}

export type RawIssueLinkRow = {
  id: string;
  product_id?: string | null;
  service_id?: string | null;
  service_area_id?: string | null;
  catalogue_issue_category_id?: string | null;
  needs_review?: boolean | null;
  catalogue_requires_review?: boolean | null;
};

export type RawRelationshipRow = {
  issue_id: string;
  product_id?: string | null;
  service_id?: string | null;
  service_area_id?: string | null;
  is_current?: boolean | null;
};

export type RawIntegrationRow = {
  id: string;
  name: string;
  provider: string;
  integration_type: string;
  connection_status: string;
  last_sync_at?: string | null;
  configuration?: { entityType?: string; providerProfile?: string; sourceSystemId?: string } | null;
  integration_sync_runs?: Array<{
    started_at?: string | null;
    completed_at?: string | null;
    status?: string | null;
    records_processed?: number | null;
    error_summary?: string | null;
  }> | null;
};

export interface CatalogueEntityVolumeItem {
  id: string;
  name: string;
  totalIssues: number;
  unresolvedIssues: number;
  recurringIssues: number;
}

export interface CustomerBoardFilterState {
  search?: string;
  category?: string;
  product?: string;
  service?: string;
  serviceArea?: string;
  department?: string;
  status?: string;
  rootCause?: string;
  needsReviewOnly?: boolean;
  unresolvedOnly?: boolean;
}

function addDistinct(
  map: Map<string, Set<string>>,
  entityId: string | null | undefined,
  issueId: string,
) {
  if (!entityId) return;
  const set = map.get(entityId) || new Set<string>();
  set.add(issueId);
  map.set(entityId, set);
}

function toRecordCounts(map: Map<string, Set<string>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, set] of map.entries()) {
    out[key] = set.size;
  }
  return out;
}

/**
 * Pure coverage & per-entity issue counter used by both Settings -> Company Data and Customer Intelligence.
 */
export function summarizeIssueCatalogueLinks(
  issues: RawIssueLinkRow[],
  relationships: RawRelationshipRow[],
): {
  totalIssues: number;
  classifiedIssuesCount: number;
  unclassifiedIssuesCount: number;
  needsReviewIssuesCount: number;
  issueCountsByEntity: EntityIssueCounts;
} {
  const productIssues = new Map<string, Set<string>>();
  const serviceIssues = new Map<string, Set<string>>();
  const areaIssues = new Map<string, Set<string>>();
  const categoryIssues = new Map<string, Set<string>>();
  const classifiedIssueIds = new Set<string>();
  let needsReviewIssuesCount = 0;

  for (const iss of issues) {
    if (iss.needs_review || iss.catalogue_requires_review) {
      needsReviewIssuesCount += 1;
    }
    if (
      iss.product_id ||
      iss.service_id ||
      iss.service_area_id ||
      iss.catalogue_issue_category_id
    ) {
      classifiedIssueIds.add(iss.id);
    }
    addDistinct(productIssues, iss.product_id, iss.id);
    addDistinct(serviceIssues, iss.service_id, iss.id);
    addDistinct(areaIssues, iss.service_area_id, iss.id);
    addDistinct(categoryIssues, iss.catalogue_issue_category_id, iss.id);
  }

  for (const rel of relationships) {
    if (rel.is_current === false) continue;
    if (rel.product_id || rel.service_id || rel.service_area_id) {
      classifiedIssueIds.add(rel.issue_id);
    }
    addDistinct(productIssues, rel.product_id, rel.issue_id);
    addDistinct(serviceIssues, rel.service_id, rel.issue_id);
    addDistinct(areaIssues, rel.service_area_id, rel.issue_id);
  }

  const totalIssues = issues.length;
  const classifiedIssuesCount = issues.filter((iss) => classifiedIssueIds.has(iss.id)).length;

  return {
    totalIssues,
    classifiedIssuesCount,
    unclassifiedIssuesCount: Math.max(0, totalIssues - classifiedIssuesCount),
    needsReviewIssuesCount,
    issueCountsByEntity: {
      products: toRecordCounts(productIssues),
      services: toRecordCounts(serviceIssues),
      serviceAreas: toRecordCounts(areaIssues),
      issueCategories: toRecordCounts(categoryIssues),
    },
  };
}

/**
 * Normalize integration rows and pick the true latest sync run by started_at descending.
 */
export function sortAndSummarizeIntegrations(
  rows: RawIntegrationRow[],
): ConnectedIntegrationSummary[] {
  return rows.map((row) => {
    const runs = Array.isArray(row.integration_sync_runs) ? [...row.integration_sync_runs] : [];
    runs.sort((a, b) => {
      const tA = a.started_at ? new Date(a.started_at).getTime() : 0;
      const tB = b.started_at ? new Date(b.started_at).getTime() : 0;
      return (Number.isFinite(tB) ? tB : 0) - (Number.isFinite(tA) ? tA : 0);
    });
    const latest = runs[0] ?? null;

    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      providerProfile: row.configuration?.providerProfile || null,
      sourceSystemId: row.configuration?.sourceSystemId || null,
      integrationType: row.integration_type,
      entityType: row.configuration?.entityType || "ticket",
      connectionStatus: row.connection_status,
      lastSyncAt: row.last_sync_at || null,
      latestRunStatus: latest?.status || null,
      latestRunProcessed:
        typeof latest?.records_processed === "number" ? latest.records_processed : null,
      latestRunError: latest?.error_summary || null,
    };
  });
}

function accumulateEntityList(
  bucket: Map<string, CatalogueEntityVolumeItem>,
  items: Array<{ id: string; name: string }>,
  isUnresolved: boolean,
  isRecurring: boolean,
) {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    const existing = bucket.get(item.id) || {
      id: item.id,
      name: item.name,
      totalIssues: 0,
      unresolvedIssues: 0,
      recurringIssues: 0,
    };
    existing.totalIssues += 1;
    if (isUnresolved) existing.unresolvedIssues += 1;
    if (isRecurring) existing.recurringIssues += 1;
    bucket.set(item.id, existing);
  }
}

/**
 * Aggregate catalogue-tagged Products and Services from live issue rows without double-counting.
 */
export function aggregateIssueProductsAndServices(
  issues: Array<{
    product_id?: string | null;
    product_name?: string | null;
    service_id?: string | null;
    service_name?: string | null;
    catalogue_products?: Array<{ id: string; name: string }>;
    catalogue_services?: Array<{ id: string; name: string }>;
    status?: string;
    total_calls?: number;
  }>,
): {
  topProducts: CatalogueEntityVolumeItem[];
  topServices: CatalogueEntityVolumeItem[];
} {
  const productMap = new Map<string, CatalogueEntityVolumeItem>();
  const serviceMap = new Map<string, CatalogueEntityVolumeItem>();

  for (const issue of issues) {
    const isUnresolved = issue.status !== "resolved" && issue.status !== "closed";
    const isRecurring = (issue.total_calls ?? 1) >= 2;

    const products: Array<{ id: string; name: string }> = [
      ...(Array.isArray(issue.catalogue_products) ? issue.catalogue_products : []),
      ...(issue.product_id && issue.product_name
        ? [{ id: issue.product_id, name: issue.product_name }]
        : []),
    ];
    const services: Array<{ id: string; name: string }> = [
      ...(Array.isArray(issue.catalogue_services) ? issue.catalogue_services : []),
      ...(issue.service_id && issue.service_name
        ? [{ id: issue.service_id, name: issue.service_name }]
        : []),
    ];

    accumulateEntityList(productMap, products, isUnresolved, isRecurring);
    accumulateEntityList(serviceMap, services, isUnresolved, isRecurring);
  }

  const sortDesc = (a: CatalogueEntityVolumeItem, b: CatalogueEntityVolumeItem) =>
    b.totalIssues - a.totalIssues || b.unresolvedIssues - a.unresolvedIssues || a.name.localeCompare(b.name);

  return {
    topProducts: Array.from(productMap.values()).sort(sortDesc),
    topServices: Array.from(serviceMap.values()).sort(sortDesc),
  };
}

/**
 * Build URLSearchParams string cleanly for Customer Intelligence API & URL sync.
 */
export function buildCustomerIntelligenceQueryParams(
  filters: CustomerBoardFilterState,
): string {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.category?.trim()) params.set("category", filters.category.trim());
  if (filters.product?.trim()) params.set("product", filters.product.trim());
  if (filters.service?.trim()) params.set("service", filters.service.trim());
  if (filters.serviceArea?.trim()) params.set("serviceArea", filters.serviceArea.trim());
  if (filters.department?.trim()) params.set("department", filters.department.trim());
  if (filters.status?.trim()) params.set("status", filters.status.trim());
  if (filters.rootCause?.trim()) params.set("rootCause", filters.rootCause.trim());
  if (filters.needsReviewOnly) params.set("needsReviewOnly", "true");
  if (filters.unresolvedOnly) params.set("unresolvedOnly", "true");
  return params.toString();
}

