"use client";

import { memo, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Rows3,
  Search,
} from "lucide-react";
import { Popover } from "radix-ui";
import { cn } from "@/lib/cn";
import {
  EmptyState,
  ErrorState,
  SkeletonBlock,
} from "@/components/dashboard/primitives";
import type { DashboardCopy } from "@/lib/i18n/dashboard";
import type { FilterSortBy } from "@/features/filters/use-dashboard-filters";

export type TableDensity = "comfortable" | "compact";

export type ServerTableProps<T extends { id: string }> = {
  title: string;
  subtitle?: string;
  data: T[];
  columns: ColumnDef<T, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sortBy: FilterSortBy;
  sortDir: "asc" | "desc";
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSortChange: (sortBy: FilterSortBy, sortDir: "asc" | "desc") => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick?: (row: T) => void;
  bulkActions?: Array<{
    id: string;
    label: string;
    tone?: "default" | "warn" | "danger";
    disabled?: boolean;
    onExecute: (selectedIds: string[]) => Promise<void> | void;
  }>;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyVariant: "first-run" | "filtered";
  onClearFilters?: () => void;
  searchPlaceholder: string;
  copy: DashboardCopy;
};

const ROW_HEIGHT = {
  comfortable: 56,
  compact: 42,
} as const;

