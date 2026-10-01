"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { DataTable } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  getMaster,
  createMaster,
  setMasterStatus,
} from "@/lib/api/admin";

import {
  useAdminMutation,
  useAdminQuery,
} from "@/hooks/use-admin-api";

const resources: Record<string, string> = {
  medicines: "master_medicines",
  tests: "master_lab_tests",
  symptoms: "master_symptoms",
  diagnosis: "master_diagnoses",
  "medical-council": "medical_councils",
  colleges: "colleges",
  specializations: "specializations",
  qualifications: "qualification_specializations",
};

const moduleLabels: Record<string, string> = {
  medicines: "Medicines",
  tests: "Lab Tests",
  symptoms: "Symptoms",
  diagnosis: "Diagnosis",
  "medical-council": "Medical Councils",
  colleges: "Colleges",
  specializations: "Specializations",
  qualifications: "Qualifications",
};

function MasterPreviewPageContent() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const moduleKey = String(params.importmodual ?? "");
  const resource = resources[moduleKey];

  const initialSearch = searchParams.get("search") ?? "";
  const initialStatus = searchParams.get("is_active") ?? "";
  const initialPage = Math.max(
    1,
    Number(searchParams.get("page") ?? "1") || 1,
  );

  const [search, setSearch] = useState(initialSearch);
  const [isActive, setIsActive] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [addError, setAddError] = useState("");

  const limit = 20;

  /**
   * Sync URL
   */
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }

    if (isActive) {
      params.set("is_active", isActive);
    } else {
      params.delete("is_active");
    }

    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }

    router.replace(
      params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname,
      { scroll: false },
    );
  }, [
    search,
    isActive,
    page,
    pathname,
    router,
  ]);

  /**
   * Sync state from URL
   */
  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setIsActive(searchParams.get("is_active") ?? "");
    setPage(
      Math.max(
        1,
        Number(searchParams.get("page") ?? "1") || 1,
      ),
    );
  }, [searchParams]);

  /**
   * Fetch master data
   */
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAdminQuery(
    () =>
      getMaster(resource, {
        search,
        is_active: isActive,
        page,
        limit,
      }),
    [
      "admin",
      "master",
      resource,
      {
        search,
        isActive,
        page,
        limit,
      },
    ],
    Boolean(resource),
  );

  /**
   * Create
   */
  const createMutation = useAdminMutation<
    Record<string, unknown>,
    unknown
  >((body) => createMaster(resource, body));

  /**
   * Normalize response
   */
  const payload: any = data ?? {};

  const rows: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  const meta = payload?.meta ?? {};

  const total = Number(
    meta?.total ?? rows.length,
  );

  const currentPage = Number(
    meta?.current_page ?? page,
  );

  const perPage = Number(
    meta?.per_page ?? limit,
  );

  const lastPage = Math.max(
    1,
    Number(
      meta?.last_page ??
        Math.ceil(total / perPage),
    ),
  );

  const startRecord =
    total === 0
      ? 0
      : (currentPage - 1) * perPage + 1;

  const endRecord =
    total === 0
      ? 0
      : Math.min(
          startRecord + rows.length - 1,
          total,
        );

  /**
   * Dynamic table columns
   */
  const columns = useMemo(() => {
    if (!rows.length) {
      return [
        {
          header: "ID",
          key: "id",
        },
        {
          header: "NAME",
          key: "name",
        },
        {
          header: "STATUS",
          key: "is_active",
        },
      ];
    }

    const keys = Object.keys(rows[0])
      .filter(
        (key) =>
          ![
            "created_at",
            "updated_at",
            "deleted_at",
          ].includes(key),
      )
      .slice(0, 7);

    return keys.map((key) => ({
      header: key
        .replaceAll("_", " ")
        .toUpperCase(),

      key,

      render: (value: any) => {
        if (key === "is_active") {
          return Boolean(value) ? (
            <Badge
              variant="secondary"
              className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
            >
              Active
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              Inactive
            </Badge>
          );
        }

        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return "—";
        }

        if (typeof value === "boolean") {
          return value ? "Yes" : "No";
        }

        if (typeof value === "object") {
          return JSON.stringify(value);
        }

        return String(value);
      },
    }));
  }, [rows]);

  /**
   * Open Add modal
   */
  function openAddModal() {
    setName("");
    setAddError("");
    setIsAddOpen(true);
  }

  /**
   * Close Add modal
   */
  function closeAddModal() {
    if (createMutation.isPending) return;

    setIsAddOpen(false);
    setName("");
    setAddError("");
  }

  /**
   * Add record
   */
  async function handleAdd() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setAddError("Please enter a name.");
      return;
    }

    setAddError("");

    try {
      await createMutation.mutateAsync({
        name: trimmedName,
        is_active: true,
      });

      setIsAddOpen(false);
      setName("");

      if (page !== 1) {
        setPage(1);
      } else {
        await refetch();
      }
    } catch (err: any) {
      setAddError(
        err?.message ||
          "Unable to create this record.",
      );
    }
  }

  /**
   * Toggle status
   */
  async function handleToggle(row: any) {
    try {
      await setMasterStatus(
        resource,
        String(row.id),
        !Boolean(row.is_active),
      );

      await refetch();
    } catch {
      // API error handled by API layer/query state.
    }
  }

  /**
   * Clear filters
   */
  function clearFilters() {
    setSearch("");
    setIsActive("");
    setPage(1);
  }

  const hasFilters =
    Boolean(search.trim()) ||
    Boolean(isActive);

  const title =
    moduleLabels[moduleKey] ??
    moduleKey
      .replaceAll("-", " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );

  /**
   * Invalid module
   */
  if (!resource) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-5">
          <h1 className="text-lg font-semibold text-destructive">
            Invalid master module
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            The requested master data module does not exist.
          </p>

          <Link
            href="/admin/master-data"
            className="mt-4 inline-flex"
          >
            <Button variant="outline">
              Back to Master Data
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* PAGE HEADER — same compact style */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Link
                href="/admin/master-data"
                className="hover:text-foreground"
              >
                Master Data
              </Link>

              <ChevronRight className="size-3.5" />

              <span>{title}</span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              {title}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage {title.toLowerCase()} master records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={openAddModal}
            >
              {/* <Plus className="mr-2 size-4" /> */}
              Add {title}
            </Button>
          </div>
        </div>

        {/* EXACT TABLE-STYLE CONTAINER */}
        <section className="mt-5 overflow-hidden rounded-lg bg-card shadow-sm">
          {/* FILTER HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-5">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {/* SEARCH */}
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={`Search ${title.toLowerCase()}...`}
                  className="h-9 pl-9 pr-9 text-sm"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* STATUS */}
              <select
                value={isActive}
                onChange={(event) => {
                  setIsActive(event.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">
                  All Status
                </option>

                <option value="1">
                  Active
                </option>

                <option value="0">
                  Inactive
                </option>
              </select>

              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>

            {isFetching && !isLoading ? (
              <RefreshCw className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="text-xs text-muted-foreground">
                {total} records
              </span>
            )}
          </div>

          {/* ERROR */}
          {error && (
            <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <div className="flex items-center justify-between gap-3">
                <span>
                  {error.message ||
                    "Unable to load master data."}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                >
                  Try again
                </Button>
              </div>
            </div>
          )}

          {/* TABLE */}
         <div className="p-5">
           <DataTable
            columns={[
              ...columns,
              {
                header: "ACTION",
                key: "action",
                render: (
                  _: unknown,
                  row: any,
                ) => (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void handleToggle(row)
                    }
                  >
                    {Boolean(row.is_active)
                      ? "Deactivate"
                      : "Activate"}
                  </Button>
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

          {/* LOADING */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-8 text-sm text-muted-foreground">
              <RefreshCw className="size-4 animate-spin" />
              Loading {title.toLowerCase()}...
            </div>
          )}

          {/* PAGINATION */}
          {!isLoading &&
            !error &&
            rows.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {startRecord}
                  </span>{" "}
                  –{" "}
                  <span className="font-medium text-foreground">
                    {endRecord}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {total}
                  </span>
                </p>

                <Pagination
                  currentPage={currentPage}
                  totalPages={lastPage}
                  onPageChange={setPage}
                  disabled={isFetching}
                />
              </div>
            )}
        </section>

        {/* FOOTER */}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground/80">
          <span>
            Symcure Administration Portal
          </span>

          <span>
            Permission controlled
          </span>
        </div>
      </div>

      {/* =========================
          ADD MODAL
         ========================= */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeAddModal();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">
                  Add {title}
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Create a new {title.toLowerCase()} master record.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                disabled={createMutation.isPending}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-2">
                <label
                  htmlFor="master-name"
                  className="text-sm font-medium"
                >
                  Name
                </label>

                <Input
                  id="master-name"
                  autoFocus
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setAddError("");
                  }}
                  placeholder={`Enter ${title.toLowerCase()} name`}
                  disabled={createMutation.isPending}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter"
                    ) {
                      event.preventDefault();
                      void handleAdd();
                    }
                  }}
                />
              </div>

              {addError && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {addError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeAddModal}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={() => void handleAdd()}
                disabled={
                  createMutation.isPending ||
                  !name.trim()
                }
              >
                {createMutation.isPending && (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                )}

                {createMutation.isPending
                  ? "Adding..."
                  : "Add"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function MasterPreviewPage() {
  return (
    <Suspense fallback={null}>
      <MasterPreviewPageContent />
    </Suspense>
  );
}