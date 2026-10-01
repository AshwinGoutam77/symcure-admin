"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { getActivityLogs } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";

import { DataTable } from "@/components/data-table";
import { Pagination } from "@/components/pagination";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function AuditLogPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* =========================================================
     INITIAL URL VALUES
  ========================================================== */

  const initialSearch =
    searchParams.get("search") ?? "";

  const initialModule =
    searchParams.get("module") ?? "";

  const initialDateFrom =
    searchParams.get("date_from") ?? "";

  const initialDateTo =
    searchParams.get("date_to") ?? "";

  const initialSort =
    searchParams.get("sort") ?? "desc";

  const initialPage = Math.max(
    1,
    Number(
      searchParams.get("page") ?? "1",
    ) || 1,
  );

  /* =========================================================
     STATE
  ========================================================== */

  const [search, setSearch] =
    useState(initialSearch);

  const [module, setModule] =
    useState(initialModule);

  const [dateFrom, setDateFrom] =
    useState(initialDateFrom);

  const [dateTo, setDateTo] =
    useState(initialDateTo);

  const [sort, setSort] =
    useState(initialSort);

  const [page, setPage] =
    useState(initialPage);

  const limit = 20;

  /* =========================================================
     UPDATE URL
  ========================================================== */

  const updateListUrl = (
    nextSearch: string,
    nextModule: string,
    nextDateFrom: string,
    nextDateTo: string,
    nextSort: string,
    nextPage: number,
  ) => {
    const params =
      new URLSearchParams();

    if (nextSearch.trim()) {
      params.set(
        "search",
        nextSearch.trim(),
      );
    }

    if (nextModule.trim()) {
      params.set(
        "module",
        nextModule.trim(),
      );
    }

    if (nextDateFrom) {
      params.set(
        "date_from",
        nextDateFrom,
      );
    }

    if (nextDateTo) {
      params.set(
        "date_to",
        nextDateTo,
      );
    }

    if (nextSort) {
      params.set(
        "sort",
        nextSort,
      );
    }

    params.set(
      "page",
      String(
        Math.max(1, nextPage),
      ),
    );

    const query =
      params.toString();

    router.replace(
      query
        ? `${pathname}?${query}`
        : pathname,
      {
        scroll: false,
      },
    );
  };

  /* =========================================================
     SYNC URL -> STATE
  ========================================================== */

  useEffect(() => {
    const urlSearch =
      searchParams.get("search") ?? "";

    const urlModule =
      searchParams.get("module") ?? "";

    const urlDateFrom =
      searchParams.get("date_from") ?? "";

    const urlDateTo =
      searchParams.get("date_to") ?? "";

    const urlSort =
      searchParams.get("sort") ?? "desc";

    const urlPage = Math.max(
      1,
      Number(
        searchParams.get("page") ?? "1",
      ) || 1,
    );

    setSearch((current) =>
      current === urlSearch
        ? current
        : urlSearch,
    );

    setModule((current) =>
      current === urlModule
        ? current
        : urlModule,
    );

    setDateFrom((current) =>
      current === urlDateFrom
        ? current
        : urlDateFrom,
    );

    setDateTo((current) =>
      current === urlDateTo
        ? current
        : urlDateTo,
    );

    setSort((current) =>
      current === urlSort
        ? current
        : urlSort,
    );

    setPage((current) =>
      current === urlPage
        ? current
        : urlPage,
    );
  }, [searchParams]);

  /* =========================================================
     API
  ========================================================== */

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAdminQuery(
    () =>
      getActivityLogs({
        search,
        module,
        date_from: dateFrom,
        date_to: dateTo,
        sort,
        page,
        limit,
      }),
    [
      "admin",
      "activity-logs",
      {
        search,
        module,
        dateFrom,
        dateTo,
        sort,
        page,
        limit: 20,
      },
    ],
  );

  /* =========================================================
     RESPONSE
  ========================================================== */

  const payload: any =
    data ?? {};

  const rows: any[] =
    Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
        ? payload.data
        : [];

  const meta =
    payload.meta ?? {};

  const total =
    Number(
      meta.total ??
        rows.length,
    );

  const currentPage =
    Number(
      meta.current_page ??
        page,
    );

  const lastPage =
    Number(
      meta.last_page ??
        1,
    );

  const perPage =
    Number(
      meta.per_page ??
        limit,
    );

  /* =========================================================
     FILTERS
  ========================================================== */

  const hasFilters =
    Boolean(search) ||
    Boolean(module) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    sort !== "desc";

  const clearFilters = () => {
    setSearch("");
    setModule("");
    setDateFrom("");
    setDateTo("");
    setSort("desc");
    setPage(1);

    updateListUrl(
      "",
      "",
      "",
      "",
      "desc",
      1,
    );
  };

  /* =========================================================
     RECORD RANGE
  ========================================================== */

  const startRecord =
    total === 0
      ? 0
      : (currentPage - 1) *
          perPage +
        1;

  const endRecord =
    total === 0
      ? 0
      : Math.min(
          startRecord +
            rows.length -
            1,
          total,
        );

  /* =========================================================
     RENDER
  ========================================================== */

  return (
    <div className="w-full">
      <div className="w-full">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            {/* Breadcrumb */}
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground/80">
              <span>
                Administration
              </span>

              <span className="text-muted-foreground/50">
                /
              </span>

              <span className="text-muted-foreground">
                Audit Log
              </span>
            </div>

            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
              Audit Log
            </h1>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Immutable admin activity trail
            </p>

          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={isFetching}
            onClick={() =>
              void refetch()
            }
          >
            <RefreshCw
              className={`mr-2 size-4 ${
                isFetching
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </Button>

        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive-soft p-4 text-sm text-destructive">

            <ShieldAlert className="mt-0.5 size-4 shrink-0" />

            <div>
              <p className="font-medium">
                Unable to load audit logs
              </p>

              <p className="mt-1 text-xs">
                {error.message}
              </p>
            </div>

          </div>
        )}

        {/* =====================================================
            TABLE SECTION
        ====================================================== */}

        <section className="mt-5 overflow-hidden rounded-lg bg-card shadow-sm">

          {/* ===================================================
              TABLE HEADER
          ==================================================== */}

          <div className="border-b border-border/60">

            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

              {/* Title */}
              <div>

                <h2 className="text-base font-semibold text-foreground">
                  Activity Events
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {isLoading
                    ? "Loading activity records..."
                    : `${total.toLocaleString(
                        "en-IN",
                      )} activity ${
                        total === 1
                          ? "event"
                          : "events"
                      } found`}
                </p>

              </div>

              {/* Filters */}
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-wrap">

                {/* Search */}
                <div className="relative w-full sm:w-[300px]">

                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />

                  <Input
                    value={search}
                    onChange={(e) => {
                      const value =
                        e.target.value;

                      setSearch(value);
                      setPage(1);

                      updateListUrl(
                        value,
                        module,
                        dateFrom,
                        dateTo,
                        sort,
                        1,
                      );
                    }}
                    placeholder="Search actor, entity or description..."
                    className="h-9 border-border bg-muted/50 pl-9 pr-9 text-xs focus:bg-card"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setPage(1);

                        updateListUrl(
                          "",
                          module,
                          dateFrom,
                          dateTo,
                          sort,
                          1,
                        );
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 transition hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}

                </div>

                {/* Module */}
                <div className="relative w-full sm:w-[180px]">

                  <Input
                    value={module}
                    onChange={(e) => {
                      const value =
                        e.target.value;

                      setModule(value);
                      setPage(1);

                      updateListUrl(
                        search,
                        value,
                        dateFrom,
                        dateTo,
                        sort,
                        1,
                      );
                    }}
                    placeholder="Module"
                    className="h-9 border-border bg-muted/50 text-xs focus:bg-card"
                  />

                </div>

                {/* Date From */}
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setDateFrom(value);
                    setPage(1);

                    updateListUrl(
                      search,
                      module,
                      value,
                      dateTo,
                      sort,
                      1,
                    );
                  }}
                  className="h-9 rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                />

                {/* Date To */}
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setDateTo(value);
                    setPage(1);

                    updateListUrl(
                      search,
                      module,
                      dateFrom,
                      value,
                      sort,
                      1,
                    );
                  }}
                  className="h-9 rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                />

                {/* Sort */}
                <select
                  value={sort}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setSort(value);
                    setPage(1);

                    updateListUrl(
                      search,
                      module,
                      dateFrom,
                      dateTo,
                      value,
                      1,
                    );
                  }}
                  className="h-9 min-w-[130px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                >
                  <option value="desc">
                    Newest first
                  </option>

                  <option value="asc">
                    Oldest first
                  </option>
                </select>

              </div>

            </div>

            {/* Active filters */}
            {hasFilters && (
              <div className="flex items-center justify-between border-t border-border/60 px-5 py-2.5">

                <p className="text-xs text-muted-foreground">
                  Filters applied
                </p>

                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Clear filters
                </button>

              </div>
            )}

          </div>

          {/* ===================================================
              TABLE
          ==================================================== */}

          <div className="mt-5 overflow-x-auto px-5">

            <DataTable
              columns={[
                {
                  header: "Timestamp",
                  key: "created_at",
                  render: (
                    value,
                    row,
                  ) => (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {value ??
                        row.timestamp ??
                        "—"}
                    </span>
                  ),
                },

                {
                  header: "Actor",
                  key: "actor_name",
                  render: (
                    value,
                    row,
                  ) => (
                    <span className="text-xs font-medium text-foreground">
                      {value ??
                        row.actor ??
                        "—"}
                    </span>
                  ),
                },

                {
                  header: "Role",
                  key: "role_name",
                  render: (
                    value,
                  ) => (
                    <span className="text-xs text-muted-foreground">
                      {value ?? "—"}
                    </span>
                  ),
                },

                {
                  header: "Module",
                  key: "module",
                  render: (
                    value,
                  ) => (
                    <span className="text-xs font-medium text-foreground">
                      {value ?? "—"}
                    </span>
                  ),
                },

                {
                  header: "Action",
                  key: "action",
                  render: (
                    value,
                  ) => (
                    <span className="text-xs text-muted-foreground">
                      {value ?? "—"}
                    </span>
                  ),
                },

                {
                  header: "Entity",
                  key: "entity_label",
                  render: (
                    value,
                    row,
                  ) => (
                    <span className="text-xs text-muted-foreground">
                      {value ??
                        row.entity_id ??
                        "—"}
                    </span>
                  ),
                },

                {
                  header: "Description",
                  key: "description",
                  render: (
                    value,
                  ) => (
                    <span className="max-w-[280px] truncate text-xs text-muted-foreground">
                      {value ?? "—"}
                    </span>
                  ),
                },

                {
                  header: "Status",
                  key: "status",
                  render: (
                    value,
                  ) => (
                    <span className="text-xs font-medium capitalize text-muted-foreground">
                      {value ?? "—"}
                    </span>
                  ),
                },
              ]}
              data={
                isLoading
                  ? []
                  : rows
              }
            />

          </div>

          {/* ===================================================
              LOADING
          ==================================================== */}

          {isLoading && (
            <div className="flex items-center justify-center gap-2 border-t border-border/60 py-12">

              <RefreshCw className="size-4 animate-spin text-primary" />

              <span className="text-xs text-muted-foreground">
                Loading audit logs...
              </span>

            </div>
          )}

          {/* ===================================================
              PAGINATION
          ==================================================== */}

          {!isLoading &&
            rows.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-xs text-muted-foreground/80">

                  Showing{" "}

                  <span className="font-medium text-muted-foreground">
                    {startRecord}
                  </span>

                  {" – "}

                  <span className="font-medium text-muted-foreground">
                    {endRecord}
                  </span>

                  {" of "}

                  <span className="font-medium text-muted-foreground">
                    {total}
                  </span>

                </p>

                <Pagination
                  currentPage={
                    currentPage
                  }
                  totalPages={
                    lastPage
                  }
                  disabled={
                    isLoading ||
                    isFetching
                  }
                  onPageChange={(
                    nextPage,
                  ) => {
                    setPage(
                      nextPage,
                    );

                    updateListUrl(
                      search,
                      module,
                      dateFrom,
                      dateTo,
                      sort,
                      nextPage,
                    );
                  }}
                />

              </div>
            )}

        </section>

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground/80">

          <span>
            Symcure Administration
            Portal
          </span>

          <span>
            Permission controlled
          </span>

        </div>

      </div>
    </div>
  );
}

/* =============================================================
   PAGE
============================================================= */

export default function AuditLogPage() {
  return (
    <Suspense fallback={null}>
      <AuditLogPageContent />
    </Suspense>
  );
}