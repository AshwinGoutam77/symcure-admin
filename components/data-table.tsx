"use client";

import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export interface DataTableColumn {
  header: string;
  key: string;
  className?: string;
  /** "right" for numbers/amounts */
  align?: "left" | "right" | "center";
  /** Click header to sort (client-side unless onSortChange is given) */
  sortable?: boolean;
  render?: (value: any, row: Record<string, any>) => React.ReactNode;
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

interface DataTableProps {
  columns: DataTableColumn[];
  data: Record<string, any>[];
  className?: string;
  hoverable?: boolean;
  /** @deprecated zebra striping is off by default in the new design; kept for compatibility */
  striped?: boolean;
  density?: "comfortable" | "compact";
  stickyHeader?: boolean;
  loading?: boolean;
  skeletonRows?: number;
  empty?: { title?: string; description?: string; icon?: React.ReactNode };
  onRowClick?: (row: Record<string, any>) => void;
  /** Server-side sorting: receive the new sort state */
  onSortChange?: (sort: SortState) => void;
  sort?: SortState | null;

  // Pagination
  pagination?: boolean;
  currentPage?: number;
  lastPage?: number;
  total?: number;
  from?: number;
  to?: number;
  onPageChange?: (page: number) => void;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

function pageWindow(current: number, last: number, size = 5) {
  const start = Math.max(1, Math.min(current - Math.floor(size / 2), last - size + 1));
  const end = Math.min(last, start + size - 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function DataTable({
  columns, data, className, hoverable = true, density = "comfortable", stickyHeader = false,
  loading = false, skeletonRows = 6, empty, onRowClick, onSortChange, sort: controlledSort,
  pagination = false, currentPage = 1, lastPage = 1, total = 0, from = 0, to = 0, onPageChange,
}: DataTableProps) {
  const [localSort, setLocalSort] = React.useState<SortState | null>(null);
  const sort = controlledSort ?? localSort;

  const rows = React.useMemo(() => {
    if (!sort || onSortChange) return data;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const an = Number(av);
      const bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== "" && bv !== "") return (an - bn) * dir;
      return String(av).localeCompare(String(bv), "en", { numeric: true }) * dir;
    });
  }, [data, sort, onSortChange]);

  const toggleSort = (key: string) => {
    const next: SortState = sort?.key === key ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" };
    if (onSortChange) onSortChange(next);
    else setLocalSort(next);
  };

  const canPrevious = currentPage > 1;
  const canNext = currentPage < lastPage;
  const cellPad = density === "compact" ? "px-4 py-2" : "px-4 py-3.5";
  const showEmpty = !loading && rows.length === 0;

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("overflow-x-auto", stickyHeader && "max-h-[70vh] overflow-y-auto")}>
        <Table>
          <TableHeader className={cn("bg-muted/60", stickyHeader && "sticky top-0 z-10")}>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => {
                const active = sort?.key === col.key;
                const SortIcon = !active ? ArrowUpDown : sort!.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <TableHead
                    key={col.key}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      alignClass[col.align ?? "left"],
                      col.className,
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded uppercase tracking-wide transition-colors hover:text-foreground",
                          col.align === "right" && "flex-row-reverse",
                          active && "text-foreground",
                        )}
                      >
                        {col.header}
                        <SortIcon className={cn("size-3", !active && "opacity-40")} aria-hidden />
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading &&
              Array.from({ length: skeletonRows }).map((_, r) => (
                <TableRow key={`sk-${r}`} className="hover:bg-transparent">
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cellPad}>
                      <Skeleton className={cn("h-4", col.align === "right" ? "ml-auto w-16" : "w-3/4")} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading &&
              rows.map((row, idx) => (
                <TableRow
                  key={row.id ?? idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b transition-colors last:border-b-0",
                    hoverable && "hover:bg-muted/40",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={`${row.id ?? idx}-${col.key}`}
                      className={cn(cellPad, "text-sm", alignClass[col.align ?? "left"], col.align === "right" && "tabular")}
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {showEmpty && <EmptyState title={empty?.title ?? "No records found"} description={empty?.description} icon={empty?.icon} />}
      </div>

      {pagination && (
        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
          <p className="text-xs text-muted-foreground tabular">
            {total > 0 ? (
              <>
                Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
                <span className="font-medium text-foreground">{total}</span>
              </>
            ) : (
              "No records"
            )}
          </p>

          <div className="flex items-center gap-1">
            <PagerButton label="First page" disabled={!canPrevious} onClick={() => onPageChange?.(1)}>
              <ChevronsLeft className="size-4" />
            </PagerButton>
            <PagerButton label="Previous page" disabled={!canPrevious} onClick={() => onPageChange?.(currentPage - 1)}>
              <ChevronLeft className="size-4" />
            </PagerButton>

            {pageWindow(currentPage, Math.max(lastPage, 1)).map((p) => (
              <button
                key={p}
                type="button"
                aria-current={p === currentPage ? "page" : undefined}
                onClick={() => onPageChange?.(p)}
                className={cn(
                  "h-8 min-w-8 rounded-md px-2 text-xs font-medium tabular transition-colors",
                  p === currentPage ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}

            <PagerButton label="Next page" disabled={!canNext} onClick={() => onPageChange?.(currentPage + 1)}>
              <ChevronRight className="size-4" />
            </PagerButton>
            <PagerButton label="Last page" disabled={!canNext} onClick={() => onPageChange?.(lastPage)}>
              <ChevronsRight className="size-4" />
            </PagerButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PagerButton({
  children, label, disabled, onClick,
}: { children: React.ReactNode; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
