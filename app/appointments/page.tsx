"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { getAppointments } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";

export default function AppointmentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [consultType, setConsultType] = useState("");
 const [page, setPage] = useState(() => {
  if (typeof window === "undefined") return 1;

  const savedPage = sessionStorage.getItem("appointments-page");
  return savedPage ? Number(savedPage) : 1;
});

useEffect(() => {
  sessionStorage.setItem("appointments-page", String(page));
}, [page]);

  const { data, isLoading, error, refetch } = useAdminQuery(
    () =>
      getAppointments({
        search,
        status,
        consult_type: consultType,
        page,
        limit: 20,
      }),
    [
      "admin",
      "appointments",
      {
        search,
        status,
        consultType,
        page,
        limit: 20,
      },
    ],
  );

  const payload: any = data ?? {};

  /*
   * Supports both:
   *
   * {
   *   data: [],
   *   meta: {}
   * }
   *
   * and:
   *
   * {
   *   success: true,
   *   data: {
   *      data: [],
   *      meta: {}
   *   }
   * }
   */
  const apiData =
    payload?.data?.data && Array.isArray(payload.data.data)
      ? payload.data
      : payload;

  const rows: any[] = Array.isArray(apiData?.data)
    ? apiData.data
    : Array.isArray(payload)
      ? payload
      : [];

  const meta = apiData?.meta ?? {};

  const total = Number(meta?.total ?? rows.length);
  const currentPage = Number(meta?.current_page ?? page);
  const lastPage = Number(meta?.last_page ?? 1);
  const perPage = Number(meta?.per_page ?? 20);
  const startRecord = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const endRecord = total === 0 ? 0 : Math.min(startRecord + rows.length - 1, total);

  /* ================================================================
     HELPERS
  ================================================================= */

  function formatStatus(value: unknown) {
    const status = String(value ?? "").toLowerCase();

    if (!status) return "—";

    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function statusType(value: unknown) {
    const status = String(value ?? "").toLowerCase();

    if (status === "completed") {
      return "success";
    }

    if (
      status === "cancelled" ||
      status === "no_show"
    ) {
      return "failed";
    }

    if (status === "unresolved") {
      return "warning";
    }

    return "active";
  }

  function formatAmount(value: unknown) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return `₹${String(value)}`;
    }

    return `₹${number.toLocaleString("en-IN")}`;
  }

  function formatDate(value: unknown) {
    if (!value) return "—";

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  function formatTime(value: unknown) {
    if (!value) return "—";

    const valueString = String(value);

    /*
     * API may return:
     * 16:00:00
     */
    if (/^\d{2}:\d{2}/.test(valueString)) {
      const [hoursString, minutesString] =
        valueString.split(":");

      const hours = Number(hoursString);
      const minutes = Number(minutesString);

      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        const date = new Date();

        date.setHours(hours, minutes, 0, 0);

        return new Intl.DateTimeFormat("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
          .format(date)
          .replace("AM", "am")
          .replace("PM", "pm");
      }
    }

    const date = new Date(valueString);

    if (Number.isNaN(date.getTime())) {
      return valueString;
    }

    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .format(date)
      .replace("AM", "am")
      .replace("PM", "pm");
  }

  function getPatientName(row: any) {
    return (
      row?.patient?.full_name ??
      row?.patient_name ??
      row?.patient?.name ??
      "—"
    );
  }

  function getPatientCode(row: any) {
    return (
      row?.patient?.account_code ??
      row?.patient_code ??
      row?.patient?.patient_code ??
      ""
    );
  }

  function getDoctorName(row: any) {
    return (
      row?.doctor?.full_name ??
      row?.doctor_name ??
      row?.doctor?.name ??
      "—"
    );
  }

  function getAppointmentDate(row: any) {
    return (
      row?.date ??
      row?.appointment_date ??
      row?.start_at ??
      row?.scheduled_at
    );
  }

  function getAppointmentTime(row: any) {
    return (
      row?.time_label ??
      row?.slot_text ??
      row?.start_time ??
      row?.start_at
    );
  }

  /* ================================================================
     CURRENT PAGE COUNTS
  ================================================================= */

  const stats = useMemo(() => {
    let scheduled = 0;
    let completed = 0;
    let unresolved = 0;

    rows.forEach((row) => {
      const current = String(
        row?.status ?? "",
      ).toLowerCase();

      if (current === "scheduled") {
        scheduled++;
      }

      if (current === "completed") {
        completed++;
      }

      if (current === "unresolved") {
        unresolved++;
      }
    });

    return {
      total: Number(meta?.total ?? rows.length),
      scheduled,
      completed,
      unresolved,
    };
  }, [rows, meta?.total]);

  /* ================================================================
     RENDER
  ================================================================= */

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-5">

        {/* ==========================================================
            HEADER
        =========================================================== */}

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground/80">
              <span>Administration</span>
              <span>/</span>
              <span className="text-muted-foreground">
                Appointments
              </span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Appointment Monitoring
            </h1>

            <p className="mt-1 text-xs text-muted-foreground">
              Monitor and manage appointments across the
              Symcure platform.
            </p>
          </div>
        </div>

        {/* ==========================================================
            KPI CARDS
        =========================================================== */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

          {/* TOTAL */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex h-[108px] items-center justify-between px-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground/80">
                  Total Appointments
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {stats.total}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Platform appointments
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calendar className="size-5" />
              </div>
            </div>
          </div>

          {/* SCHEDULED */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex h-[108px] items-center justify-between px-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground/80">
                  Scheduled
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {stats.scheduled}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Upcoming appointments
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft text-success">
                <Clock className="size-5" />
              </div>
            </div>
          </div>

          {/* COMPLETED */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex h-[108px] items-center justify-between px-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground/80">
                  Completed
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {stats.completed}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Completed visits
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft text-success">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </div>

          {/* UNRESOLVED */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex h-[108px] items-center justify-between px-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground/80">
                  Unresolved
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {stats.unresolved}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Require attention
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-soft text-warning">
                <XCircle className="size-5" />
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================================
            ERROR
        =========================================================== */}

        {error && (
          <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 text-xs text-destructive">
            {error.message}
          </div>
        )}

        {/* ==========================================================
            TABLE
        =========================================================== */}

        <section className="overflow-hidden rounded-lg bg-card shadow-sm">

          {/* TABLE HEADER */}

          <div className="border-b border-border/60">

            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

              {/* Title */}
              <div>

                <h2 className="text-base font-semibold text-foreground">
                  Appointments
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {isLoading
                    ? "Loading appointment records..."
                    : `${total} appointment${total === 1 ? "" : "s"} found`}
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
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search appointment, token, patient or doctor..."
                    className="h-9 border-border bg-muted/50 pl-9 pr-9 text-xs focus:bg-card"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setPage(1);
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
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 min-w-[145px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                >
                  <option value="">All statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No-show</option>
                  <option value="unresolved">Unresolved</option>
                </select>

                {/* Type */}
                <select
                  value={consultType}
                  onChange={(e) => {
                    setConsultType(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 min-w-[125px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                >
                  <option value="">All types</option>
                  <option value="offline">Clinic</option>
                  <option value="online">Video</option>
                </select>

              </div>

            </div>

          </div>

          {/* TABLE */}

          <div className="overflow-x-auto px-5 mt-5">
            <DataTable
              columns={[
                {
                  header: "Appointment",
                  key: "appointment",
                  render: (_, row) => (
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {row?.appointment_code ?? row?.id ?? "—"}
                      </p>

                      {row?.token_number && (
                        <p className="mt-0.5 text-xs text-muted-foreground/80">
                          Token: {row.token_number}
                        </p>
                      )}

                      {row?.source && (
                        <p className="mt-0.5 text-xs text-muted-foreground/80">
                          {row.source}
                        </p>
                      )}
                    </div>
                  ),
                },

                {
                  header: "Date / Time",
                  key: "date_time",
                  render: (_, row) => (
                    <div className="min-w-[105px]">
                      <p className="text-xs font-medium text-foreground/80">
                        {formatTime(getAppointmentTime(row))}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground/80">
                        {formatDate(getAppointmentDate(row))}
                      </p>
                    </div>
                  ),
                },

                {
                  header: "Patient",
                  key: "patient",
                  render: (_, row) => (
                    <div className="min-w-0">
                      <p className="max-w-[180px] truncate text-xs font-semibold text-foreground">
                        {getPatientName(row)}
                      </p>

                      <p className="max-w-[180px] truncate text-xs font-normal text-muted-foreground/80">
                        {(row?.patient?.guardian_name && row?.patient?.guardian_type )&& row?.patient?.guardian_type + " " + row?.patient?.guardian_name}
                      </p>

                      {getPatientCode(row) && (
                        <p className="mt-0.5 text-xs text-muted-foreground/80">
                          {getPatientCode(row)}
                        </p>
                      )}
                    </div>
                  ),
                },

                {
                  header: "Doctor",
                  key: "doctor",
                  render: (_, row) => (
                    <span className="block max-w-[180px] truncate text-xs text-muted-foreground">
                      {getDoctorName(row)}
                    </span>
                  ),
                },

                {
                  header: "Type",
                  key: "consult_type",
                  render: (_, row) => {
                    const online =
                      String(row?.consult_type ?? "").toLowerCase() === "online";

                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          online
                            ? "bg-chart-4/10 text-chart-4"
                            : "bg-warning-soft text-warning"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            online ? "bg-chart-4" : "bg-warning"
                          }`}
                        />
                        {online ? "Video" : "Clinic"}
                      </span>
                    );
                  },
                },

                {
                  header: "Status",
                  key: "status",
                  render: (_, row) => {
                    const currentStatus = String(
                      row?.status ?? "",
                    ).toLowerCase();

                    return (
                      <StatusBadge status={statusType(currentStatus)}>
                        {formatStatus(currentStatus)}
                      </StatusBadge>
                    );
                  },
                },

                {
                  header: "Amount",
                  key: "amount",
                  render: (_, row) => (
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {formatAmount(
                          row?.amount ??
                            row?.consultation_fee ??
                            row?.total_amount,
                        )}
                      </p>

                      {row?.payment_status && (
                        <p className="mt-0.5 text-xs text-muted-foreground/80">
                          {formatStatus(row.payment_status)}
                        </p>
                      )}
                    </div>
                  ),
                },

                {
                  header: "",
                  key: "action",
                  render: (_, row) => (
                    <Link
                      href={`/appointments/${row.id}`}
                      title="View appointment"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/50 transition hover:bg-muted hover:text-muted-foreground"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  ),
                },
              ]}
              data={isLoading ? [] : rows}
            />
          </div>

          {/* LOADING */}

          {isLoading && (
            <div className="flex items-center justify-center gap-2 border-t border-border/60 py-12">
              <RefreshCw className="size-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                Loading appointments...
              </span>
            </div>
          )}

          {/* PAGINATION */}

          {!isLoading && rows.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">

              {/* Count */}
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

              {/* Pagination */}
              <div className="flex items-center gap-1.5">

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    setPage((previous) => Math.max(1, previous - 1))
                  }
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Previous
                </Button>

                <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-foreground px-2 text-xs font-semibold text-white">
                  {currentPage}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  disabled={
                    lastPage
                      ? currentPage >= lastPage
                      : rows.length < 20
                  }
                  onClick={() =>
                    setPage((previous) => previous + 1)
                  }
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>

              </div>

            </div>
          )}

        </section>

        </div>
      </div>
  );
}