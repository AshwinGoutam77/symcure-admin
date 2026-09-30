"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { getPatients } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";
import { formatDate } from "@/lib/formatters";

/* ================================================================
   PAGE
================================================================ */

export default function PatientsPage() {
  const [search, setSearch] = useState(() => {
    if (typeof window === "undefined") return "";

    return sessionStorage.getItem("patients-search") ?? "";
  });

  const [status, setStatus] = useState(() => {
    if (typeof window === "undefined") return "";

    return sessionStorage.getItem("patients-status") ?? "";
  });

  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 1;

    const saved = Number(
      sessionStorage.getItem("patients-page") ?? 1,
    );

    return Number.isInteger(saved) && saved > 0 ? saved : 1;
  });

  const hasRestoredScroll = useRef(false);

  /* ==============================================================
     PERSIST PAGE / FILTERS
  ============================================================== */

  useEffect(() => {
    sessionStorage.setItem("patients-page", String(page));
  }, [page]);

  useEffect(() => {
    sessionStorage.setItem("patients-search", search);
  }, [search]);

  useEffect(() => {
    sessionStorage.setItem("patients-status", status);
  }, [status]);

  /* ==============================================================
     SCROLL POSITION
  ============================================================== */

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const saveScroll = () => {
      const scrollTop =
        document.scrollingElement?.scrollTop ??
        window.scrollY ??
        0;

      sessionStorage.setItem(
        "patients-scroll-position",
        String(scrollTop),
      );
    };

    window.addEventListener("scroll", saveScroll, {
      passive: true,
    });

    return () => {
      saveScroll();

      window.removeEventListener("scroll", saveScroll);

      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  /* ==============================================================
     API
  ============================================================== */

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useAdminQuery(
    () =>
      getPatients({
        search,
        status,
        page,
        limit: 20,
      }),
    [
      "admin",
      "patients",
      {
        search,
        status,
        page,
        limit: 20,
      },
    ],
  );

  /* ==============================================================
     RESTORE SCROLL AFTER DATA HAS LOADED
  ============================================================== */

  useEffect(() => {
    if (isLoading) return;

    if (hasRestoredScroll.current) return;

    const shouldRestore =
      sessionStorage.getItem("patients-restore-on-back") === "1";

    if (!shouldRestore) return;

    const savedScroll = Number(
      sessionStorage.getItem(
        "patients-scroll-position",
      ) ?? 0,
    );

    hasRestoredScroll.current = true;

    const restoreScroll = () => {
      const scrollElement = document.scrollingElement;

      if (scrollElement) {
        scrollElement.scrollTo({
          top: savedScroll,
          left: 0,
          behavior: "auto",
        });
      } else {
        window.scrollTo({
          top: savedScroll,
          left: 0,
          behavior: "auto",
        });
      }
    };

    const frame1 = requestAnimationFrame(() => {
      const frame2 = requestAnimationFrame(() => {
        restoreScroll();

        /*
         * One additional restore after the browser has
         * completed layout/paint.
         */
        window.setTimeout(() => {
          restoreScroll();

          sessionStorage.removeItem(
            "patients-restore-on-back",
          );
        }, 100);
      });

      return () => {
        cancelAnimationFrame(frame2);
      };
    });

    return () => {
      cancelAnimationFrame(frame1);
    };
  }, [isLoading]);

  const payload: any = data ?? {};

  const rows: any[] = Array.isArray(payload)
    ? payload
    : payload.data ?? [];

  const meta = payload.meta ?? {};

  /* ==============================================================
     COUNTERS
  ============================================================== */

  const totalPatients =
    meta.total ?? rows.length;

  const activePatients = rows.filter(
    (row) =>
      String(
        row.effective_status ??
          row.status ??
          "",
      ).toLowerCase() === "active",
  ).length;

  const suspendedPatients = rows.filter(
    (row) =>
      String(
        row.effective_status ??
          row.status ??
          "",
      ).toLowerCase() === "suspended",
  ).length;

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-5">

        {/* ========================================================
            PAGE HEADER
        ========================================================= */}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground/80">
              <span>Administration</span>

              <span>/</span>

              <span className="text-muted-foreground">
                Patients
              </span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Patient Management
            </h1>

            <p className="mt-1 text-xs text-muted-foreground">
              View and manage patient records across
              the Symcure platform.
            </p>
          </div>
        </div>

        {/* ========================================================
            ERROR
        ========================================================= */}

        {error && (
          <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 text-xs text-destructive">
            {error.message}
          </div>
        )}

        {/* ========================================================
            PATIENTS TABLE
        ========================================================= */}

        <div className="mt-5 overflow-hidden rounded-lg bg-card shadow-sm">

          {/* Table Header */}

          <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h2 className="text-base font-semibold text-foreground">
                Patients
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground/80">
                {isLoading
                  ? "Loading patients..."
                  : `${meta.total ?? rows.length} patients found`}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">

              {/* Search */}

              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />

                <Input
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                  placeholder="Search name, mobile or patient ID..."
                  className="h-9 border-border bg-muted/50 pl-9 pr-9 text-xs focus:bg-card"
                />
              </div>

              {/* Status */}

              <select
                value={status}
                onChange={(event) => {
                  setPage(1);
                  setStatus(event.target.value);
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

                <option value="deleted">
                  Deleted
                </option>
              </select>
            </div>
          </div>

          {/* Error */}

          {error && (
            <div className="border-b border-destructive/25 bg-destructive-soft px-4 py-3 text-xs text-destructive">
              {error.message}
            </div>
          )}

          {/* Loading */}

          {isLoading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">

                <RefreshCw className="size-5 animate-spin text-primary" />

                <p className="text-xs text-muted-foreground/80">
                  Loading patients...
                </p>

              </div>
            </div>
          ) : rows.length === 0 ? (

            /* Empty */

            <div className="flex min-h-[300px] flex-col items-center justify-center px-4 text-center">

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                <Users className="size-5 text-muted-foreground/80" />
              </div>

              <p className="mt-3 text-sm font-semibold text-foreground/80">
                No patients found
              </p>

              <p className="mt-1 text-xs text-muted-foreground/80">
                Try changing your search or status filter.
              </p>

            </div>
          ) : (

            <div className="mt-5 overflow-x-auto px-5">

              <DataTable
                columns={[
                  {
                    header: "Patient",
                    key: "name",

                    render: (_, row) => {
                      const name =
                        row?.full_name ||
                        [
                          row?.first_name,
                          row?.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ") ||
                        "Unknown Patient";

                      return (
                        <div className="flex items-center gap-3">
                          <div className="min-w-0">

                            <div className="flex items-center gap-2">

                              <p className="max-w-[190px] truncate text-[12px] font-semibold text-foreground">
                                {name}
                              </p>

                              {/* APP / WEB TAG */}

                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  row?.is_app_account === true ||
                                  String(
                                    row?.created_source ?? "",
                                  ).toLowerCase() === "app"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {row?.is_app_account === true ||
                                String(
                                  row?.created_source ?? "",
                                ).toLowerCase() === "app"
                                  ? "App"
                                  : "Web"}
                              </span>

                            </div>

                            <p className="max-w-[180px] truncate text-xs font-normal text-muted-foreground/80">
                              {row?.guardian_name &&
                              row?.guardian_type
                                ? row.guardian_type +
                                  " " +
                                  row.guardian_name
                                : ""}
                            </p>

                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                              {row?.account_code ??
                                row?.patient_code ??
                                `SYM-${row?.id ?? "—"}`}
                            </p>

                          </div>
                        </div>
                      );
                    },
                  },

                  {
                    header: "DOB / Gender",
                    key: "dob",

                    render: (_, row) => (
                      <div className="min-w-[100px]">

                        <p className="text-[12px] font-medium text-foreground/80">
                          {row?.dob
                            ? formatDate(row.dob)
                            : row?.age != null
                              ? `${row.age} Years`
                              : "—"}
                        </p>

                        {row?.gender && (
                          <p className="mt-0.5 text-[10px] capitalize text-muted-foreground/80">
                            {row.gender}
                          </p>
                        )}

                      </div>
                    ),
                  },

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
                    header: "Email",
                    key: "email",

                    render: (value) => (
                      <span className="block max-w-[190px] truncate text-xs text-muted-foreground">
                        {value ?? "—"}
                      </span>
                    ),
                  },

                  {
                    header: "Aadhaar / ABHA",
                    key: "identity",

                    render: (_, row) => (
                      <div className="text-xs leading-5">

                        <p className="text-muted-foreground">
                          <span className="text-muted-foreground/80">
                            Aadhaar:
                          </span>{" "}
                          {row?.aadhaar_mask ?? "—"}
                        </p>

                        <p className="text-muted-foreground">
                          <span className="text-muted-foreground/80">
                            ABHA:
                          </span>{" "}
                          {row?.abha_mask ?? "—"}
                        </p>

                      </div>
                    ),
                  },

                  {
                    header: "Appointments",
                    key: "total_appointments",

                    render: (value) => (
                      <span className="text-sm font-medium text-foreground/80">
                        {value ?? 0}
                      </span>
                    ),
                  },

                  {
                    header: "Status",
                    key: "status",

                    render: (_, row) => {
                      const statusValue = String(
                        row?.effective_status ??
                          row?.status ??
                          "",
                      ).toLowerCase();

                      return (
                        <StatusBadge
                          status={
                            statusValue === "active"
                              ? "active"
                              : statusValue ===
                                    "suspended" ||
                                statusValue === "deleted"
                                ? "failed"
                                : "pending"
                          }
                        >
                          {statusValue
                            ? statusValue
                                .replace(/_/g, " ")
                                .replace(
                                  /\b\w/g,
                                  (char: string) =>
                                    char.toUpperCase(),
                                )
                            : "—"}
                        </StatusBadge>
                      );
                    },
                  },

                  {
                    header: "",
                    key: "action",

                    render: (_, row) => (
                      <Link
                        href={`/patients/${row.id}`}
                        title="View patient"
                        onClick={() => {
                          /*
                           * Mark that the next visit back to
                           * Patients should restore the list.
                           */

                          sessionStorage.setItem(
                            "patients-restore-on-back",
                            "1",
                          );

                          /*
                           * Save the exact list state before
                           * navigating to patient detail.
                           */

                          sessionStorage.setItem(
                            "patients-page",
                            String(page),
                          );

                          sessionStorage.setItem(
                            "patients-search",
                            search,
                          );

                          sessionStorage.setItem(
                            "patients-status",
                            status,
                          );

                          const scrollTop =
                            document.scrollingElement
                              ?.scrollTop ??
                            window.scrollY ??
                            0;

                          sessionStorage.setItem(
                            "patients-scroll-position",
                            String(scrollTop),
                          );
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/50 transition hover:bg-muted hover:text-muted-foreground"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    ),
                  },
                ]}
                data={rows}
              />

            </div>
          )}

          {/* ======================================================
              PAGINATION
          ======================================================= */}

          {!isLoading && rows.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-xs text-muted-foreground/80">
                Showing{" "}

                <span className="font-medium text-muted-foreground">
                  {(Number(
                    meta?.current_page ?? page,
                  ) -
                    1) *
                    Number(meta?.per_page ?? 20) +
                    1}
                </span>

                {" – "}

                <span className="font-medium text-muted-foreground">
                  {Math.min(
                    Number(
                      meta?.current_page ?? page,
                    ) *
                      Number(meta?.per_page ?? 20),
                    Number(
                      meta?.total ?? rows.length,
                    ),
                  )}
                </span>

                {" of "}

                <span className="font-medium text-muted-foreground">
                  {Number(
                    meta?.total ?? rows.length,
                  )}
                </span>
              </p>

              <div className="flex items-center gap-1.5">

                {/* Previous */}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((previous) =>
                      Math.max(1, previous - 1),
                    )
                  }
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Previous
                </Button>

                {/* Current Page */}

                <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-foreground px-2 text-xs font-semibold text-white">
                  {Number(
                    meta?.current_page ?? page,
                  )}
                </div>

                {/* Next */}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  disabled={
                    meta?.last_page
                      ? Number(meta.last_page) <=
                        Number(
                          meta.current_page ?? page,
                        )
                      : rows.length < 20
                  }
                  onClick={() =>
                    setPage(
                      (previous) =>
                        previous + 1,
                    )
                  }
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}