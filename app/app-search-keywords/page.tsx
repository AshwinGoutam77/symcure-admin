"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
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

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

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

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

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
 * Supports all of these possible API shapes:
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
 * OR
 *
 * { data: { keyword, ... } }
 */
function extractDetail(payload: any): any {
  if (!payload) {
    return null;
  }

  // Actual API response:
  // {
  //   search_keyword: {
  //     ...
  //   }
  // }
  if (payload?.search_keyword) {
    return payload.search_keyword;
  }

  // Fallbacks
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
    const id = Number(value);

    if (
      Number.isFinite(id) &&
      id > 0
    ) {
      ids.add(id);
    }
  };

  /* ============================================================
     DIRECT ID ARRAYS
  ============================================================ */

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

  /* ============================================================
     OBJECT ARRAYS
  ============================================================ */

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

  /* ============================================================
     NESTED DATA FALLBACK
  ============================================================ */

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

  // unwrapData() may return:
  // { options: [...] }
  if (Array.isArray(payload?.options)) {
    return payload.options;
  }

  // { data: { options: [...] } }
  if (Array.isArray(payload?.data?.options)) {
    return payload.data.options;
  }

  // { data: [...] }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  // { data: { data: [...] } }
  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  // fallback
  if (
    Array.isArray(
      payload?.qualification_specializations,
    )
  ) {
    return payload.qualification_specializations;
  }

  return [];
}

/* ========================================================================== */
/* PAGE                                                                       */
/* ========================================================================== */

