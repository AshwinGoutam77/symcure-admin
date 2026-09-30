"use client";

import { useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  Wallet,
  IndianRupee,
  Percent,
  Clock3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { getDoctors, getEarnings } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import {
  formatCompactMoney, formatDate, formatLabel, formatMoney, formatPercent, formatShortDate, formatTime, toNumber,
} from "@/lib/formatters";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { ChartCard, TrendAreaChart, BarCompareChart, DonutChart } from "@/components/charts";

/** Ledger amounts keep paise precision */
const money = (value: number | string | null | undefined) => formatMoney(value, { decimals: true });

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Doctor = {
  id: number;
  display_name?: string;
  doctor_code?: string;

  // fallback fields in case doctors API uses these
  name?: string;
  code?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
};

type Patient = {
  id?: number;
  account_code?: string;
  full_name?: string;
  deleted_at?: string | null;
  age?: number | null;
  city_name?: string | null;
  state_name?: string | null;
  patient_deleted_at?: string | null;
};

type Appointment = {
  id?: number;
  appointment_code?: string;
  consult_type?: string;
  payment_mode?: string;
  start_at?: string;
  end_at?: string;
  token_number?: string;
  created_at?: string;
  patient_account_id?: number;
  slot_text?: string;
  consultation_date?: string;
  created_date?: string;
  patient?: Patient;
};

type LedgerRow = {
  id: number;
  doctor_id: number;
  appointment_id?: number;

  doctor?: {
    id?: number;
    display_name?: string;
    doctor_code?: string;
  };

  gross_amount?: number | string;
  commission_amount?: number | string;
  net_amount?: number | string;

  occurred_at?: string;
  notes?: string | null;
  ledger_type?: string;
  status?: string;

  appointment?: Appointment;
};

type Summary = {
  total_net?: number | string;
  total_gross?: number | string;
  total_commission?: number | string;

  cash_earnings?: number | string;
  online_earnings?: number | string;
  other_earnings?: number | string;

  refunded_total?: number | string;
  pending_to_collect?: number | string;
};

type LedgerPagination = {
  current_page?: number;
  from?: number | null;
  last_page?: number;
  per_page?: number;
  to?: number | null;
  total?: number;

  next_page_url?: string | null;
  prev_page_url?: string | null;
};

type EarningsResponse = {
  success?: boolean;
  ledger?: LedgerPagination & {
    data?: LedgerRow[];
  };

  summary?: Summary;

  data?: {
    doctor?: {
      id?: number;
      display_name?: string;
      doctor_code?: string;
    } | null;
  };
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);

  startDate.setFullYear(startDate.getFullYear() - 1);

  return {
    start: toDateInputValue(startDate),
    end: toDateInputValue(endDate),
  };
}

function getDoctorName(doctor: Doctor) {
  return (
    doctor.display_name ||
    doctor.name ||
    doctor.full_name ||
    `${doctor.first_name ?? ""} ${doctor.last_name ?? ""
      }`.trim() ||
    `Doctor #${doctor.id}`
  );
}

