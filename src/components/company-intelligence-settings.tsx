"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CATALOGUE_ENTITIES,
  type CatalogueEntityType,
  type CatalogueInput,
  type CatalogueItem,
  type CompanyCatalogue,
  type IndustryStarterTemplate,
} from "@/lib/company-catalogue";
import type { CompanyConnectionSummary } from "@/lib/company-intelligence-bridge";
import s from "./company-intelligence.module.css";

type Tab = CatalogueEntityType | "templates";

const EMPTY: CatalogueInput = {
  name: "",
  description: "",
  categoryType: "general",
  productCategoryId: null,
  serviceCategoryId: null,
  serviceId: null,
  parentId: null,
  sku: "",
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "product", label: "Products" },
  { id: "service", label: "Services" },
  { id: "service_area", label: "Service areas" },
  { id: "issue_category", label: "Issue categories" },
  { id: "templates", label: "Templates" },
];

const ENTITY_TO_FILTER_PARAM: Record<CatalogueEntityType, string> = {
  product: "product",
  service: "service",
  service_area: "serviceArea",
  issue_category: "category",
};

const ENTITY_TO_COUNT_KEY: Record<CatalogueEntityType, keyof CompanyConnectionSummary["issueCountsByEntity"]> = {
  product: "products",
  service: "services",
  service_area: "serviceAreas",
  issue_category: "issueCategories",
};

