"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import {
  DateRangeFilter,
  getDefaultDateRange,
  type DateSort,
} from "@/components/date-range-filter";

import {
  ChevronRight,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  getAppointments,
  getDoctors,
} from "@/lib/api/admin";

import { useAdminQuery } from "@/hooks/use-admin-api";

type Doctor = {
  id: number;
  display_name?: string;
  doctor_code?: string;
  name?: string;
  code?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
};

function getDoctorDisplayName(doctor: Doctor) {
  return (
    doctor.display_name ||
    doctor.name ||
    doctor.full_name ||
    `${doctor.first_name ?? ""} ${doctor.last_name ?? ""}`.trim() ||
    `Doctor #${doctor.id}`
  );
}

function getDoctorCode(doctor: Doctor) {
  return doctor.doctor_code || doctor.code || "";
}

export default function AppointmentsPage() {
  const router = useRouter();

  const defaultDateRange = getDefaultDateRange();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [consultType, setConsultType] = useState("");
  const [doctorId, setDoctorId] = useState("");

  const [dateFrom, setDateFrom] = useState(
    () => defaultDateRange.date_from,
  );

  const [dateTo, setDateTo] = useState(
    () => defaultDateRange.date_to,
  );

  const [sort, setSort] = useState<DateSort>("desc");

  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 1;

    const savedPage = sessionStorage.getItem(
      "appointments-page",
    );

    return savedPage
      ? Math.max(1, Number(savedPage) || 1)
      : 1;
  });

  useEffect(() => {
    sessionStorage.setItem(
      "appointments-page",
      String(page),
    );
  }, [page]);

  /*
   * Doctors dropdown
   */
  const {
    data: doctorsData,
    isLoading: doctorsLoading,
  } = useAdminQuery(
    () =>
      getDoctors({
        page: 1,
        limit: 100,
        sort: "asc",
      }),
    [
      "admin",
      "appointments",
      "doctors",
      {
        page: 1,
        limit: 100,
        sort: "asc",
      },
    ],
  );

  const doctors = useMemo<Doctor[]>(() => {
    const payload: any = doctorsData ?? {};

    const rows =
      payload.data?.data ??
      payload.data ??
      payload.doctors ??
      [];

    return Array.isArray(rows) ? rows : [];
  }, [doctorsData]);

  /*
   * Appointments API with date range and sorting
   */
  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useAdminQuery(
    () =>
      getAppointments({
        search,
        status,
        consult_type: consultType,
        doctor_id: doctorId || undefined,
        date_from: dateFrom,
        date_to: dateTo,
        sort,
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
        doctorId,
        dateFrom,
        dateTo,
        sort,
        page,
        limit: 20,
      },
    ],
  );

  /*
   * Supports both response formats:
   *
   * { data: [], meta: {} }
   *
   * and:
   *
   * {
   *   success: true,
   *   data: { data: [], meta: {} }
   * }
   */
  const payload: any = data ?? {};

  const apiData =
    payload?.data?.data &&
      Array.isArray(payload.data.data)
      ? payload.data
      : payload;

  const rows: any[] = Array.isArray(apiData?.data)
    ? apiData.data
    : Array.isArray(payload)
      ? payload
      : [];

  const meta = apiData?.meta ?? {};

  const total = Number(meta?.total ?? rows.length);
  const currentPage = Number(
    meta?.current_page ?? page,
  );
  const lastPage = Number(meta?.last_page ?? 1);
  const perPage = Number(meta?.per_page ?? 20);

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

  /*
   * Helpers
   */
  function formatStatus(value: unknown) {
    const currentStatus = String(
      value ?? "",
    ).toLowerCase();

    if (!currentStatus) return "—";

    return currentStatus
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );
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

    if (/^\d{2}:\d{2}/.test(valueString)) {
      const [hoursString, minutesString] =
        valueString.split(":");

      const hours = Number(hoursString);
      const minutes = Number(minutesString);

      if (
        !Number.isNaN(hours) &&
        !Number.isNaN(minutes)
      ) {
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

  /*
   * Reset date filters to the default one-year range.
   */
  function resetDateFilters() {
    const defaults = getDefaultDateRange();

    setDateFrom(defaults.date_from);
    setDateTo(defaults.date_to);
    setSort("desc");
    setPage(1);
  }

  /*
   * Render
   */
  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-5">
        {/* Header */}
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

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 text-xs text-destructive">
            {error.message}
          </div>
        )}

        {/* Table */}
        <section className="overflow-hidden rounded-lg bg-card shadow-sm">
          {/* Table header and filters */}
          <div className="border-b border-border/60">
            <div className="flex flex-col gap-3 px-5 py-4">
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

