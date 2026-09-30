"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import { getDoctors } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";

function DoctorsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /*
   * Persist the complete listing state in the URL.
   * This keeps filters and pagination when returning from a doctor detail page,
   * refreshing the browser, or using browser navigation.
   */
  const initialSearch = searchParams.get("search") ?? "";
  const initialStatus = searchParams.get("status") ?? "";
  const initialPage = Math.max(
    1,
    Number(searchParams.get("page") ?? "1") || 1,
  );

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);
  const limit = 20;

  const updateListUrl = (
    nextSearch: string,
    nextStatus: string,
    nextPage: number,
  ) => {
    const params = new URLSearchParams();

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextStatus) {
      params.set("status", nextStatus);
    }

    params.set("page", String(Math.max(1, nextPage)));

    const query = params.toString();

    router.replace(
      query ? `${pathname}?${query}` : pathname,
      { scroll: false },
    );
  };

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    const urlStatus = searchParams.get("status") ?? "";
    const urlPage = Math.max(
      1,
      Number(searchParams.get("page") ?? "1") || 1,
    );

    setSearch((current) =>
      current === urlSearch ? current : urlSearch,
    );
    setStatus((current) =>
      current === urlStatus ? current : urlStatus,
    );
    setPage((current) =>
      current === urlPage ? current : urlPage,
    );
  }, [searchParams]);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAdminQuery(
    () =>
      getDoctors({
        search,
        status,
        page,
        limit,
      }),
    ["admin", "doctors", { search, status, page, limit: 20 }],
  );

  const payload: any = data ?? {};

  const rows: any[] = Array.isArray(payload)
    ? payload
    : payload.data ?? [];

  const meta = payload.meta ?? {};

  const total = Number(meta.total ?? rows.length);

  const currentPage = Number(
    meta.current_page ?? page,
  );

  /* =========================================================
     HELPERS
  ========================================================== */

  const getName = (doctor: any) => {
    return (
      doctor.display_name ??
      ([doctor.first_name, doctor.last_name]
        .filter(Boolean)
        .join(" ") ||
        doctor.name ||
        "—")
    );
  };

  const getStatus = (doctor: any) => {
    return (
      doctor.account_status ??
      doctor.status ??
      "—"
    );
  };

  const getStatusType = (doctor: any) => {
    const value = getStatus(doctor)
      .toString()
      .toLowerCase();

    if (value === "active") {
      return "Active";
    }

    if (value === "suspended") {
      return "suspended";
    }

    if (value === "rejected") {
      return "rejected";
    }

    return "pending";
  };

  const formatFee = (value: any) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return String(value);
    }

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(number);
  };

  const formatDate = (value: any) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const getApprovalDate = (doctor: any) => {
    return (
      doctor.approved_at ??
      doctor.application_approved_at ??
      doctor.approval_date ??
      doctor.activated_at ??
      null
    );
  };

  const getApplicationStatus = (doctor: any) => {
    return (
      doctor.application_status ??
      doctor.account_status ??
      doctor.status ??
      "pending"
    )
      .toString()
      .toLowerCase();
  };

  /* =========================================================
     COUNTS
     
     IMPORTANT:
     These are calculated from the currently loaded page.
     If the API later provides global status counters,
     replace these values with those API counters.
  ========================================================== */

  const activeCount = rows.filter(
    (doctor) =>
      getStatus(doctor)
        .toString()
        .toLowerCase() === "active",
  ).length;

  const pendingCount = rows.filter(
    (doctor) =>
      getStatus(doctor)
        .toString()
        .toLowerCase() === "pending",
  ).length;

  const suspendedCount = rows.filter(
    (doctor) =>
      getStatus(doctor)
        .toString()
        .toLowerCase() === "suspended",
  ).length;

  /* =========================================================
     FILTERS
  ========================================================== */

  const hasFilters =
    Boolean(search) || Boolean(status);

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
    updateListUrl("", "", 1);
  };

  /* =========================================================
     PAGINATION
  ========================================================== */

  const startRecord =
    total === 0
      ? 0
      : (currentPage - 1) * 20 + 1;

  const endRecord =
    Math.min(currentPage * 20, total);

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
              <span>Administration</span>

              <span className="text-muted-foreground/50">
                /
              </span>

              <span className="text-muted-foreground">
                Doctors
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
              Doctor Management
            </h1>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Manage registered doctors and account status.
            </p>

          </div>

        </div>


        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3">

            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />

            <div>
              <p className="text-sm font-semibold text-destructive">
                Unable to load doctors
              </p>

              <p className="mt-1 text-xs text-destructive">
                {error.message}
              </p>
            </div>

          </div>
        )}


        {/* =====================================================
            MAIN TABLE
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
                  Doctors
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {isLoading
                    ? "Loading doctor records..."
                    : `${total} doctor${total === 1
                      ? ""
                      : "s"
                    } found`}
                </p>

              </div>


              {/* Filters */}
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">

                {/* Search */}
                <div className="relative w-full sm:w-[300px]">

                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />

                  <Input
                    value={search}
                    onChange={(e) => {
                      const value = e.target.value;

                      setSearch(value);
                      setPage(1);
                      updateListUrl(value, status, 1);
                    }}
                    placeholder="Search doctor, code, mobile..."
                    className="h-9 border-border bg-muted/50 pl-9 pr-9 text-xs focus:bg-card"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                        updateListUrl("", status, 1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 transition hover:text-foreground/80"
                    >
                      <X className="size-4" />
                    </button>
                  )}

                </div>


                {/* Status */}
                <select
                  value={status}
                  onChange={(e) => {
                    const value = e.target.value;

                    setStatus(value);
                    setPage(1);
                    updateListUrl(search, value, 1);
                  }}
                  className="h-9 min-w-[145px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                >
                  <option value="">
                    All statuses
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="suspended">
                    Suspended
                  </option>

                  <option value="rejected">
                    Rejected
                  </option>
                </select>

              </div>

            </div>

          </div>


          {/* ===================================================
              TABLE
          ==================================================== */}

          <div className="overflow-x-auto px-5 mt-5">

            <DataTable
              columns={[

                /* ------------------------------------------------
                   DOCTOR
                ------------------------------------------------- */

                {
                  header: "Doctor",
                  key: "name",
                  render: (_, row) => {
                    const name = getName(row);

                    return (
                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <p className="max-w-[190px] truncate text-[12px] font-semibold text-slate-800">
                            {name}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-800">
                            {row.doctor_code || "—"}
                          </p>
                        </div>
                      </div>
                    );
                  },
                },


                /* ------------------------------------------------
                   MOBILE
                ------------------------------------------------- */

                {
                  header: "Mobile",
                  key: "mobile",
                  render: (value) => (
                    <span className="text-xs text-muted-foreground">
                      {value ?? "—"}
                    </span>
                  ),
                },

                {
                  header: "Registration",
                  key: "registered_at",
                  render: (_, row) => (
                    <div className="min-w-[100px]">
                      <p className="text-[12px] font-medium text-slate-700">
                        {formatDate(row.registered_at)}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Registered
                      </p>
                    </div>
                  ),
                },


                /* ------------------------------------------------
                   SPECIALTY
                ------------------------------------------------- */

                {
                  header: "Specialty",
                  key: "specialization_name",
                  render: (_, row) => (
                    <span className="text-xs text-muted-foreground">
                      {row.specialization_name ??
                        row.specialization?.name ??
                        row.specialty ??
                        "—"}
                    </span>
                  ),
                },


                /* ------------------------------------------------
                   FEE
                ------------------------------------------------- */

                {
                  header: "Fee",
                  key: "fees",
                  render: (_, row) => (
                    <span className="text-xs font-medium text-foreground/80">
                      {formatFee(
                        row.online_consultation_fee ??
                        row.online_fee,
                      )}
                    </span>
                  ),
                },


                /* ------------------------------------------------
                   STATUS
                ------------------------------------------------- */

                {
                  header: "Status",
                  key: "status",
                  render: (_, row) => {
                    const rawStatus =
                      getStatus(row)
                        .toString()
                        .toLowerCase();

                    return (
                      <StatusBadge
                        status={getStatusType(row)}
                      >
                        {rawStatus.replace(
                          /_/g,
                          " ",
                        )}
                      </StatusBadge>
                    );
                  },
                },


                /* ------------------------------------------------
                   COMMISSION
                ------------------------------------------------- */

                {
                  header: "Commission",
                  key: "commission",
                  render: (_, row) => {
                    const commission = row.commission;

                    return (
                      <>
                        <p
                          className="text-xs font-medium text-muted-foreground"
                        >
                          Online: ₹{commission.online_consultation_commission_amt}
                        </p>
                        <p
                          className="text-xs font-medium text-muted-foreground"
                        >
                          Cash: ₹{commission.clinic_consultation_commission_amt}
                        </p>
                      </>
                    );
                  },
                },


                /* ------------------------------------------------
                   ACTION
                ------------------------------------------------- */

                {
                  header: "",
                  key: "action",
                  render: (_, row) => (
                    <Link
                      href={`/doctors/${row.id}?returnTo=${encodeURIComponent(
                        `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
                      )}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/50 transition hover:bg-muted hover:text-muted-foreground"
                      title="View doctor"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  ),
                },
              ]}
              data={isLoading ? [] : rows}
            />

          </div>


          {/* ===================================================
              LOADING
          ==================================================== */}

          {isLoading && (
            <div className="flex items-center justify-center gap-2 border-t border-border/60 py-12">

              <RefreshCw className="size-4 animate-spin text-primary" />

              <span className="text-xs text-muted-foreground">
                Loading doctors...
              </span>

            </div>
          )}


          {/* ===================================================
    PAGINATION
==================================================== */}

          {!isLoading && rows.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              {/* COUNT */}
              <p className="text-xs text-muted-foreground/80">
                Showing{" "}

                <span className="font-medium text-muted-foreground">
                  {(currentPage - 1) * limit + 1}
                </span>

                {" – "}

                <span className="font-medium text-muted-foreground">
                  {Math.min(
                    currentPage * limit,
                    total,
                  )}
                </span>

                {" of "}

                <span className="font-medium text-muted-foreground">
                  {total}
                </span>
              </p>

              {/* PAGINATION */}
              <Pagination
                currentPage={currentPage}
                totalPages={
                  Number(meta.last_page) || 1
                }
                disabled={isLoading || isFetching}
                onPageChange={(nextPage) => {
                  setPage(nextPage);

                  updateListUrl(
                    search,
                    status,
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
            Symcure Administration Portal
          </span>

          <span>
            Permission controlled
          </span>

        </div>

      </div>
    </div>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense fallback={null}>
      <DoctorsPageContent />
    </Suspense>
  );
}