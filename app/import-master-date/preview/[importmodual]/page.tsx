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
  updateMaster,
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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [editError, setEditError] = useState("");
const [showSuggestions, setShowSuggestions] = useState(false);

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

  const updateMutation = useAdminMutation<
  Record<string, unknown>,
  unknown
>((body) => {
  if (!editingRow?.id) {
    throw new Error("Invalid master record.");
  }

  return updateMaster(
    resource,
    String(editingRow.id),
    body,
  );
});

  /**
   * Normalize response
   */
  const payload: any = data ?? {};

  const rows: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

      const addSuggestions = useMemo(() => {
  const query = name.trim().toLowerCase();

  if (!query) return [];

  const field =
    moduleKey === "medicines"
      ? "generic_name"
      : "name";

  return rows
    .filter((row) => {
      const value = String(row?.[field] ?? "").trim();

      return (
        value &&
        value.toLowerCase().includes(query)
      );
    })
    .filter((row, index, array) => {
      const field =
        moduleKey === "medicines"
          ? "generic_name"
          : "name";

      const value = String(
        row?.[field] ?? "",
      )
        .trim()
        .toLowerCase();

      return (
        array.findIndex(
          (item) =>
            String(
              item?.[field] ?? "",
            )
              .trim()
              .toLowerCase() === value,
        ) === index
      );
    })
    .slice(0, 8);
}, [rows, name, moduleKey]);

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
  async function handleAdd(title: any) {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setAddError("Please enter a name.");
      return;
    }

    setAddError("");

    try {
      await createMutation.mutateAsync({
        ...(title === "Medicines"
          ? { generic_name: trimmedName }
          : { name: trimmedName }),
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

  function openEditModal(row: any) {
  const values: Record<string, any> = {};

  Object.entries(row ?? {}).forEach(([key, value]) => {
    if (
      [
        "id",
        "created_at",
        "updated_at",
        "deleted_at",
      ].includes(key)
    ) {
      return;
    }

    values[key] = value;
  });

  setEditingRow(row);
  setEditValues(values);
  setEditError("");
  setIsEditOpen(true);
}

function closeEditModal() {
  if (updateMutation.isPending) return;

  setIsEditOpen(false);
  setEditingRow(null);
  setEditValues({});
  setEditError("");
}

function updateEditValue(
  key: string,
  value: any,
) {
  setEditValues((current) => ({
    ...current,
    [key]: value,
  }));

  setEditError("");
}

async function handleEdit() {
  if (!editingRow?.id) {
    setEditError("Invalid master record.");
    return;
  }

  const body: Record<string, unknown> = {};

  Object.entries(editValues).forEach(
    ([key, value]) => {
      if (
        [
          "id",
          "created_at",
          "updated_at",
          "deleted_at",
        ].includes(key)
      ) {
        return;
      }

      body[key] = value;
    },
  );

  /*
   * The API expects is_active.
   * Keep status changes handled separately by
   * the Activate/Deactivate action.
   */
  delete body.is_active;

  try {
    await updateMutation.mutateAsync(body);

    setIsEditOpen(false);
    setEditingRow(null);
    setEditValues({});

    await refetch();
  } catch (err: any) {
    setEditError(
      err?.message ||
        "Unable to update this record.",
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
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          openEditModal(row)
        }
      >
        Edit
      </Button>

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
    </div>
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
          <div className="relative w-full max-w-md overflow-visible rounded-xl border border-border bg-card shadow-xl">
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
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="relative space-y-4 overflow-visible px-5 py-5">
             <div className="relative space-y-2">
  <label
    htmlFor="master-name"
    className="text-sm font-medium"
  >
    {moduleKey === "medicines"
      ? "Generic Name"
      : "Name"}
  </label>

  <Input
    id="master-name"
    autoFocus
    value={name}
    onChange={(event) => {
      setName(event.target.value);
      setAddError("");
      setShowSuggestions(true);
    }}
    onFocus={() => {
      if (name.trim()) {
        setShowSuggestions(true);
      }
    }}
    onBlur={() => {
      // Give the suggestion click time to fire
      setTimeout(() => {
        setShowSuggestions(false);
      }, 150);
    }}
    placeholder={
      moduleKey === "medicines"
        ? "Enter generic name"
        : `Enter ${title.toLowerCase()} name`
    }
    disabled={createMutation.isPending}
    onKeyDown={(event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleAdd(title);
      }

      if (event.key === "Escape") {
        setShowSuggestions(false);
      }
    }}
  />

  {showSuggestions &&
    name.trim() &&
    addSuggestions.length > 0 && (
      <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Suggestions
        </div>

        <div className="max-h-52 overflow-y-auto">
          {addSuggestions.map((row) => {
            const field =
              moduleKey === "medicines"
                ? "generic_name"
                : "name";

            const suggestion = String(
              row?.[field] ?? "",
            ).trim();

            return (
              <button
                key={row.id}
                type="button"
                className="cursor-pointer flex w-full items-center px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted"
                onMouseDown={(event) => {
                  event.preventDefault();

                  setName(suggestion);
                  setShowSuggestions(false);
                  setAddError("");
                }}
              >
                {suggestion}
              </button>
            );
          })}
        </div>
      </div>
    )}
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
                onClick={() => void handleAdd(title)}
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

      {isEditOpen && editingRow && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
    onMouseDown={(event) => {
      if (
        event.target === event.currentTarget
      ) {
        closeEditModal();
      }
    }}
  >
    <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">
            Edit {title}
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Update this {title.toLowerCase()} master record.
          </p>
        </div>

        <button
          type="button"
          onClick={closeEditModal}
          disabled={updateMutation.isPending}
          className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[65vh] space-y-4 overflow-y-auto px-5 py-5">
       <div className="space-y-2">
  <label className="text-sm font-medium">
    {moduleKey === "medicines"
      ? "Name"
      : "Name"}
  </label>

  <Input
    value={
      moduleKey === "medicines"
        ? editValues.generic_name ?? ""
        : editValues.name ?? ""
    }
    onChange={(event) =>
      updateEditValue(
        moduleKey === "medicines"
          ? "generic_name"
          : "name",
        event.target.value,
      )
    }
    disabled={updateMutation.isPending}
  />
</div>

        {editError && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {editError}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={closeEditModal}
          disabled={updateMutation.isPending}
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={() => void handleEdit()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending && (
            <RefreshCw className="mr-2 size-4 animate-spin" />
          )}

          {updateMutation.isPending
            ? "Saving..."
            : "Save Changes"}
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