export function CompanyIntelligenceSettings({
  embedded = false,
  onSyncSnapshot,
}: {
  embedded?: boolean;
  onSyncSnapshot?: (payload: {
    catalogue: CompanyCatalogue;
    connectionSummary: CompanyConnectionSummary | null;
  }) => void;
} = {}) {
  const [catalogue, setCatalogue] = useState<CompanyCatalogue | null>(null);
  const [connectionSummary, setConnectionSummary] = useState<CompanyConnectionSummary | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [templates, setTemplates] = useState<IndustryStarterTemplate[]>([]);
  const [tab, setTab] = useState<Tab>("product");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<{ type: CatalogueEntityType; item: CatalogueItem | null } | null>(null);
  const [form, setForm] = useState<CatalogueInput>(EMPTY);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/company-intelligence/catalogue", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw Error(json.error || "Could not load catalogue.");
    setCatalogue(json.catalogue);
    setConnectionSummary(json.connectionSummary || null);
    setCanManage(Boolean(json.canManage));
    setTemplates(json.availableTemplates || []);
    onSyncSnapshot?.({
      catalogue: json.catalogue,
      connectionSummary: json.connectionSummary || null,
    });
  }, [onSyncSnapshot]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const response = await fetch("/api/company-intelligence/catalogue", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw Error(json.error || "Could not load catalogue.");
        if (!mounted) return;
        setCatalogue(json.catalogue);
        setConnectionSummary(json.connectionSummary || null);
        setCanManage(Boolean(json.canManage));
        setTemplates(json.availableTemplates || []);
        onSyncSnapshot?.({
          catalogue: json.catalogue,
          connectionSummary: json.connectionSummary || null,
        });
      } catch (error) {
        if (mounted) {
          setNotice({
            error: true,
            text: error instanceof Error ? error.message : "Could not load catalogue.",
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [onSyncSnapshot]);

  useEffect(() => {
    if (editing) nameRef.current?.focus();
  }, [editing]);

  const run = async (action: () => Promise<string>) => {
    setPending(true);
    setNotice(null);
    try {
      const text = await action();
      await load();
      setNotice({ error: false, text });
    } catch (error) {
      setNotice({
        error: true,
        text: error instanceof Error ? error.message : "Could not save changes.",
      });
      await load().catch(() => {});
    } finally {
      setPending(false);
    }
  };

  const request = async (url: string, method: string, body: unknown) => {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) throw Error(json.error || "Could not save changes.");
    return json;
  };

  const runClassifyBackfill = async () => {
    setBackfilling(true);
    setNotice(null);
    try {
      const res = await fetch("/api/customer-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backfill", classifyUnmapped: true }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        processed?: number;
        skipped?: number;
        errors?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Could not classify existing customer issues.");
      }
      await load();
      setNotice({
        error: false,
        text: `Updated Customer Intelligence: ${json.processed ?? 0} call(s) classified against this catalogue (${json.skipped ?? 0} skipped).`,
      });
    } catch (err) {
      setNotice({
        error: true,
        text: err instanceof Error ? err.message : "Catalogue classification backfill failed.",
      });
    } finally {
      setBackfilling(false);
    }
  };

  const edit = (type: CatalogueEntityType, item: CatalogueItem | null) => {
    setEditing({ type, item });
    setForm({ ...EMPTY, ...(item || {}) });
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const { type, item } = editing;
    void run(async () => {
      await request(
        item ? `/api/company-intelligence/catalogue/${type}/${item.id}` : "/api/company-intelligence/catalogue",
        item ? "PATCH" : "POST",
        item ? form : { entityType: type, data: form },
      );
      setEditing(null);
      return `${CATALOGUE_ENTITIES[type].label} ${item ? "updated" : "created"}. Future calls and backfill runs use the active catalogue.`;
    });
  };

  const toggle = (type: CatalogueEntityType, item: CatalogueItem) =>
    void run(async () => {
      await request(`/api/company-intelligence/catalogue/${type}/${item.id}`, "PATCH", {
        isActive: !item.isActive,
      });
      return `${item.name} ${item.isActive ? "deactivated" : "activated"}. Historical issue relationships are preserved.`;
    });

  const count = (type: CatalogueEntityType) =>
    catalogue?.[CATALOGUE_ENTITIES[type].key].filter((item) => item.isActive).length || 0;

  const items =
    tab === "templates"
      ? []
      : (catalogue?.[CATALOGUE_ENTITIES[tab].key] || []).filter(
          (item) =>
            (status === "all" || (status === "active" ? item.isActive : !item.isActive)) &&
            `${item.name} ${item.description || ""}`.toLowerCase().includes(search.toLowerCase()),
        );

  const relation = (item: CatalogueItem) => {
    if ("productCategoryId" in item) {
      return catalogue?.serviceAreas.find((a) => a.id === item.productCategoryId)?.name;
    }
    if ("serviceCategoryId" in item) {
      return catalogue?.serviceAreas.find((a) => a.id === item.serviceCategoryId)?.name;
    }
    if ("serviceId" in item) {
      return catalogue?.services.find((a) => a.id === item.serviceId)?.name;
    }
    return item.categoryType?.replaceAll("_", " ");
  };

  const linkedIssueCount = (type: CatalogueEntityType, itemId: string) => {
    if (!connectionSummary) return 0;
    return connectionSummary.issueCountsByEntity[ENTITY_TO_COUNT_KEY[type]][itemId] || 0;
  };

  const exportData = catalogue
    ? {
        serviceAreas: catalogue.serviceAreas.map((a) => ({
          name: a.name,
          description: a.description,
          categoryType: a.categoryType,
          isActive: a.isActive,
        })),
        products: catalogue.products.map((p) => ({
          name: p.name,
          description: p.description,
          sku: p.sku,
          isActive: p.isActive,
          serviceAreaName: catalogue.serviceAreas.find((a) => a.id === p.productCategoryId)?.name,
        })),
        services: catalogue.services.map((a) => ({
          name: a.name,
          description: a.description,
          isActive: a.isActive,
          serviceAreaName: catalogue.serviceAreas.find((b) => b.id === a.serviceCategoryId)?.name,
        })),
        issueCategories: catalogue.issueCategories.map((a) => ({
          name: a.name,
          description: a.description,
          isActive: a.isActive,
          serviceName: catalogue.services.find((b) => b.id === a.serviceId)?.name,
        })),
      }
    : {};

  const template = templates.find((t) => t.id === selectedTemplate);

  if (loading) {
    return (
      <div className={s.loading} role="status">
        <span /> Loading your company catalogue…
      </div>
    );
  }

  const totalIssues = connectionSummary?.totalIssues ?? 0;
  const classifiedIssues = connectionSummary?.classifiedIssuesCount ?? 0;
  const unclassifiedIssues = connectionSummary?.unclassifiedIssuesCount ?? 0;
  const unanalyzedCalls = connectionSummary?.unanalyzedCallsCount ?? 0;
  const coveragePct = totalIssues > 0 ? Math.round((classifiedIssues / totalIssues) * 100) : null;

  return (
    <div className={s.page}>
      {!embedded ? (
        <header className={s.header}>
          <div>
            <p className={s.kicker}>COMPANY INTELLIGENCE</p>
            <h2>Products &amp; services</h2>
            <p>
              Teach Zetro what your company offers so Customer Intelligence classifies calls, issues,
              and repeat contacts accurately.
            </p>
          </div>
          <Link href="/customers" className={s.backLink}>
            Customer Intelligence ↗
          </Link>
        </header>
      ) : null}

      {notice ? (
        <div role={notice.error ? "alert" : "status"} className={`${s.notice} ${notice.error ? s.error : ""}`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">
            ×
          </button>
        </div>
      ) : null}

      {!catalogue ? (
        <div className={s.empty}>
          <h3>Your catalogue couldn’t load</h3>
          <p>Check the connection and try again.</p>
          <button type="button" onClick={() => void run(async () => "Catalogue refreshed.")}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {catalogue.migrationRequired ? (
            <div className={`${s.notice} ${s.error}`}>
              Catalogue database setup is required. Existing calls and QA remain available;
              catalogue changes cannot be saved yet.
            </div>
          ) : null}
          {catalogue.upgradeRequired ? (
            <div className={s.notice}>
              Catalogue editing is available. Apply the catalogue connection upgrade to enable
              classification audit history and manual corrections.
            </div>
          ) : null}
          {!canManage ? (
            <div className={s.notice}>
              You can explore this catalogue. Ask a workspace administrator to add or edit entries.
            </div>
          ) : null}

          <div className={s.summary}>
            <div>
              <span className={s.statusDot} data-ready={catalogue.isConfigured} />
              <strong>
                {catalogue.isConfigured ? "Connected to Customer Intelligence" : "Ready when you are"}
              </strong>
              <p>
                {catalogue.isConfigured
                  ? coveragePct !== null
                    ? `${classifiedIssues} of ${totalIssues} customer issues (${coveragePct}%) are currently mapped to this catalogue.`
                    : "Active entries guide call classification, service-area reporting, and customer journeys."
                  : "Add your products and services manually, apply a starter template, or sync via Sources & sync."}
              </p>
            </div>
            <div className={s.counts}>
              {TABS.filter((t) => t.id !== "templates").map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setSearch("");
                  }}
                >
                  <strong>{count(t.id as CatalogueEntityType)}</strong>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {connectionSummary && (totalIssues > 0 || unanalyzedCalls > 0) ? (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3E9F5] bg-[#F8FAFF] px-5 py-3.5 text-[12.5px]">
              <div className="flex flex-wrap items-center gap-3 text-[#0A1A3F]">
                <span className="font-semibold">Live Customer Intelligence sync:</span>
                <span className="rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-0.5 font-semibold text-[#15803D] tabular-nums">
                  {classifiedIssues} classified
                </span>
                <Link
                  href="/customers?category=unclassified"
                  className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 font-semibold text-[#B45309] tabular-nums hover:underline"
                >
                  {unclassifiedIssues} unclassified →
                </Link>
                {unanalyzedCalls > 0 ? (
                  <span className="rounded-full border border-[#BFDBFE] bg-[#EEF3FF] px-2.5 py-0.5 font-semibold text-[#2459E8] tabular-nums">
                    {unanalyzedCalls} unanalyzed calls
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {catalogue.isConfigured && (unclassifiedIssues > 0 || unanalyzedCalls > 0) ? (
                  <button
                    type="button"
                    disabled={backfilling || pending}
                    onClick={() => void runClassifyBackfill()}
                    className="rounded-lg bg-[#2459E8] px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1C4ACF] disabled:opacity-60"
                  >
                    {backfilling ? "Classifying issues…" : "Classify existing issues with catalogue"}
                  </button>
                ) : null}
                <Link
                  href="/customers"
                  className="rounded-lg border border-[#E3E9F5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0A1A3F] hover:bg-[#EEF3FF]"
                >
                  Explore in Customer Intelligence →
                </Link>
              </div>
            </div>
          ) : null}

          <nav className={s.tabs} aria-label="Company catalogue sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tab === t.id}
                onClick={() => {
                  setTab(t.id);
                  setSearch("");
                  setEditing(null);
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab !== "templates" ? (
            <>
              <div className={s.toolbar}>
                <div className={s.search}>
                  <span aria-hidden>⌕</span>
                  <input
                    type="search"
                    aria-label="Search catalogue"
                    placeholder={`Search ${TABS.find((t) => t.id === tab)?.label.toLowerCase()}…`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Entry status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button
                  type="button"
                  className={s.primary}
                  disabled={!canManage || pending || catalogue.migrationRequired}
                  onClick={() => edit(tab, null)}
                >
                  + Add {CATALOGUE_ENTITIES[tab].label.toLowerCase()}
                </button>
              </div>

              {editing ? (
                <section className={s.editor} aria-label="Catalogue entry editor">
                  <div className={s.editorHeading}>
                    <h3>
                      {editing.item ? "Edit" : "Add"}{" "}
                      {CATALOGUE_ENTITIES[editing.type].label.toLowerCase()}
                    </h3>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setEditing(null)}
                      aria-label="Close editor"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={save}>
                    <label>
                      Name
                      <input
                        ref={nameRef}
                        required
                        maxLength={160}
                        value={form.name || ""}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        rows={3}
                        maxLength={4000}
                        placeholder="Describe what this covers, using the terms your customers use."
                        value={form.description || ""}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </label>
                    <div className={s.formGrid}>
                      {editing.type === "product" || editing.type === "service" ? (
                        <label>
                          Service area
                          <select
                            value={
                              (editing.type === "product"
                                ? form.productCategoryId
                                : form.serviceCategoryId) || ""
                            }
                            onChange={(e) =>
                              setForm({
                                ...form,
                                [editing.type === "product"
                                  ? "productCategoryId"
                                  : "serviceCategoryId"]: e.target.value || null,
                              })
                            }
                          >
                            <option value="">Not assigned</option>
                            {catalogue.serviceAreas
                              .filter(
                                (a) =>
                                  a.isActive ||
                                  a.id === form.productCategoryId ||
                                  a.id === form.serviceCategoryId,
                              )
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                  {a.isActive ? "" : " (inactive)"}
                                </option>
                              ))}
                          </select>
                        </label>
                      ) : null}
                      {editing.type === "product" ? (
                        <label>
                          SKU / reference (optional)
                          <input
                            value={form.sku || ""}
                            onChange={(e) => setForm({ ...form, sku: e.target.value })}
                          />
                        </label>
                      ) : null}
                      {editing.type === "service_area" ? (
                        <>
                          <label>
                            Area type
                            <input
                              placeholder="e.g. operations, department, clinical"
                              value={form.categoryType || "general"}
                              onChange={(e) => setForm({ ...form, categoryType: e.target.value })}
                            />
                          </label>
                          <label>
                            Parent area
                            <select
                              value={form.parentId || ""}
                              onChange={(e) =>
                                setForm({ ...form, parentId: e.target.value || null })
                              }
                            >
                              <option value="">Top-level area</option>
                              {catalogue.serviceAreas
                                .filter((a) => a.isActive && a.id !== editing.item?.id)
                                .map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name}
                                  </option>
                                ))}
                            </select>
                          </label>
                        </>
                      ) : null}
                      {editing.type === "issue_category" ? (
                        <label>
                          Related service
                          <select
                            value={form.serviceId || ""}
                            onChange={(e) => setForm({ ...form, serviceId: e.target.value || null })}
                          >
                            <option value="">General / no specific service</option>
                            {catalogue.services
                              .filter((a) => a.isActive || a.id === form.serviceId)
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                  {a.isActive ? "" : " (inactive)"}
                                </option>
                              ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                    <div className={s.formActions}>
                      <button type="button" disabled={pending} onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                      <button className={s.primary} disabled={pending}>
                        {pending ? "Saving…" : "Save entry"}
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}

              {items.length ? (
                <div className={s.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>{CATALOGUE_ENTITIES[tab].label}</th>
                        <th>
                          {tab === "issue_category"
                            ? "Related service"
                            : tab === "service_area"
                              ? "Area type"
                              : "Service area"}
                        </th>
                        <th>Linked issues</th>
                        <th>Status</th>
                        <th>
                          <span className={s.srOnly}>Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const issuesLinked = linkedIssueCount(tab, item.id);
                        return (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.name}</strong>
                              <p>{item.description || "Add a description to improve classification context."}</p>
                            </td>
                            <td>{relation(item) || <span className={s.muted}>Not assigned</span>}</td>
                            <td>
                              {issuesLinked > 0 ? (
                                <Link
                                  href={`/customers?${ENTITY_TO_FILTER_PARAM[tab]}=${encodeURIComponent(item.id)}`}
                                  className="inline-flex items-center gap-1 rounded-md border border-[#BFDBFE] bg-[#EEF3FF] px-2 py-0.5 text-[11px] font-semibold text-[#2459E8] hover:underline"
                                >
                                  {issuesLinked} issue{issuesLinked === 1 ? "" : "s"} →
                                </Link>
                              ) : (
                                <span className={s.muted}>0 issues</span>
                              )}
                            </td>
                            <td>
                              <span className={item.isActive ? s.active : s.inactive}>
                                {item.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <div className={s.rowActions}>
                                <button
                                  type="button"
                                  disabled={!canManage || pending}
                                  onClick={() => edit(tab, item)}
                                  aria-label={`Edit ${item.name}`}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={!canManage || pending}
                                  onClick={() => toggle(tab, item)}
                                  aria-label={`${item.isActive ? "Deactivate" : "Activate"} ${item.name}`}
                                >
                                  {item.isActive ? "Deactivate" : "Activate"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={s.empty}>
                  <span className={s.emptyIcon} aria-hidden>
                    ▤
                  </span>
                  <h3>
                    {search || status !== "all"
                      ? "No matching entries"
                      : `Your ${TABS.find((t) => t.id === tab)?.label.toLowerCase()} start here`}
                  </h3>
                  <p>
                    {search || status !== "all"
                      ? "Try another search or change the status filter."
                      : "Use your company's own names and descriptions. Zetro uses these to classify calls and customer issues."}
                  </p>
                  {!search && status === "all" ? (
                    <button
                      type="button"
                      disabled={!canManage || catalogue.migrationRequired}
                      className={s.primary}
                      onClick={() => edit(tab, null)}
                    >
                      Add your first entry ↗
                    </button>
                  ) : null}
                </div>
              )}

              <div className={s.tableFoot}>
                <span>
                  {items.length} {items.length === 1 ? "entry" : "entries"} in this view
                </span>
                <span>Deactivation preserves history.</span>
              </div>
            </>
          ) : (
            <div className={s.templates}>
              <div>
                <h3>A starting point, never a requirement.</h3>
                <p>
                  Preview a template, then add its suggestions to your catalogue. Existing entries
                  stay unchanged. You can edit every suggestion afterwards.
                </p>
              </div>
              <div className={s.templateGrid}>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={selectedTemplate === t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                  >
                    <span>
                      {t.name}
                      <i>↗</i>
                    </span>
                    <p>{t.description}</p>
                    <small>
                      {t.serviceAreas.length} areas · {t.services.length} services ·{" "}
                      {t.products.length} products
                    </small>
                  </button>
                ))}
              </div>
              {template ? (
                <section className={s.templatePreview} aria-label="Template preview">
                  <h3>{template.name}</h3>
                  <div className={s.previewGrid}>
                    {[
                      ["Service areas", template.serviceAreas],
                      ["Services", template.services],
                      ["Products", template.products],
                      ["Issue categories", template.issueCategories],
                    ].map(([label, list]) => (
                      <div key={label as string}>
                        <h4>{label as string}</h4>
                        <ul>
                          {(list as Array<{ name: string }>).map((item) => (
                            <li key={item.name}>{item.name}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={s.primary}
                    disabled={!canManage || pending || catalogue.migrationRequired}
                    onClick={() =>
                      void run(async () => {
                        const result = await request("/api/company-intelligence/apply-template", "POST", {
                          templateId: template.id,
                        });
                        return result.message;
                      })
                    }
                  >
                    {pending ? "Adding entries…" : `Add ${template.name} suggestions`}
                  </button>
                </section>
              ) : null}
            </div>
          )}

          <section className={s.importSection}>
            <div>
              <h3>Bring your own catalogue</h3>
              <p>
                Import a JSON file, or export this catalogue as a reusable company template. Import
                adds entries without replacing history.
              </p>
            </div>
            <div className={s.importActions}>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className={s.srOnly}
                aria-label="Import catalogue JSON"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 1000000) throw Error("Use a JSON file smaller than 1 MB.");
                    const data = JSON.parse(await file.text());
                    if (!data || typeof data !== "object" || Array.isArray(data)) {
                      throw Error("Import must be a catalogue object.");
                    }
                    setImportData(data);
                  } catch (error) {
                    setNotice({
                      error: true,
                      text: error instanceof Error ? error.message : "Invalid JSON file.",
                    });
                  }
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={!canManage || pending || catalogue.migrationRequired}
                onClick={() => fileRef.current?.click()}
              >
                Import JSON ↗
              </button>
              <a
                href={`data:application/json;charset=utf-8,${encodeURIComponent(
                  JSON.stringify(exportData, null, 2),
                )}`}
                download="zetro-company-catalogue.json"
              >
                Export catalogue ↓
              </a>
            </div>
          </section>

          {importData ? (
            <section className={s.editor} aria-label="Import preview">
              <h3>Review your import</h3>
              <p>
                {["serviceAreas", "products", "services", "issueCategories"]
                  .map(
                    (key) =>
                      `${Array.isArray(importData[key]) ? importData[key].length : 0} ${key
                        .replace(/([A-Z])/g, " $1")
                        .toLowerCase()}`,
                  )
                  .join(" · ")}
              </p>
              <p>
                Existing names are skipped. Related entries must belong to this workspace. If saving
                fails partway, successfully created entries remain visible.
              </p>
              <div className={s.formActions}>
                <button type="button" disabled={pending} onClick={() => setImportData(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={s.primary}
                  disabled={pending}
                  onClick={() =>
                    void run(async () => {
                      const result = await request(
                        "/api/company-intelligence/import",
                        "POST",
                        importData,
                      );
                      setImportData(null);
                      return result.message;
                    })
                  }
                >
                  {pending ? "Importing…" : "Confirm import"}
                </button>
              </div>
            </section>
          ) : null}

          <footer className={s.connectionNote}>
            <span>↳</span>
            <p>
              <strong>One catalogue, connected context.</strong> Active entries inform future call
              classification, service-area reporting, and customer journeys. Use &ldquo;Classify
              existing issues&rdquo; above whenever you add offerings.
            </p>
            <Link href="/customers">Explore intelligence ↗</Link>
          </footer>
        </>
      )}
    </div>
  );
}
