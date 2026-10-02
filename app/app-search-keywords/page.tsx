"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { Pagination } from "@/components/pagination";

import {
  createAppSearchKeyword,
  deleteAppSearchKeyword,
  getAppSearchKeyword,
  getAppSearchKeywordSpecializationOptions,
  getAppSearchKeywords,
  setAppSearchKeywordStatus,
  updateAppSearchKeyword,
} from "@/lib/api/admin";

import { useAdminQuery } from "@/hooks/use-admin-api";

/* ==========================================================================
   TYPES
========================================================================== */

type SpecializationOption = {
  id: number;
  name?: string;
  specialization_name?: string;
  qualification_specialization_name?: string;
  qualification_name?: string;
};

type KeywordSpecialization = {
  id?: number;
  name?: string;
  specialization_name?: string;
  qualification_specialization_name?: string;
  qualification_specialization_id?: number;
};

type KeywordRow = {
  id: number;
  keyword: string;
  is_active: boolean;

  specialization_count: number;
  doctor_count: number;

  qualification_specialization_ids?: number[];
  qualification_specializations?: KeywordSpecialization[];

  created_at?: string;
  updated_at?: string;
};

type FormState = {
  keyword: string;
  is_active: boolean;
  qualification_specialization_ids: number[];
};

type PaginationMeta = {
  current_page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
};

/* ==========================================================================
   HELPERS
========================================================================== */

function normalizeId(value: unknown): number {
  const id = Number(value);

  return Number.isFinite(id) ? id : 0;
}

function getSpecializationName(
  item: SpecializationOption,
): string {
  return (
    item.name ??
    item.specialization_name ??
    item.qualification_specialization_name ??
    item.qualification_name ??
    `#${item.id}`
  );
}

/**
 * Supports:
 *
 * 1. { data: [...], meta: {...} }
 * 2. { data: { data: [...], meta: {...} } }
 * 3. [...]
 */
function extractRows(
  payload: any,
): KeywordRow[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  return [];
}

function extractMeta(
  payload: any,
): PaginationMeta {
  if (payload?.meta) {
    return payload.meta;
  }

  if (payload?.data?.meta) {
    return payload.data.meta;
  }

  return {};
}

/**
 * Detail API can return:
 *
 * { keyword, is_active, qualification_specialization_ids: [...] }
 *
 * OR:
 *
 * { data: { keyword, ... } }
 */
function extractDetail(
  payload: any,
): any {
  if (!payload) {
    return null;
  }

  if (payload?.search_keyword) {
    return payload.search_keyword;
  }

  if (payload?.data?.search_keyword) {
    return payload.data.search_keyword;
  }

  if (payload?.data) {
    return payload.data;
  }

  return payload;
}

function extractSelectedSpecializationIds(
  detail: any,
): number[] {
  if (!detail) {
    return [];
  }

  const ids = new Set<number>();

  const addId = (value: any) => {
    const id = normalizeId(value);

    if (
      Number.isFinite(id) &&
      id > 0
    ) {
      ids.add(id);
    }
  };

  /* ------------------------------------------------------------------------
     DIRECT ID ARRAYS
  ------------------------------------------------------------------------ */

  const directIdFields = [
    "qualification_specialization_ids",
    "specialization_ids",
    "qualification_ids",
  ];

  for (const field of directIdFields) {
    if (Array.isArray(detail?.[field])) {
      detail[field].forEach(
        (value: any) => {
          if (
            typeof value === "object" &&
            value !== null
          ) {
            addId(
              value.id ??
              value.qualification_specialization_id ??
              value.specialization_id,
            );
          } else {
            addId(value);
          }
        },
      );
    }
  }

  /* ------------------------------------------------------------------------
     OBJECT ARRAYS
  ------------------------------------------------------------------------ */

  const objectFields = [
    "qualification_specializations",
    "specializations",
    "qualifications",
    "qualification_specialization",
  ];

  for (const field of objectFields) {
    const value = detail?.[field];

    if (Array.isArray(value)) {
      value.forEach(
        (item: any) => {
          if (
            item &&
            typeof item === "object"
          ) {
            addId(
              item.id ??
              item.qualification_specialization_id ??
              item.specialization_id ??
              item.qualification_id,
            );
          } else {
            addId(item);
          }
        },
      );
    } else if (
      value &&
      typeof value === "object"
    ) {
      addId(
        value.id ??
        value.qualification_specialization_id ??
        value.specialization_id ??
        value.qualification_id,
      );
    }
  }

  /* ------------------------------------------------------------------------
     NESTED DATA FALLBACK
  ------------------------------------------------------------------------ */

  if (
    ids.size === 0 &&
    detail?.data &&
    typeof detail.data === "object"
  ) {
    const nestedIds =
      extractSelectedSpecializationIds(
        detail.data,
      );

    nestedIds.forEach((id) =>
      ids.add(id),
    );
  }

  return Array.from(ids);
}