export default function AppSearchKeywordsPage() {
  /* ------------------------------------------------------------------------ */
  /* LIST FILTERS                                                             */
  /* ------------------------------------------------------------------------ */

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const limit = 20;

  /* ------------------------------------------------------------------------ */
  /* LIST API                                                                  */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* NORMALIZE LIST RESPONSE                                                   */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* MODAL                                                                     */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* STATUS / DELETE LOADING                                                   */
  /* ------------------------------------------------------------------------ */

  const [statusId, setStatusId] =
    useState<number | null>(null);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  /* ======================================================================== */
  /* LOAD SPECIALIZATION OPTIONS                                               */
  /* ======================================================================== */

  const loadSpecializationOptions =
    async () => {
      try {
        setOptionsLoading(true);

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

  /* ======================================================================== */
  /* OPEN ADD MODAL                                                            */
  /* ======================================================================== */

  const openAddModal = async () => {
    setEditingId(null);

    setForm({
      keyword: "",
      is_active: true,
      qualification_specialization_ids: [],
    });

    setModalError(null);
    setShowModal(true);

    await loadSpecializationOptions();
  };

  /* ======================================================================== */
  /* OPEN EDIT MODAL                                                           */
  /* ======================================================================== */

const openEditModal = async (
  row: KeywordRow,
) => {
  try {
    setModalError(null);

    setEditingId(row.id);

    /*
     * Open modal immediately with the information
     * already available from the table.
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

    /* ==========================================================
       LOAD OPTIONS + DETAIL
    ========================================================== */

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

    /* ==========================================================
       SPECIALIZATION OPTIONS
    ========================================================== */

    const specializationOptions =
      extractOptions(
        optionsResponse,
      );

    setOptions(
      specializationOptions,
    );

    /* ==========================================================
       DETAIL
    ========================================================== */

    const detail =
      extractDetail(
        detailResponse,
      );

    console.log(
      "EDIT KEYWORD DETAIL:",
      detail,
    );

    /* ==========================================================
       GET SELECTED SPECIALIZATION IDS
    ========================================================== */

    let selectedIds =
      extractSelectedSpecializationIds(
        detail,
      );

    /*
     * Fallback to row data if the detail API
     * doesn't return specialization IDs.
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

    console.log(
      "SELECTED SPECIALIZATION IDS:",
      selectedIds,
    );

    /* ==========================================================
       UPDATE FORM
    ========================================================== */

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

  /* ======================================================================== */
  /* CLOSE MODAL                                                               */
  /* ======================================================================== */

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

  /* ======================================================================== */
  /* SPECIALIZATION TOGGLE                                                     */
  /* ======================================================================== */

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

  /* ======================================================================== */
  /* SAVE                                                                      */
  /* ======================================================================== */

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

      /*
       * IMPORTANT:
       * Backend requires is_active.
       */
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

      /*
       * Do not call closeModal() here because
       * saving is still true and closeModal()
       * intentionally blocks while saving.
       */
      setShowModal(false);
      setEditingId(null);

      setForm({
        keyword: "",
        is_active: true,
        qualification_specialization_ids:
          [],
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

  /* ======================================================================== */
  /* STATUS                                                                     */
  /* ======================================================================== */

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

  /* ======================================================================== */
  /* DELETE                                                                     */
  /* ======================================================================== */

  const handleDelete = async (
    row: KeywordRow,
  ) => {
    const confirmed =
      window.confirm(
        `Delete keyword "${row.keyword}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(row.id);

      await deleteAppSearchKeyword(
        String(row.id),
      );

      await refetch();
    } catch (err: any) {
      console.error(
        "Unable to delete keyword:",
        err,
      );

      window.alert(
        err?.message ??
          "Unable to delete keyword.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* ======================================================================== */
  /* RESET PAGE WHEN FILTER CHANGES                                            */
  /* ======================================================================== */

  useEffect(() => {
    if (
      lastPage > 0 &&
      page > lastPage
    ) {
      setPage(lastPage);
    }
  }, [page, lastPage]);

  /* ======================================================================== */
  /* TABLE COLUMNS                                                             */
  /* ======================================================================== */

  const columns = useMemo(
    () => [
      {
        header: "Keyword",
        key: "keyword",

        render: (
          value: string,
        ) => (
          <span className="font-medium text-foreground">
            {value || "—"}
          </span>
        ),
      },

      {
        header:
          "Qualification / Specialization",
        key: "qualification_specializations",

        render: (
          _: unknown,
          row: KeywordRow,
        ) => {
          const items =
            row.qualification_specializations ??
            [];

          if (!items.length) {
            return (
              <span className="text-xs text-muted-foreground">
                {row.specialization_count
                  ? `${row.specialization_count} specialization${
                      row.specialization_count ===
                      1
                        ? ""
                        : "s"
                    }`
                  : "—"}
              </span>
            );
          }

          return (
            <div className="flex max-w-[420px] flex-wrap gap-1">
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
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
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
          <span className="text-xs text-muted-foreground">
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
          row: KeywordRow,
        ) => {
          const updating =
            statusId === row.id;

          const deleting =
            deletingId === row.id;

          return (
            <div className="flex items-center gap-1">
              {/* EDIT */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Edit"
                onClick={() =>
                  openEditModal(row)
                }
                disabled={
                  updating ||
                  deleting
                }
              >
                <Pencil className="size-4" />
              </Button>

              {/* STATUS */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 min-w-8 px-1.5"
                title={
                  row.is_active
                    ? "Deactivate"
                    : "Activate"
                }
                onClick={() =>
                  handleStatus(row)
                }
                disabled={
                  updating ||
                  deleting
                }
              >
                {updating ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <span className="text-[10px] font-medium">
                    {row.is_active
                      ? "OFF"
                      : "ON"}
                  </span>
                )}
              </Button>

              {/* DELETE */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title="Delete"
                onClick={() =>
                  handleDelete(row)
                }
                disabled={
                  updating ||
                  deleting
                }
              >
                {deleting ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
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

  /* ======================================================================== */
  /* RENDER                                                                    */
  /* ======================================================================== */

  return (
    <>
      <div className="w-full">
        <div className="flex w-full flex-col gap-5">
          {/* ================================================================== */}
          {/* HEADER                                                             */}
          {/* ================================================================== */}

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
              className="h-9 gap-1.5 text-xs"
              onClick={openAddModal}
            >
              <Plus className="size-4" />
              Add Keyword
            </Button>
          </div>

          {/* ================================================================== */}
          {/* API ERROR                                                          */}
          {/* ================================================================== */}

          {error && (
            <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 text-xs text-destructive">
              {error.message}
            </div>
          )}

          {/* ================================================================== */}
          {/* TABLE                                                              */}
          {/* ================================================================== */}

          <section className="overflow-hidden rounded-lg bg-card shadow-sm">
            {/* ---------------------------------------------------------------- */}
            {/* TABLE HEADER                                                     */}
            {/* ---------------------------------------------------------------- */}

            <div className="border-b border-border/60">
              <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Keywords
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {isLoading
                      ? "Loading keywords..."
                      : `${total} keyword${
                          total === 1
                            ? ""
                            : "s"
                        } found`}
                  </p>
                </div>

                {/* FILTERS */}
                <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                  {/* SEARCH */}
                  <div className="relative w-full sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />

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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 transition hover:text-foreground"
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
                      className={`size-3.5 ${
                        isLoading
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* DATA TABLE                                                        */}
            {/* ---------------------------------------------------------------- */}

            <div className="p-0">
              {isLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="size-4 animate-spin" />

                    Loading keywords...
                  </div>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Search className="size-4 text-muted-foreground" />
                  </div>

                  <p className="text-sm font-medium text-foreground">
                    No keywords found
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Try changing your
                    search or status
                    filter.
                  </p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={rows}
                />
              )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* PAGINATION                                                        */}
            {/* ---------------------------------------------------------------- */}

            {!isLoading &&
              rows.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    Page{" "}
                    <span className="font-medium text-foreground">
                      {currentPage}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      {lastPage}
                    </span>

                    <span className="mx-1">
                      •
                    </span>

                    {total} total
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      disabled={
                        currentPage <=
                        1
                      }
                      onClick={() =>
                        setPage(
                          Math.max(
                            1,
                            currentPage -
                              1,
                          ),
                        )
                      }
                    >
                      <ChevronLeft className="size-3.5" />

                      Previous
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      disabled={
                        currentPage >=
                        lastPage
                      }
                      onClick={() =>
                        setPage(
                          Math.min(
                            lastPage,
                            currentPage +
                              1,
                          ),
                        )
                      }
                    >
                      Next

                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
          </section>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* ADD / EDIT MODAL                                                       */}
      {/* ====================================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            {/* ---------------------------------------------------------------- */}
            {/* MODAL HEADER                                                      */}
            {/* ---------------------------------------------------------------- */}

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
                onClick={closeModal}
                disabled={saving}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* MODAL BODY                                                        */}
            {/* ---------------------------------------------------------------- */}

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
                <div className="mb-2 flex items-center justify-between">
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
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
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
                    <div className="flex items-center justify-center px-4 py-8">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <RefreshCw className="size-4 animate-spin" />

                        Loading
                        specializations...
                      </div>
                    </div>
                  ) : options.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No specialization
                      options found.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {options.map((option) => {
  const selected =
    form.qualification_specialization_ids.includes(
      Number(option.id),
    );

  return (
    <label
      key={option.id}
      className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-muted/40"
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() =>
          toggleSpecialization(
            Number(option.id),
          )
        }
        disabled={saving}
        className="size-4 rounded border-border"
      />

      <span
        className={`text-xs ${
          selected
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
})}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* MODAL FOOTER                                                      */}
            {/* ---------------------------------------------------------------- */}

            <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 text-xs"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="h-9 min-w-[100px] text-xs"
                onClick={handleSave}
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
    </>
  );
}