{/* Compact filter row - no wrapping */}
<div className="w-full min-w-0 overflow-x-auto">
  <div className="flex w-max min-w-full flex-nowrap items-end gap-3 pb-2">

    {/* Search Appointment */}
    <div className="flex w-[200px] shrink-0 flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        Search Appointment
      </label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />

        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search appointment..."
          className="h-9 w-full border-border bg-muted/50 pl-9 pr-9 text-xs focus:bg-card"
        />

        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setSearch("");
              setPage(1);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>

    {/* Select Doctor */}
    <div className="flex w-[190px] shrink-0 flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        Select Doctor
      </label>

      <select
        value={doctorId}
        onChange={(event) => {
          setDoctorId(event.target.value);
          setPage(1);
        }}
        disabled={doctorsLoading}
        className="h-9 w-full rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
      >
        <option value="">
          {doctorsLoading ? "Loading doctors..." : "All doctors"}
        </option>

        {doctors.map((doctor) => (
          <option key={doctor.id} value={String(doctor.id)}>
            {getDoctorDisplayName(doctor)}
            {getDoctorCode(doctor)
              ? ` — ${getDoctorCode(doctor)}`
              : ""}
          </option>
        ))}
      </select>
    </div>

    {/* Status */}
    <div className="flex w-[135px] shrink-0 flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        Status
      </label>

      <select
        value={status}
        onChange={(event) => {
          setStatus(event.target.value);
          setPage(1);
        }}
        className="h-9 w-full rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
      >
        <option value="">All statuses</option>
        <option value="scheduled">Scheduled</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="no_show">No-show</option>
        <option value="unresolved">Unresolved</option>
      </select>
    </div>

    {/* Consultation Type */}
    <div className="flex w-[110px] shrink-0 flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        Select Type
      </label>

      <select
        value={consultType}
        onChange={(event) => {
          setConsultType(event.target.value);
          setPage(1);
        }}
        className="h-9 w-full rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
      >
        <option value="">All types</option>
        <option value="offline">Clinic</option>
        <option value="online">Video</option>
      </select>
    </div>

    {/* Date Range and Sort */}
    <div className="shrink-0">
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        sort={sort}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setPage(1);
        }}
        onDateToChange={(value) => {
          setDateTo(value);
          setPage(1);
        }}
        onSortChange={(value) => {
          setSort(value);
          setPage(1);
        }}
        onReset={resetDateFilters}
      />
    </div>

  </div>
</div>
            </div>
          </div>

          {/* Data table */}
          <div className="mt-5 overflow-x-auto px-5">
            <DataTable
              columns={[
                {
                  header: "Appointment",
                  key: "appointment",
                  render: (_, row) => (
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {row?.appointment_code ??
                          row?.id ??
                          "—"}
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
                        {formatTime(
                          getAppointmentTime(row),
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground/80">
                        {formatDate(
                          getAppointmentDate(row),
                        )}
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

                      {row?.patient?.guardian_name &&
                        row?.patient?.guardian_type && (
                          <p className="max-w-[180px] truncate text-xs font-normal text-muted-foreground/80">
                            {row.patient.guardian_type}{" "}
                            {row.patient.guardian_name}
                          </p>
                        )}

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
                      String(
                        row?.consult_type ?? "",
                      ).toLowerCase() === "online";

                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${online
                          ? "bg-chart-4/10 text-chart-4"
                          : "bg-warning-soft text-warning"
                          }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${online
                            ? "bg-chart-4"
                            : "bg-warning"
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

                    const statusStyles: Record<
                      string,
                      string
                    > = {
                      scheduled:
                        "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
                      in_progress:
                        "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
                      completed:
                        "bg-green-100 text-green-700 ring-1 ring-green-200",
                      cancelled:
                        "bg-red-100 text-red-700 ring-1 ring-red-200",
                      no_show:
                        "bg-purple-100 text-purple-700 ring-1 ring-purple-200",
                      unresolved:
                        "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200",
                    };

                    const dotStyles: Record<
                      string,
                      string
                    > = {
                      scheduled: "bg-blue-500",
                      in_progress: "bg-orange-500",
                      completed: "bg-green-500",
                      cancelled: "bg-red-500",
                      no_show: "bg-purple-500",
                      unresolved: "bg-yellow-500",
                    };

                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[currentStatus] ??
                          "bg-muted text-muted-foreground"
                          }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${dotStyles[currentStatus] ??
                            "bg-muted-foreground"
                            }`}
                        />

                        {formatStatus(currentStatus)}
                      </span>
                    );
                  },
                },

                {
                  header: "Amount",
                  key: "amount",
                  render: (_, row) => {
                    const paymentStatus = String(
                      row?.payment_status ?? "",
                    ).toLowerCase();

                    const paymentTextStyles: Record<
                      string,
                      string
                    > = {
                      paid: "text-green-600",
                      unpaid: "text-red-600",
                      pending: "text-yellow-600",
                    };

                    return (
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {formatAmount(
                            row?.amount ??
                            row?.consultation_fee ??
                            row?.total_amount,
                          )}
                        </p>

                        {paymentStatus && (
                          <p
                            className={`mt-0.5 text-[10px] font-medium ${paymentTextStyles[
                              paymentStatus
                            ] ??
                              "text-muted-foreground"
                              }`}
                          >
                            {paymentStatus
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (char) =>
                                char.toUpperCase(),
                              )}
                          </p>
                        )}
                      </div>
                    );
                  },
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
              onRowClick={(row) => {
                router.push(
                  `/appointments/${row.id}`,
                );
              }}
            />
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 border-t border-border/60 py-12">
              <RefreshCw className="size-4 animate-spin text-primary" />

              <span className="text-xs text-muted-foreground">
                Loading appointments...
              </span>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && rows.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground/80">
                Showing{" "}
                <span className="font-medium text-muted-foreground">
                  {startRecord}
                </span>{" "}
                –{" "}
                <span className="font-medium text-muted-foreground">
                  {endRecord}
                </span>{" "}
                of{" "}
                <span className="font-medium text-muted-foreground">
                  {total}
                </span>
              </p>

              <Pagination
                currentPage={currentPage}
                totalPages={lastPage}
                disabled={isLoading || isFetching}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                }}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}