"use client";

import { useState } from "react";
import { Download, RefreshCw, SearchX, TextSearch } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InlineError,
  ListCard,
  ListFooter,
  NoAccess,
  SearchInput,
  filterSelectClass,
  useDebounced,
} from "@/components/admin/kit";
import { exportPatientSearchLogs, getPatientSearchLogs } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";
import { usePermission } from "@/hooks/use-permission";
import { normalizeList } from "@/lib/list";
import { apiErrorMessage } from "@/lib/api/errors";
import { formatDateTime, formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const LIMIT = 25;

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "text_asc", label: "Text A → Z" },
  { value: "text_desc", label: "Text Z → A" },
  { value: "results_asc", label: "Fewest results" },
  { value: "results_desc", label: "Most results" },
];

export default function PatientSearchLogsPage() {
  const perm = usePermission("patient_search_logs");

  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [zeroOnly, setZeroOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const debouncedSearch = useDebounced(search);

  const filters = {
    search: debouncedSearch.trim(),
    source,
    zero_results: zeroOnly ? 1 : undefined,
    date_from: dateFrom,
    date_to: dateTo,
    sort,
  };
  const params = { ...filters, page, limit: LIMIT };

  const query = useAdminQuery(() => getPatientSearchLogs(params), ["admin", "patient-search-logs", params], perm.view);
  const list = normalizeList(query.data, page, LIMIT);

  async function handleExport() {
    setExporting(true);
    setExportError("");
    try {
      await exportPatientSearchLogs(filters);
    } catch (error) {
      setExportError(apiErrorMessage(error, "Export failed."));
    } finally {
      setExporting(false);
    }
  }

  const columns: DataTableColumn[] = [
    { header: "Searched", key: "created_at", render: (v) => <span className="whitespace-nowrap text-xs">{formatDateTime(v)}</span> },
    {
      header: "Search text",
      key: "search_text",
      render: (v, row) => (
        <div className="min-w-[160px]">
          <p className="font-medium text-foreground">{v}</p>
          {row.normalized_text && row.normalized_text !== String(v ?? "").toLowerCase() && (
            <p className="text-xs text-muted-foreground">{row.normalized_text}</p>
          )}
        </div>
      ),
    },
    {
      header: "Results",
      key: "result_count",
      align: "right",
      render: (v) => (
        <span className={cn("tabular font-medium", Number(v) === 0 ? "text-destructive" : "text-foreground")}>{formatNumber(v ?? 0)}</span>
      ),
    },
    {
      header: "Source",
      key: "source",
      render: (v) => <StatusBadge tone={v === "advanced" ? "violet" : "info"} dot={false}>{v === "advanced" ? "Advanced" : "Home"}</StatusBadge>,
    },
    {
      header: "Filters used",
      key: "qualification_specialization",
      render: (_, row) => {
        const parts = [row.qualification_specialization?.name, row.city?.name].filter(Boolean);
        return <span className="text-xs text-muted-foreground">{parts.length ? parts.join(" · ") : "—"}</span>;
      },
    },
    {
      header: "Patient",
      key: "patient",
      render: (patient) =>
        patient ? (
          <div className="min-w-[140px]">
            <p className="text-sm text-foreground">{patient.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {[patient.account_code, patient.mobile].filter(Boolean).join(" · ")}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Guest / deleted</span>
        ),
    },
  ];

  if (!perm.loading && !perm.view) return <NoAccess />;

  const hasFilters = Boolean(search || source || zeroOnly || dateFrom || dateTo);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Business" }, { label: "Patient Search Logs" }]}
        title="Patient Search Logs"
        description="What patients typed into the app's doctor search. Use “No results only” to find words that need an App Search Keyword."
        actions={
          perm.export && (
            <Button type="button" variant="outline" className="h-9 gap-1.5 text-xs" onClick={() => void handleExport()} disabled={exporting}>
              {exporting ? <RefreshCw className="size-4 animate-spin" /> : <Download className="size-4" />}
              Export CSV
            </Button>
          )
        }
      />

      <InlineError className="mb-4">{exportError}</InlineError>

      <ListCard
        title="Searches"
        subtitle={query.isLoading ? "Loading…" : `${formatNumber(list.total)} search${list.total === 1 ? "" : "es"}`}
        error={query.error ? apiErrorMessage(query.error) : undefined}
        filters={
          <>
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Text contains…"
              className="sm:w-[220px]"
            />
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
              }}
              className={filterSelectClass}
            >
              <option value="">All sources</option>
              <option value="home">Home search</option>
              <option value="advanced">Advanced search</option>
            </select>
            <Input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-9 w-[150px] bg-muted/50 text-xs"
              aria-label="From date"
            />
            <Input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-9 w-[150px] bg-muted/50 text-xs"
              aria-label="To date"
            />
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className={filterSelectClass}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setZeroOnly((v) => !v);
                setPage(1);
              }}
              aria-pressed={zeroOnly}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition",
                zeroOnly
                  ? "border-destructive/30 bg-destructive-soft text-destructive"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              <SearchX className="size-4" /> No results only
            </button>
          </>
        }
        footer={<ListFooter list={list} onPageChange={setPage} disabled={query.isFetching} />}
      >
        <DataTable
          columns={columns}
          data={list.rows}
          loading={query.isLoading}
          empty={{
            icon: <TextSearch className="size-5" />,
            title: "No searches found",
            description: hasFilters ? "Try widening the date range or clearing filters." : "Patient searches will appear here.",
          }}
        />
      </ListCard>
    </>
  );
}