export function DataTable<T extends { id: string }>({
  title,
  subtitle,
  data,
  columns,
  total,
  page,
  pageSize,
  totalPages,
  sortBy,
  sortDir,
  searchValue,
  onSearchChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  bulkActions,
  isLoading,
  isFetching,
  error,
  onRetry,
  emptyVariant,
  onClearFilters,
  searchPlaceholder,
  copy,
}: ServerTableProps<T>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [density, setDensity] = useState<TableDensity>("comfortable");
  const [bulkBusy, setBulkBusy] = useState(false);

  const selectionColumn = useMemo<ColumnDef<T, unknown>>(
    () => ({
      id: "__select",
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Select all visible rows"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-[var(--z-border-strong)] accent-[var(--z-accent)] cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="Select row"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-[var(--z-border-strong)] accent-[var(--z-accent)] cursor-pointer"
        />
      ),
      enableHiding: false,
      size: 40,
    }),
    [],
  );

  const allColumns = useMemo(
    () => (bulkActions && bulkActions.length > 0 ? [selectionColumn, ...columns] : columns),
    [bulkActions, selectionColumn, columns],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId: (row) => row.id,
    state: {
      columnVisibility,
      rowSelection,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  const rows = table.getRowModel().rows;
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  // Virtualize large pages smoothly when scrolling inside the sticky-header container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const useVirtual = rows.length >= 25;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT[density],
    overscan: 8,
    enabled: useVirtual,
  });

  async function runBulk(fn: (ids: string[]) => Promise<void> | void) {
    if (!selectedIds.length || bulkBusy) return;
    setBulkBusy(true);
    try {
      await fn(selectedIds);
      setRowSelection({});
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <section className="z-card overflow-hidden flex flex-col" aria-label={title}>
      {/* Card Header + Search + Controls */}
      <div className="p-6 border-b border-[var(--z-border)] flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="z-display text-[15px] font-semibold text-[var(--z-ink)]">{title}</h2>
            <span className="rounded-[var(--z-radius-control)] bg-[var(--z-surface-muted)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--z-ink-secondary)] z-tabular">
              {total}
            </span>
            {isFetching && !isLoading ? (
              <span className="text-[11.5px] font-medium text-[var(--z-accent)]">
                Syncing…
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-[12.5px] text-[var(--z-ink-muted)]">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Table Search */}
          <div className="relative flex-1 min-w-[220px] sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--z-ink-muted)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="z-focus h-9 w-full rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] pl-8.5 pr-3 text-[12.5px] text-[var(--z-ink)] placeholder:text-[var(--z-ink-muted)] focus:bg-[var(--z-surface)] focus:border-[var(--z-accent)]"
            />
          </div>

          {/* Density Toggle */}
          <button
            type="button"
            onClick={() => setDensity((d) => (d === "comfortable" ? "compact" : "comfortable"))}
            aria-label={`Row density: ${density}`}
            className="z-focus inline-flex h-9 items-center gap-1.5 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-3 text-[12px] font-semibold text-[var(--z-ink-secondary)] hover:text-[var(--z-ink)] hover:border-[var(--z-border-strong)]"
          >
            <Rows3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {density === "compact"
                ? copy.overview.densityCompact
                : copy.overview.densityComfortable}
            </span>
          </button>

          {/* Column Visibility Popover */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                className="z-focus inline-flex h-9 items-center gap-1.5 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-3 text-[12px] font-semibold text-[var(--z-ink-secondary)] hover:text-[var(--z-ink)] hover:border-[var(--z-border-strong)]"
              >
                <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{copy.overview.columnsToggle}</span>
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={6}
                className="z-50 z-panel p-3 w-52 space-y-1.5"
              >
                <div className="px-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--z-ink-muted)]">
                  Visible Columns
                </div>
                {table
                  .getAllLeafColumns()
                  .filter((col) => col.getCanHide())
                  .map((col) => {
                    const label =
                      typeof col.columnDef.header === "string"
                        ? col.columnDef.header
                        : col.id;
                    return (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 rounded-[6px] px-1.5 py-1 text-[12.5px] text-[var(--z-ink)] hover:bg-[var(--z-surface-muted)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={col.getIsVisible()}
                          onChange={col.getToggleVisibilityHandler()}
                          className="h-3.5 w-3.5 accent-[var(--z-accent)]"
                        />
                        <span className="truncate">{label}</span>
                      </label>
                    );
                  })}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>

      {/* Contextual Multi-Select Bulk Action Bar */}
      {selectedIds.length > 0 && bulkActions && bulkActions.length > 0 ? (
        <div
          role="region"
          aria-label="Bulk selection actions"
          className="px-6 py-2.5 bg-[var(--z-accent-tint)] border-b border-[var(--z-border)] flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] font-semibold text-[var(--z-ink)] z-tabular">
              {selectedIds.length} {copy.overview.selectedCountSuffix}
            </span>
            <button
              type="button"
              onClick={() => setRowSelection({})}
              className="z-focus text-[12px] font-medium text-[var(--z-accent)] hover:underline"
            >
              Clear selection
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions.map((act) => (
              <button
                key={act.id}
                type="button"
                disabled={bulkBusy || act.disabled}
                onClick={() => void runBulk(act.onExecute)}
                className={cn(
                  "z-focus h-8 rounded-[var(--z-radius-control)] border px-3 text-[12px] font-semibold transition-colors disabled:opacity-45",
                  act.tone === "danger"
                    ? "border-[var(--z-fail)] bg-[var(--z-surface)] text-[var(--z-fail)] hover:bg-[var(--z-fail-tint)]"
                    : act.tone === "warn"
                      ? "border-[var(--z-warn)] bg-[var(--z-surface)] text-[var(--z-warn)] hover:bg-[var(--z-warn-tint)]"
                      : "border-[var(--z-border-strong)] bg-[var(--z-surface)] text-[var(--z-ink)] hover:bg-[var(--z-surface-muted)]",
                )}
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Table Body States */}
      {isLoading ? (
        <div className="p-6 space-y-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-4 items-center py-2">
              <SkeletonBlock className="h-4 w-36 col-span-2" />
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-5 w-16" />
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-6 w-20 justify-self-end" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6">
          <ErrorState error={error} copy={copy.states} onRetry={onRetry} />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6">
          <EmptyState
            variant={emptyVariant}
            copy={copy.states}
            onClearFilters={onClearFilters}
          />
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className={cn(
            "overflow-x-auto overflow-y-auto",
            useVirtual ? "max-h-[540px]" : "max-h-[680px]",
          )}
        >
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[var(--z-surface-muted)] border-b border-[var(--z-border)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as
                      | { sortKey?: FilterSortBy; align?: "right" | "left" }
                      | undefined;
                    const sortKey = meta?.sortKey;
                    const isSorted = sortKey != null && sortBy === sortKey;
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        className={cn(
                          "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--z-ink-muted)] whitespace-nowrap select-none",
                          meta?.align === "right" && "text-right",
                        )}
                      >
                        {header.isPlaceholder ? null : sortKey ? (
                          <button
                            type="button"
                            onClick={() => {
                              const nextDir =
                                isSorted && sortDir === "desc" ? "asc" : "desc";
                              onSortChange(sortKey, nextDir);
                            }}
                            className="z-focus inline-flex items-center gap-1 hover:text-[var(--z-ink)] transition-colors"
                          >
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </span>
                            {isSorted ? (
                              sortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-[var(--z-accent)]" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-[var(--z-accent)]" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-50" />
                            )}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--z-border)] text-[13px]">
              {useVirtual ? (
                <>
                  {rowVirtualizer.getVirtualItems().length > 0 &&
                  rowVirtualizer.getVirtualItems()[0].start > 0 ? (
                    <tr aria-hidden="true">
                      <td
                        colSpan={allColumns.length}
                        style={{ height: rowVirtualizer.getVirtualItems()[0].start }}
                      />
                    </tr>
                  ) : null}

                  {rowVirtualizer.getVirtualItems().map((vRow) => {
                    const row = rows[vRow.index];
                    return (
                      <MemoTableRow
                        key={row.id}
                        row={row}
                        density={density}
                        onRowClick={onRowClick}
                      />
                    );
                  })}

                  {rowVirtualizer.getVirtualItems().length > 0 ? (
                    <tr aria-hidden="true">
                      <td
                        colSpan={allColumns.length}
                        style={{
                          height:
                            rowVirtualizer.getTotalSize() -
                            (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0),
                        }}
                      />
                    </tr>
                  ) : null}
                </>
              ) : (
                rows.map((row) => (
                  <MemoTableRow
                    key={row.id}
                    row={row}
                    density={density}
                    onRowClick={onRowClick}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Server Pagination Footer */}
      <div className="px-6 py-3.5 border-t border-[var(--z-border)] flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-[var(--z-ink-secondary)]">
        <div className="z-tabular">
          Page <strong className="text-[var(--z-ink)]">{page}</strong> of{" "}
          <strong className="text-[var(--z-ink)]">{totalPages}</strong> ·{" "}
          <strong className="text-[var(--z-ink)]">{total}</strong> total
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-[12px]">
            <span>Rows</span>
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="z-focus h-8 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-2 text-[12px] text-[var(--z-ink)]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>

          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="z-focus inline-flex h-8 w-8 items-center justify-center rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] text-[var(--z-ink)] hover:bg-[var(--z-surface-muted)] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="z-focus inline-flex h-8 w-8 items-center justify-center rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] text-[var(--z-ink)] hover:bg-[var(--z-surface-muted)] disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const MemoTableRow = memo(function MemoTableRow<T>({
  row,
  density,
  onRowClick,
}: {
  row: ReturnType<ReturnType<typeof useReactTable<T>>["getRowModel"]>["rows"][number];
  density: TableDensity;
  onRowClick?: (original: T) => void;
}) {
  return (
    <tr
      onClick={() => onRowClick?.(row.original)}
      tabIndex={onRowClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onRowClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onRowClick(row.original);
        }
      }}
      className={cn(
        "transition-colors hover:bg-[var(--z-surface-muted)] focus-visible:outline-none focus-visible:bg-[var(--z-accent-tint)]",
        row.getIsSelected() && "bg-[var(--z-accent-tint)]",
        onRowClick && "cursor-pointer",
      )}
    >
      {row.getVisibleCells().map((cell) => {
        const meta = cell.column.columnDef.meta as { align?: "right" | "left" } | undefined;
        return (
          <td
            key={cell.id}
            className={cn(
              "px-4 align-middle",
              density === "compact" ? "py-2" : "py-3.5",
              meta?.align === "right" && "text-right",
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
}) as <T>(props: {
  row: ReturnType<ReturnType<typeof useReactTable<T>>["getRowModel"]>["rows"][number];
  density: TableDensity;
  onRowClick?: (original: T) => void;
}) => React.ReactElement;