function getDoctorCode(doctor: Doctor) {
  return (
    doctor.doctor_code ||
    doctor.code ||
    ""
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function FinancePage() {
  /* ---------------------------------------------------------------------- */
  /* Filters                                                                */
  /* ---------------------------------------------------------------------- */

  const defaultDateRange = getDefaultDateRange();

  const [doctorId, setDoctorId] =
    useState("");

  const [start, setStart] =
    useState(defaultDateRange.start);

  const [end, setEnd] =
    useState(defaultDateRange.end);

  const [status, setStatus] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [paymentTab, setPaymentTab] =
    useState<"all" | "online" | "offline">(
      "all",
    );

  const [page, setPage] =
    useState(1);

  const limit = 20;

  /* ---------------------------------------------------------------------- */
  /* Doctors                                                                */
  /* ---------------------------------------------------------------------- */

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
      "finance",
      "doctors",
      {
        page: 1,
        limit: 100,
      },
    ],
  );

  const doctors = useMemo<Doctor[]>(() => {
    const payload: any =
      doctorsData ?? {};

    const rows =
      payload.data?.data ??
      payload.data ??
      payload.doctors ??
      [];

    return Array.isArray(rows)
      ? rows
      : [];
  }, [doctorsData]);

  /* ---------------------------------------------------------------------- */
  /* Earnings                                                               */
  /* ---------------------------------------------------------------------- */

  /*
   * IMPORTANT:
   *
   * No doctor/date is required anymore.
   *
   * Initial request:
   *
   * /admin/earnings?page=1&limit=50
   *
   * If filters are selected they are added automatically.
   */

  const earningsParams = useMemo(() => {
    const params: Record<
      string,
      string | number
    > = {
      page,
      limit,
    };

    if (doctorId) {
      params.doctor_id =
        doctorId;
    }

    params.start = start;
    params.end = end;

    if (status) {
      params.status = status;
    }

    return params;
  }, [
    doctorId,
    start,
    end,
    status,
    page,
  ]);

  const {
    data: earningsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAdminQuery(
    () =>
      getEarnings(
        earningsParams,
      ),
    [
      "admin",
      "earnings",
      earningsParams,
    ],
  );

  const payload =
    earningsData as EarningsResponse | undefined;

  const summary =
    payload?.summary ?? {};

  const ledger =
    payload?.ledger;

  const rows =
    ledger?.data ?? [];

  const currentPage =
    ledger?.current_page ?? page;

  const lastPage =
    ledger?.last_page ?? 1;

  const total =
    ledger?.total ?? rows.length;

  const from =
    ledger?.from ?? 0;

  const to =
    ledger?.to ?? rows.length;

  /* ---------------------------------------------------------------------- */
  /* Search + Payment filter                                                */
  /* ---------------------------------------------------------------------- */

  const filteredRows = useMemo(() => {
    let result = [...rows];

    /* Search */
    if (search.trim()) {
      const query =
        search
          .trim()
          .toLowerCase();

      result = result.filter(
        (row) => {
          const appointmentCode =
            row.appointment
              ?.appointment_code ??
            "";

          const patientName =
            row.appointment
              ?.patient
              ?.full_name ??
            "";

          const patientCode =
            row.appointment
              ?.patient
              ?.account_code ??
            "";

          const appointmentId =
            String(
              row.appointment_id ??
              "",
            );

          const doctorName =
            row.doctor?.display_name ?? "";

          const doctorCode =
            row.doctor?.doctor_code ?? "";

          return [
            appointmentCode,
            patientName,
            patientCode,
            appointmentId,
            doctorName,
            doctorCode,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        },
      );
    }

    /* Payment type */
    if (paymentTab === "online") {
      result = result.filter(
        (row) => {
          const mode =
            row.appointment
              ?.payment_mode
              ?.toLowerCase();

          return (
            mode === "online" ||
            mode === "razorpay"
          );
        },
      );
    }

    if (paymentTab === "offline") {
      result = result.filter(
        (row) => {
          const mode =
            row.appointment
              ?.payment_mode
              ?.toLowerCase();

          return (
            mode === "cash" ||
            mode === "offline"
          );
        },
      );
    }

    return result;
  }, [
    rows,
    search,
    paymentTab,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Chart data — derived only from the API summary + loaded ledger rows     */
  /* ---------------------------------------------------------------------- */

  const grossN = toNumber(summary.total_gross);
  const commissionRate = grossN > 0 ? (toNumber(summary.total_commission) / grossN) * 100 : 0;

  const modeData = [
    { name: "Cash", value: toNumber(summary.cash_earnings), color: "var(--chart-3)" },
    { name: "Online", value: toNumber(summary.online_earnings), color: "var(--chart-1)" },
    { name: "Other", value: toNumber(summary.other_earnings), color: "var(--chart-4)" },
  ];
  const modeTotal = modeData.reduce((sum, d) => sum + d.value, 0);

  const trend = useMemo(() => {
    const byDay = new Map<string, { day: string; gross: number; commission: number; net: number }>();
    rows.forEach((row) => {
      const day = String(row.occurred_at ?? "").slice(0, 10);
      if (!day) return;
      const cur = byDay.get(day) ?? { day, gross: 0, commission: 0, net: 0 };
      cur.gross += toNumber(row.gross_amount);
      cur.commission += toNumber(row.commission_amount);
      cur.net += toNumber(row.net_amount);
      byDay.set(day, cur);
    });
    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [rows]);

  const topDoctors = useMemo(() => {
    const byDoctor = new Map<string, { name: string; net: number }>();
    rows.forEach((row) => {
      const name = row.doctor?.display_name || `Doctor #${row.doctor_id}`;
      const cur = byDoctor.get(name) ?? { name, net: 0 };
      cur.net += toNumber(row.net_amount);
      byDoctor.set(name, cur);
    });
    return [...byDoctor.values()].sort((a, b) => b.net - a.net).slice(0, 6);
  }, [rows]);

  /* ---------------------------------------------------------------------- */
  /* Selected doctor                                                        */
  /* ---------------------------------------------------------------------- */

  const selectedDoctor =
    doctors.find(
      (doctor) =>
        String(doctor.id) ===
        String(doctorId),
    );

  /* ---------------------------------------------------------------------- */
  /* Filter                                                                */
  /* ---------------------------------------------------------------------- */

  const dateRangeError =
    !start || !end
      ? "From and To dates are required."
      : start > end
        ? "The From date cannot be after the To date."
        : "";

  const handleFilter = () => {
    if (dateRangeError) {
      return;
    }

    setPage(1);
  };

  const handleClearFilters = () => {
    const defaultRange = getDefaultDateRange();

    setDoctorId("");
    setStart(defaultRange.start);
    setEnd(defaultRange.end);
    setStatus("");
    setSearch("");
    setPaymentTab("all");
    setPage(1);
  };

  /* ---------------------------------------------------------------------- */
  /* Pagination                                                             */
  /* ---------------------------------------------------------------------- */

  const goToPage = (
    nextPage: number,
  ) => {
    if (
      nextPage < 1 ||
      nextPage > lastPage ||
      nextPage === currentPage
    ) {
      return;
    }

    setPage(nextPage);
  };

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="w-full">
      <div className="space-y-5">

        {/* ================================================================ */}
        {/* Page Header                                                       */}
        {/* ================================================================ */}

        <PageHeader
          breadcrumbs={[{ label: "Business" }, { label: "Finance" }]}
          title="Finance & payment ledger"
          description="Consultation earnings, payments and doctor commissions for the selected date range."
          className="mb-0"
        />

        {/* ================================================================ */}
        {/* Payment Tabs                                                      */}
        {/* ================================================================ */}

        <div className="border-b border-border mt-8">
          <div className="flex items-center gap-6">

            <button
              type="button"
              onClick={() =>
                setPaymentTab("all")
              }
              className={[
                "relative px-2 pb-3 text-xs font-semibold",
                paymentTab === "all"
                  ? "text-primary"
                  : "text-muted-foreground/80 hover:text-muted-foreground",
              ].join(" ")}
            >
              All Payments

              {paymentTab === "all" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                setPaymentTab("online")
              }
              className={[
                "relative px-2 pb-3 text-xs font-semibold",
                paymentTab === "online"
                  ? "text-primary"
                  : "text-muted-foreground/80 hover:text-muted-foreground",
              ].join(" ")}
            >
              Online Payments

              {paymentTab === "online" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                setPaymentTab("offline")
              }
              className={[
                "relative px-2 pb-3 text-xs font-semibold",
                paymentTab === "offline"
                  ? "text-primary"
                  : "text-muted-foreground/80 hover:text-muted-foreground",
              ].join(" ")}
            >
              Offline (Cash)

              {paymentTab === "offline" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>

          </div>
        </div>

        {/* ================================================================ */}
        {/* Filters                                                           */}
        {/* ================================================================ */}

        <div className="rounded-lg bg-card p-4 shadow-sm">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto]">

            {/* Doctor */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Doctor
              </label>

              <select
                value={doctorId}
                onChange={(event) => {
                  setDoctorId(
                    event.target.value,
                  );
                  setPage(1);
                }}
                disabled={
                  doctorsLoading
                }
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground/80 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="">
                  All Doctors
                </option>

                {doctors.map(
                  (doctor) => (
                    <option
                      key={doctor.id}
                      value={String(
                        doctor.id,
                      )}
                    >
                      {getDoctorName(
                        doctor,
                      )}
                      {getDoctorCode(
                        doctor,
                      )
                        ? ` — ${getDoctorCode(
                          doctor,
                        )}`
                        : ""}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* From */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                From
              </label>

              <Input
                type="date"
                value={start}
                max={end || undefined}
                required
                onChange={(event) => {
                  setStart(event.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-lg border-border text-xs shadow-none"
              />
            </div>

            {/* To */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                To
              </label>

              <Input
                type="date"
                value={end}
                min={start || undefined}
                required
                onChange={(event) => {
                  setEnd(event.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-lg border-border text-xs shadow-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Status
              </label>

              <select
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value,
                  );
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground/80 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="">
                  All Statuses
                </option>

                <option value="paid">
                  Paid
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="refunded">
                  Refunded
                </option>
              </select>
            </div>

            {/* Filter */}
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleFilter}
                disabled={Boolean(dateRangeError)}
                className="h-9 w-full rounded-lg bg-primary px-4 text-xs font-semibold hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Filter
              </Button>
            </div>

            {/* Clear */}
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={
                  handleClearFilters
                }
                className="h-9 w-full rounded-lg border-border bg-card px-4 text-xs font-semibold text-muted-foreground shadow-none hover:bg-muted/50 sm:w-auto"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* Error                                                             */}
        {/* ================================================================ */}

        {error && (
          <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3">
            <p className="text-xs font-semibold text-destructive">
              Unable to load earnings
            </p>

            <p className="mt-1 text-xs text-destructive">
              {error instanceof Error
                ? error.message
                : "Something went wrong while loading the earnings ledger."}
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* Payment Breakdown                                                 */}
        {/* ================================================================ */}

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Gross billed" value={money(summary.total_gross)} description="Before commission" icon={<IndianRupee />} tone="primary" loading={isLoading} />
          <StatCard title="Platform commission" value={money(summary.total_commission)} description={grossN > 0 ? `${formatPercent(commissionRate, 1)} of gross` : "Platform share"} icon={<Percent />} tone="violet" loading={isLoading} />
          <StatCard title="Doctor net earnings" value={money(summary.total_net)} description="After commission" icon={<Wallet />} tone="success" loading={isLoading} />
          <StatCard title="Pending to collect" value={money(summary.pending_to_collect)} description={`Refunded: ${money(summary.refunded_total)}`} icon={<Clock3 />} tone="warning" loading={isLoading} />
        </div>

        {/* ================================================================ */}
        {/* Ledger                                                            */}
        {/* ================================================================ */}

        <div className="overflow-hidden rounded-lg bg-card shadow-sm">

          {/* Header */}
          <div className="flex flex-col gap-4 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  Payment Ledger
                </h2>

                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {total}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground/80">
                Consultation earnings and payment records
              </p>
            </div>

            <div className="relative w-full lg:w-[280px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search appointment or patient..."
                className="h-9 rounded-lg border-border pl-9 text-xs shadow-none"
              />
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="px-4 py-16 text-center">
              <RefreshCw className="mx-auto size-5 animate-spin text-primary" />

              <p className="mt-3 text-xs font-medium text-muted-foreground">
                Loading payment ledger...
              </p>
            </div>
          )}

          {/* Empty */}
          {!isLoading &&
            filteredRows.length === 0 && (
              <div className="px-4 py-16 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Wallet className="size-4 text-muted-foreground/80" />
                </div>

                <p className="mt-3 text-sm font-semibold text-foreground/80">
                  No payment records found
                </p>

                <p className="mt-1 text-xs text-muted-foreground/80">
                  Try changing the filters or search.
                </p>
              </div>
            )}

          {/* Table */}
          {!isLoading &&
            filteredRows.length > 0 && (
              <div className="overflow-x-auto px-5 mt-5">
                <DataTable
                  columns={[
                    {
                      header: "Doctor",
                      key: "doctor",
                      render: (_, row) => (
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {row.doctor?.display_name ?? `Doctor #${row.doctor_id}`}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {row.doctor?.doctor_code ?? `ID: ${row.doctor_id}`}
                          </p>
                        </div>
                      ),
                    },
                    {
                      header: "Appointment",
                      key: "appointment",
                      render: (_, row) => (
                        <div>
                          <p className="font-mono text-xs font-semibold text-foreground/80">
                            {row.appointment?.appointment_code ?? `APT-${row.appointment_id ?? "—"}`}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                              {row.appointment?.token_number ?? "No token"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/80">
                              ID {row.appointment_id ?? "—"}
                            </span>
                          </div>
                        </div>
                      ),
                    },
                    {
                      header: "Patient",
                      key: "patient",
                      render: (_, row) => (
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground/80">
                            {row.appointment?.patient?.full_name ?? "—"}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">
                            {row.appointment?.patient?.account_code ?? "—"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      header: "Date & Time",
                      key: "date",
                      render: (_, row) => (
                        <div>
                          <p className="text-xs font-semibold text-foreground/80">
                            {formatDate(row.appointment?.consultation_date ?? row.appointment?.start_at ?? row.occurred_at)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                            {formatTime(row.appointment?.start_at ?? row.occurred_at)}
                          </p>
                        </div>
                      ),
                    },
                    {
                      header: "Consultation",
                      key: "consultation",
                      render: (_, row) => (
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                          {formatLabel(row.appointment?.consult_type)}
                        </span>
                      ),
                    },
                    {
                      header: "Payment",
                      key: "payment",
                      render: (_, row) => (
                        <div>
                          <p className="text-xs font-semibold text-foreground/80">
                            {formatLabel(row.appointment?.payment_mode)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                            {formatLabel(row.ledger_type)}
                          </p>
                        </div>
                      ),
                    },
                    {
                      header: "Amount",
                      key: "amount",
                      render: (_, row) => (
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {money(row.gross_amount)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                            Net <span className="font-semibold text-success">{money(row.net_amount)}</span>
                            {" · "}Comm {money(row.commission_amount)}
                          </p>
                        </div>
                      ),
                    },
                    {
                      header: "Status",
                      key: "status",
                      render: (_, row) => <StatusBadge status={row.status} />,
                    },
                  ]}
                  data={filteredRows}
                />
              </div>
            )}

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground/80">
              {total > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-muted-foreground">{from}</span>
                  {" – "}
                  <span className="font-medium text-muted-foreground">{to}</span>
                  {" of "}
                  <span className="font-medium text-muted-foreground">{total}</span>
                </>
              ) : "No payments"}
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isFetching}
                onClick={() => goToPage(currentPage - 1)}
                className="h-8 px-2.5 text-xs"
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>

              <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-foreground px-2 text-xs font-semibold text-white">
                {currentPage}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= lastPage || isFetching}
                onClick={() => goToPage(currentPage + 1)}
                className="h-8 px-2.5 text-xs"
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}