/**
 * Supports possible specialization option response shapes.
 */
function extractOptions(
  payload: any,
): SpecializationOption[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.options)) {
    return payload.options;
  }

  if (Array.isArray(payload?.data?.options)) {
    return payload.data.options;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  if (
    Array.isArray(
      payload?.qualification_specializations,
    )
  ) {
    return payload.qualification_specializations;
  }

  return [];
}

/* ==========================================================================
   PAGE
========================================================================== */

export default function AppSearchKeywordsPage() {
  /* ------------------------------------------------------------------------
     LIST FILTERS
  ------------------------------------------------------------------------ */

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const limit = 20;

  /* ------------------------------------------------------------------------
     LIST API
  ------------------------------------------------------------------------ */

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useAdminQuery(
    () =>
      getAppSearchKeywords({
        search: search.trim(),
        status,
        page,
        limit,
      }),
    [
      "admin",
      "app-search-keywords",
      {
        search,
        status,
        page,
        limit,
      },
    ],
  );

  /* ------------------------------------------------------------------------
     NORMALIZE LIST RESPONSE
  ------------------------------------------------------------------------ */

  const payload: any = data ?? {};

  const rows = useMemo(
    () => extractRows(payload),
    [payload],
  );

  const meta = useMemo(
    () => extractMeta(payload),
    [payload],
  );

  const total = Number(
    meta.total ?? rows.length,
  );

  const currentPage =
    Number(meta.current_page) || page;

  const lastPage =
    Number(meta.last_page) || 1;

  const perPage =
    Number(meta.per_page) || limit;

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

  /* ------------------------------------------------------------------------
     MODAL
  ------------------------------------------------------------------------ */

  const [showModal, setShowModal] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [form, setForm] =
    useState<FormState>({
      keyword: "",
      is_active: true,
      qualification_specialization_ids: [],
    });

  const [options, setOptions] =
    useState<SpecializationOption[]>([]);

  const [optionsLoading, setOptionsLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [modalError, setModalError] =
    useState<string | null>(null);

  /* ------------------------------------------------------------------------
     STATUS / DELETE LOADING
  ------------------------------------------------------------------------ */

  const [statusId, setStatusId] =
    useState<number | null>(null);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<KeywordRow | null>(null);

  const [deleteError, setDeleteError] =
    useState<string | null>(null);

  /* ==========================================================================
     LOAD SPECIALIZATION OPTIONS
  ========================================================================== */

  const loadSpecializationOptions =
    async () => {
      try {
        setOptionsLoading(true);
        setModalError(null);

        const response =
          await getAppSearchKeywordSpecializationOptions(
            {
              limit: 500,
            },
          );

        setOptions(
          extractOptions(response),
        );
      } catch (err: any) {
        console.error(
          "Unable to load specialization options:",
          err,
        );

        setModalError(
          err?.message ??
          "Unable to load specialization options.",
        );
      } finally {
        setOptionsLoading(false);
      }
    };

  /* ==========================================================================
     OPEN ADD MODAL
  ========================================================================== */

  const openAddModal = async () => {
    setEditingId(null);

    setForm({
      keyword: "",
      is_active: true,
      qualification_specialization_ids: [],
    });

    setModalError(null);
    setOptions([]);
    setShowModal(true);

    await loadSpecializationOptions();
  };

  /* ==========================================================================
     OPEN EDIT MODAL
  ========================================================================== */

  const openEditModal = async (
    row: KeywordRow,
  ) => {
    try {
      setModalError(null);
      setEditingId(row.id);

      /*
       * Open immediately with table data.
       */
      setForm({
        keyword: row.keyword ?? "",
        is_active: Boolean(row.is_active),
        qualification_specialization_ids:
          Array.isArray(
            row.qualification_specialization_ids,
          )
            ? row.qualification_specialization_ids
              .map(Number)
              .filter(
                (id) =>
                  Number.isFinite(id) &&
                  id > 0,
              )
            : [],
      });

      setShowModal(true);

      /*
       * Load options and detail together.
       */
      const [
        optionsResponse,
        detailResponse,
      ] = await Promise.all([
        getAppSearchKeywordSpecializationOptions(
          {
            limit: 500,
          },
        ),

        getAppSearchKeyword(
          String(row.id),
        ),
      ]);

      const specializationOptions =
        extractOptions(
          optionsResponse,
        );

      setOptions(
        specializationOptions,
      );

      const detail =
        extractDetail(
          detailResponse,
        );

      let selectedIds =
        extractSelectedSpecializationIds(
          detail,
        );

      /*
       * Fallback to row data.
       */
      if (
        selectedIds.length === 0 &&
        Array.isArray(
          row.qualification_specialization_ids,
        )
      ) {
        selectedIds =
          row.qualification_specialization_ids
            .map(Number)
            .filter(
              (id) =>
                Number.isFinite(id) &&
                id > 0,
            );
      }

      setForm({
        keyword:
          detail?.keyword ??
          row.keyword ??
          "",

        is_active:
          detail?.is_active !==
            undefined
            ? Boolean(
              detail.is_active,
            )
            : Boolean(
              row.is_active,
            ),

        qualification_specialization_ids:
          selectedIds,
      });
    } catch (err: any) {
      console.error(
        "Unable to load keyword:",
        err,
      );

      setModalError(
        err?.message ??
        "Unable to load keyword details.",
      );
    }
  };

  /* ==========================================================================
     CLOSE MODAL
  ========================================================================== */

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingId(null);

    setForm({
      keyword: "",
      is_active: true,
      qualification_specialization_ids: [],
    });

    setOptions([]);
    setModalError(null);
  };

  /* ==========================================================================
     SPECIALIZATION TOGGLE
  ========================================================================== */

  const toggleSpecialization = (
    id: number,
  ) => {
    const numericId = Number(id);

    setForm((current) => {
      const exists =
        current.qualification_specialization_ids.includes(
          numericId,
        );

      return {
        ...current,

        qualification_specialization_ids:
          exists
            ? current.qualification_specialization_ids.filter(
              (item) =>
                Number(item) !==
                numericId,
            )
            : [
              ...current.qualification_specialization_ids,
              numericId,
            ],
      };
    });
  };

  /* ==========================================================================
     SAVE
  ========================================================================== */

  const handleSave = async () => {
    const keyword =
      form.keyword.trim();

    if (!keyword) {
      setModalError(
        "Keyword is required.",
      );
      return;
    }

    if (
      form.qualification_specialization_ids
        .length === 0
    ) {
      setModalError(
        "Please select at least one qualification/specialization.",
      );
      return;
    }

    try {
      setSaving(true);
      setModalError(null);

      const body = {
        keyword,

        is_active:
          Boolean(form.is_active),

        qualification_specialization_ids:
          form.qualification_specialization_ids,
      };

      if (editingId !== null) {
        await updateAppSearchKeyword(
          String(editingId),
          body,
        );
      } else {
        await createAppSearchKeyword(
          body,
        );
      }

      setShowModal(false);
      setEditingId(null);

      setForm({
        keyword: "",
        is_active: true,
        qualification_specialization_ids: [],
      });

      setOptions([]);
      setModalError(null);

      await refetch();
    } catch (err: any) {
      console.error(
        "Unable to save keyword:",
        err,
      );

      setModalError(
        err?.message ??
        "Unable to save keyword.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================================
     STATUS
  ========================================================================== */

  const handleStatus = async (
    row: KeywordRow,
  ) => {
    try {
      setStatusId(row.id);

      await setAppSearchKeywordStatus(
        String(row.id),
        !row.is_active,
      );

      await refetch();
    } catch (err: any) {
      console.error(
        "Unable to update keyword status:",
        err,
      );

      window.alert(
        err?.message ??
        "Unable to update keyword status.",
      );
    } finally {
      setStatusId(null);
    }
  };

  /* ==========================================================================
     DELETE
  ========================================================================== */

  const openDeleteModal = (row: KeywordRow) => {
    setDeleteTarget(row);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    if (deletingId !== null) {
      return;
    }

    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeletingId(deleteTarget.id);
      setDeleteError(null);

      await deleteAppSearchKeyword(
        String(deleteTarget.id),
      );

      setDeleteTarget(null);
      setDeleteError(null);

      await refetch();
    } catch (err: any) {
      console.error(
        "Unable to delete keyword:",
        err,
      );

      setDeleteError(
        err?.message ??
        "Unable to delete keyword.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* ==========================================================================
     RESET PAGE WHEN FILTER CHANGES
  ========================================================================== */

  useEffect(() => {
    if (
      lastPage > 0 &&
      page > lastPage
    ) {
      setPage(lastPage);
    }
  }, [page, lastPage]);

  /* ==========================================================================
     TABLE COLUMNS
  ========================================================================== */

  const columns = useMemo(
    () => [
      {
        header: "Keyword",
        key: "keyword",

        render: (
          value: string,
        ) => (
          <div className="min-w-[140px]">
            <span className="text-xs font-semibold text-foreground">
              {value || "—"}
            </span>
          </div>
        ),
      },

      {
        header:
          "Qualification / Specialization",
        key: "qualification_specializations",

        render: (
          _: unknown,
          row: Record<string, any>,
        ) => {
          const keywordRow =
            row as KeywordRow;

          const items =
            keywordRow.qualification_specializations ??
            [];

          if (!items.length) {
            return (
              <span className="text-xs text-muted-foreground">
                {keywordRow.specialization_count
                  ? `${keywordRow.specialization_count} specialization${keywordRow.specialization_count ===
                    1
                    ? ""
                    : "s"
                  }`
                  : "—"}
              </span>
            );
          }

          return (
            <div className="flex max-w-[430px] flex-wrap gap-1">
              {items.map(
                (
                  item,
                  index,
                ) => {
                  const name =
                    item.name ??
                    item.specialization_name ??
                    item.qualification_specialization_name ??
                    `#${item.id}`;

                  return (
                    <span
                      key={
                        item.id ??
                        `${name}-${index}`
                      }
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {name}
                    </span>
                  );
                },
              )}
            </div>
          );
        },
      },

      {
        header: "Doctors",
        key: "doctor_count",

        render: (
          value: number,
        ) => (
          <span className="text-xs font-medium text-foreground/80">
            {Number(value) || 0}
          </span>
        ),
      },

      {
        header: "Status",
        key: "is_active",

        render: (
          value: boolean,
        ) => {
          const active =
            Boolean(value);

          return (
            <StatusBadge
              status={
                active
                  ? "active"
                  : "pending"
              }
            >
              {active
                ? "Active"
                : "Inactive"}
            </StatusBadge>
          );
        },
      },

      {
        header: "Actions",
        key: "actions",

        render: (
          _: unknown,
          row: Record<string, any>,
        ) => {
          const keywordRow =
            row as KeywordRow;

          const updating =
            statusId === keywordRow.id;

          const deleting =
            deletingId === keywordRow.id;

          return (
            <div className="flex items-center justify-start gap-1">
              {/* EDIT */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Edit keyword"
                onClick={() =>
                  openEditModal(
                    keywordRow,
                  )
                }
                disabled={
                  updating ||
                  deleting
                }
              >
                <Pencil className="size-3.5" />
              </Button>

              {/* DELETE */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Delete keyword"
                onClick={() =>
                  openDeleteModal(
                    keywordRow,
                  )
                }
                disabled={
                  updating ||
                  deleting
                }
              >
                {deleting ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </div>
          );
        },
      },
    ],
    [
      statusId,
      deletingId,
    ],
  );

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <>
      <div className="w-full">
        <div className="flex w-full flex-col gap-5">

          {/* ==================================================================
              PAGE HEADER
          ================================================================== */}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground/80">
                <span>
                  Administration
                </span>

                <span>/</span>

                <span className="text-muted-foreground">
                  App Search Keywords
                </span>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                App Search Keywords
              </h1>

              <p className="mt-1 text-xs text-muted-foreground">
                Manage keywords used by
                patient app search.
              </p>
            </div>

            <Button
              type="button"
              className="h-9 gap-1.5 text-xs font-semibold"
              onClick={openAddModal}
            >
              <Plus className="size-4" />
              Add Keyword
            </Button>
          </div>

          {/* ==================================================================
              API ERROR
          ================================================================== */}

          {error && (
            <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 text-xs text-destructive">
              {error.message}
            </div>
          )}

          {/* ==================================================================
              KEYWORDS SECTION
          ================================================================== */}

          <section className="overflow-hidden rounded-lg bg-card shadow-sm">

            {/* ----------------------------------------------------------------
                SECTION HEADER
            ---------------------------------------------------------------- */}

            <div className="border-b border-border/60 px-5 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Keywords
                  </h2>

                  <p className="mt-0.5 text-xs text-muted-foreground/80">
                    {isLoading
                      ? "Loading keywords..."
                      : `${total} keyword${total === 1
                        ? ""
                        : "s"
                      } found`}
                  </p>
                </div>

                {/* FILTERS */}

                <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">

                  {/* SEARCH */}

                  <div className="relative w-full sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />

                    <Input
                      value={search}
                      onChange={(event) => {
                        setSearch(
                          event.target.value,
                        );
                        setPage(1);
                      }}
                      placeholder="Search keyword..."
                      className="h-9 border-border bg-muted/50 pl-9 pr-9 text-xs focus:bg-card"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setPage(1);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>

                  {/* STATUS */}

                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(
                        event.target.value,
                      );
                      setPage(1);
                    }}
                    className="h-9 min-w-[140px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                  >
                    <option value="">
                      All statuses
                    </option>

                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>

                  {/* REFRESH */}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-xs"
                    onClick={() =>
                      refetch()
                    }
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={
                        isLoading
                          ? "size-3.5 animate-spin"
                          : "size-3.5"
                      }
                    />

                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------------------
                TABLE ERROR
            ---------------------------------------------------------------- */}

            {error && (
              <div className="border-b border-destructive/25 bg-destructive-soft px-5 py-3 text-xs text-destructive">
                {error.message}
              </div>
            )}

            {/* ----------------------------------------------------------------
                TABLE
            ---------------------------------------------------------------- */}

            <div className="overflow-x-auto px-5 mt-5">
              {isLoading ? (
                <div className="flex min-h-[280px] items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="size-5 animate-spin text-primary" />

                    <p className="text-xs text-muted-foreground">
                      Loading keywords...
                    </p>
                  </div>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center px-5 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                    <Search className="size-5 text-muted-foreground" />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-foreground">
                    No keywords found
                  </p>

                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    Try changing your search
                    or status filter.
                  </p>

                  {(search ||
                    status) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4 h-8 text-xs"
                        onClick={() => {
                          setSearch("");
                          setStatus("");
                          setPage(1);
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={rows}
                />
              )}
            </div>

            {/* ----------------------------------------------------------------
                PAGINATION
            ---------------------------------------------------------------- */}

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
                      isLoading
                    }
                    onPageChange={(
                      nextPage,
                    ) => {
                      setPage(
                        nextPage,
                      );
                    }}
                  />
                </div>
              )}
          </section>
        </div>
      </div>

      {/* ======================================================================
          ADD / EDIT MODAL
      ====================================================================== */}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget &&
              !saving
            ) {
              closeModal();
            }
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">

            {/* ----------------------------------------------------------------
                MODAL HEADER
            ---------------------------------------------------------------- */}

            <div className="flex items-start justify-between border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {editingId !== null
                    ? "Edit Search Keyword"
                    : "Add Search Keyword"}
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {editingId !== null
                    ? "Update the keyword and its linked specializations."
                    : "Create a keyword and link it to one or more specializations."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={saving}
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* ----------------------------------------------------------------
                MODAL BODY
            ---------------------------------------------------------------- */}

            <div className="flex-1 overflow-y-auto px-5 py-5">

              {/* ERROR */}

              {modalError && (
                <div className="mb-4 rounded-md border border-destructive/25 bg-destructive-soft px-3 py-2.5 text-xs text-destructive">
                  {modalError}
                </div>
              )}

              {/* KEYWORD */}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Keyword
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </label>

                <Input
                  value={form.keyword}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        keyword:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="e.g. fever"
                  disabled={saving}
                  className="h-9 text-xs"
                />
              </div>

              {/* ACTIVE */}

              <div className="mt-5 rounded-lg border border-border/60 bg-muted/20 p-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      form.is_active
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          is_active:
                            event.target
                              .checked,
                        }),
                      )
                    }
                    disabled={saving}
                    className="size-4 rounded border-border"
                  />

                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Active
                    </p>

                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Allow this keyword to
                      be used in patient
                      search.
                    </p>
                  </div>
                </label>
              </div>

              {/* SPECIALIZATIONS */}

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Qualification /
                      Specialization
                      <span className="ml-1 text-destructive">
                        *
                      </span>
                    </label>

                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Select at least one.
                    </p>
                  </div>

                  {form
                    .qualification_specialization_ids
                    .length > 0 && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {
                          form
                            .qualification_specialization_ids
                            .length
                        }{" "}
                        selected
                      </span>
                    )}
                </div>

                <div className="max-h-[280px] overflow-y-auto rounded-lg border border-border/60">

                  {optionsLoading ? (
                    <div className="flex items-center justify-center px-4 py-10">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <RefreshCw className="size-4 animate-spin" />

                        Loading
                        specializations...
                      </div>
                    </div>
                  ) : options.length ===
                    0 ? (
                    <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                      No specialization
                      options found.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {options.map(
                        (option) => {
                          const optionId =
                            Number(
                              option.id,
                            );

                          const selected =
                            form.qualification_specialization_ids.includes(
                              optionId,
                            );

                          return (
                            <label
                              key={
                                option.id
                              }
                              className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition ${selected
                                  ? "bg-muted/50"
                                  : "hover:bg-muted/30"
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  selected
                                }
                                onChange={() =>
                                  toggleSpecialization(
                                    optionId,
                                  )
                                }
                                disabled={
                                  saving
                                }
                                className="size-4 rounded border-border"
                              />

                              <span
                                className={`text-xs ${selected
                                    ? "font-medium text-foreground"
                                    : "text-muted-foreground"
                                  }`}
                              >
                                {getSpecializationName(
                                  option,
                                )}
                              </span>
                            </label>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------------------
                MODAL FOOTER
            ---------------------------------------------------------------- */}

            <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 text-xs"
                onClick={
                  closeModal
                }
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="h-9 min-w-[110px] text-xs font-semibold"
                onClick={
                  handleSave
                }
                disabled={
                  saving ||
                  optionsLoading
                }
              >
                {saving ? (
                  <>
                    <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingId !==
                  null ? (
                  "Update Keyword"
                ) : (
                  "Add Keyword"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
    DELETE CONFIRMATION MODAL
====================================================================== */}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              deletingId === null
            ) {
              closeDeleteModal();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            {/* ------------------------------------------------------------------
          HEADER
      ------------------------------------------------------------------ */}

            <div className="flex items-start justify-between border-b border-border/60 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <Trash2 className="size-5 text-destructive" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Delete Keyword?
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deletingId !== null}
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close delete confirmation"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* ------------------------------------------------------------------
          BODY
      ------------------------------------------------------------------ */}

            <div className="px-5 py-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  "{deleteTarget.keyword}"
                </span>
                ?
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                The keyword and its search configuration will
                be permanently removed.
              </p>

              {deleteError && (
                <div className="mt-4 rounded-md border border-destructive/25 bg-destructive-soft px-3 py-2.5 text-xs text-destructive">
                  {deleteError}
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------------
          FOOTER
      ------------------------------------------------------------------ */}

            <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 text-xs"
                onClick={closeDeleteModal}
                disabled={deletingId !== null}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="h-9 min-w-[120px] bg-destructive text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deletingId !== null}
              >
                {deletingId !== null ? (
                  <>
                    <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1.5 size-3.5" />
                    Delete Keyword
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}