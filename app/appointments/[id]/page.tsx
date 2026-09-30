"use client";

import { useParams, useRouter } from "next/navigation";
import { getAppointment } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  RefreshCw,
  UserRound,
  Stethoscope,
  Activity,
  IndianRupee,
  Hash,
  Mail,
  Phone,
  ClipboardList,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/formatters";

/* ================================================================
   HELPERS
================================================================ */

function formatStatus(value: unknown) {
  const status = String(value ?? "").toLowerCase();

  if (!status) return "—";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusType(value: unknown) {
  const status = String(value ?? "").toLowerCase();

  if (status === "completed" || status === "paid") {
    return "success";
  }

  if (
    status === "cancelled" ||
    status === "no_show" ||
    status === "failed"
  ) {
    return "failed";
  }

  if (status === "unresolved") {
    return "warning";
  }

  return "active";
}

function formatMoney(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `₹${String(value)}`;
  }

  return `₹${amount.toLocaleString("en-IN")}`;
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "A"
  );
}

/* ================================================================
   SMALL DETAIL ITEM
================================================================ */

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-2">
        {/* {icon} */}
        {label}
      </div>

      <div className="mt-1 text-xs font-medium text-foreground">
        {value ?? "—"}
      </div>
    </div>
  );
}

/* ================================================================
   SECTION CARD
================================================================ */

function SectionCard({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg bg-card shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
        {icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}

        <h2 className="text-sm font-semibold text-foreground">
          {title}
        </h2>
      </div>

      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

/* ================================================================
   PAGE
================================================================ */

export default function AppointmentDetail() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useAdminQuery(
    () => getAppointment(id),
    ["admin", "appointment", id],
    Boolean(id),
  );

  const payload: any = data ?? {};

  /*
   * Supports:
   *
   * {
   *   success: true,
   *   data: {
   *      appointment: {}
   *   }
   * }
   *
   * and:
   *
   * {
   *   appointment: {}
   * }
   */

  const apiData =
    payload?.data?.appointment
      ? payload.data
      : payload;

  const appointment: any =
    apiData?.appointment ??
    payload?.appointment ??
    {};

  const patient: any =
    appointment?.patient ?? {};

  const doctor: any =
    appointment?.doctor ?? {};

  const vitals: any =
    appointment?.vitals ?? {};

  const prescription: any =
    appointment?.prescription ?? {};

  const appointmentStatus = String(
    appointment?.status ?? "",
  ).toLowerCase();

  const paymentStatus = String(
    appointment?.payment_status ?? "",
  ).toLowerCase();

  const consultType = String(
    appointment?.consult_type ?? "",
  ).toLowerCase();

  const patientName =
    patient?.name ??
    patient?.full_name ??
    appointment?.patient_name ??
    "Patient";

  const doctorName =
    doctor?.name ??
    doctor?.full_name ??
    appointment?.doctor_name ??
    "Doctor";

  /* ================================================================
     LOADING
  ================================================================= */

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="w-full">

          <div className="h-4 w-20 animate-pulse rounded bg-border" />

          <div className="mt-5 h-8 w-80 animate-pulse rounded bg-border" />

          <div className="mt-6 h-32 animate-pulse rounded-xl bg-card" />

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="h-60 animate-pulse rounded-xl bg-card" />
            <div className="h-60 animate-pulse rounded-xl bg-card" />
            <div className="h-60 animate-pulse rounded-xl bg-card" />
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     ERROR
  ================================================================= */

  if (error) {
    return (
      <div className="w-full">
        <div className="w-full">

         <div className="">
  <button
    type="button"
    onClick={() => router.back()}
    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
  >
    <ArrowLeft className="size-4" />
    Back to Appointments
  </button>
</div>

          <div className="mt-5 rounded-xl border border-destructive/25 bg-destructive-soft px-5 py-4 text-xs text-destructive">
            {error.message}
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     PAGE
  ================================================================= */

  return (
    <div className="w-full">

      <div className="flex w-full flex-col gap-5">

        {/* ==========================================================
            TOP HEADER
        =========================================================== */}

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>

            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground/80">
              <button
                onClick={() => router.back()}
                className="transition hover:text-primary"
              >
                Appointments
              </button>

              <span>/</span>

              <span className="text-muted-foreground">
                {appointment?.appointment_code ?? id}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">

              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Appointment Detail
              </h1>

              <StatusBadge
                status={getStatusType(
                  appointmentStatus,
                )}
              >
                {formatStatus(
                  appointmentStatus,
                )}
              </StatusBadge>

            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">

              <span className="font-mono">
                {appointment?.appointment_code ??
                  id}
              </span>

              {appointment?.token_number && (
                <>
                  <span>·</span>
                  <span>
                    Token {appointment.token_number}
                  </span>
                </>
              )}

              {appointment?.created_at && (
                <>
                  <span>·</span>
                  <span>
                    Created{" "}
                    {formatDate(
                      appointment.created_at,
                    )}
                  </span>
                </>
              )}

            </div>
          </div>

          <button
  type="button"
  onClick={() => router.back()}
  className="cursor-pointer  inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
>
  <ArrowLeft className="size-4" />
  Back to Appointments
</button>
        </div>

        {/* ==========================================================
            MAIN GRID
        =========================================================== */}

        <div className="grid gap-5">

          {/* ========================================================
              MAIN CONTENT
          ========================================================= */}

          <div className="flex flex-col gap-5">

            {/* PATIENT + DOCTOR */}

            <div className="grid gap-4 lg:grid-cols-2">

              {/* PATIENT */}

              <SectionCard
                title="Patient Information"
                icon={
                  <UserRound className="size-4" />
                }
              >

                <div className="mb-5 flex items-center gap-3 rounded-lg bg-muted/50 p-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(patientName)}
                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-sm font-semibold text-foreground">
                      {patientName}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                      {patient?.code ??
                        appointment?.patient_code ??
                        "Patient ID unavailable"}
                    </p>

                  </div>

                </div>

                <div className="grid grid-cols-2 gap-x-5 gap-y-5">

                  <DetailItem
                    label="Patient ID"
                    value={
                      patient?.code ??
                      appointment?.patient_code ??
                      "—"
                    }
                    icon={
                      <Hash className="size-4" />
                    }
                  />

                  <DetailItem
                    label="Mobile"
                    value={
                      patient?.mobile ??
                      "—"
                    }
                    icon={
                      <Phone className="size-4" />
                    }
                  />

                  <DetailItem
                    label="Email"
                    value={
                      patient?.email ??
                      "—"
                    }
                    icon={
                      <Mail className="size-4" />
                    }
                  />

                  <DetailItem
                    label="Appointment Token"
                    value={
                      appointment?.token_number ??
                      "—"
                    }
                  />

                </div>
              </SectionCard>

              {/* DOCTOR */}

              <SectionCard
                title="Doctor Information"
                icon={
                  <Stethoscope className="size-4" />
                }
              >

                <div className="mb-5 flex items-center gap-3 rounded-lg bg-muted/50 p-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(doctorName)}
                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-sm font-semibold text-foreground">
                      {doctorName}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                      {doctor?.code ??
                        appointment?.doctor_code ??
                        "Doctor ID unavailable"}
                    </p>

                  </div>

                </div>

                <div className="grid grid-cols-2 gap-x-5 gap-y-5">

                  <DetailItem
                    label="Doctor ID"
                    value={
                      doctor?.code ??
                      appointment?.doctor_code ??
                      "—"
                    }
                  />

                  <DetailItem
                    label="Mobile"
                    value={
                      doctor?.mobile ??
                      "—"
                    }
                    icon={
                      <Phone className="size-4" />
                    }
                  />

                  <DetailItem
                    label="Email"
                    value={
                      doctor?.email ??
                      "—"
                    }
                    icon={
                      <Mail className="size-4" />
                    }
                  />

                  <DetailItem
                    label="Consultation Type"
                    value={
                      consultType ===
                      "online"
                        ? "Video Consultation"
                        : "Clinic Consultation"
                    }
                  />

                </div>
              </SectionCard>
            </div>

            {/* APPOINTMENT INFORMATION */}

            <SectionCard
              title="Appointment Information"
              icon={
                <Calendar className="size-4" />
              }
            >

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                <DetailItem
                  label="Appointment ID"
                  value={
                    appointment?.appointment_code ??
                    id
                  }
                />

                <DetailItem
                  label="Token Number"
                  value={
                    appointment?.token_number ??
                    "—"
                  }
                />

                <DetailItem
                  label="Date"
                  value={formatDate(
                    appointment?.start_at,
                  )}
                />

                <DetailItem
                  label="Time"
                  value={
                    <span className="text-primary">
                      {formatTime(
                        appointment?.start_at,
                      )}{" "}
                      –{" "}
                      {formatTime(
                        appointment?.end_at,
                      )}
                    </span>
                  }
                  icon={
                    <Clock className="size-4" />
                  }
                />

                <DetailItem
                  label="Consultation Type"
                  value={
                    consultType ===
                    "online"
                      ? "Video"
                      : "Clinic"
                  }
                />

                <DetailItem
                  label="Status"
                  value={
                    <StatusBadge
                      status={getStatusType(
                        appointmentStatus,
                      )}
                    >
                      {formatStatus(
                        appointmentStatus,
                      )}
                    </StatusBadge>
                  }
                />

                <DetailItem
                  label="Created At"
                  value={
                    appointment?.created_at
                      ? `${formatDate(
                          appointment.created_at,
                        )}, ${formatTime(
                          appointment.created_at,
                        )}`
                      : "—"
                  }
                />

                <DetailItem
                  label="Amount"
                  value={
                    <span className="text-sm font-semibold">
                      {formatMoney(
                        appointment?.amount,
                      )}
                    </span>
                  }
                  icon={
                    <IndianRupee className="size-4" />
                  }
                />

              </div>
            </SectionCard>

            {/* PAYMENT */}

            <SectionCard
              title="Payment Information"
              icon={
                <CreditCard className="size-4" />
              }
            >

              <div className="grid gap-5 sm:grid-cols-3">

                <DetailItem
                  label="Amount"
                  value={
                    <span className="text-base font-semibold text-foreground">
                      {formatMoney(
                        appointment?.amount,
                      )}
                    </span>
                  }
                />

                <DetailItem
                  label="Payment Mode"
                  value={
                    formatStatus(
                      appointment?.payment_mode,
                    )
                  }
                />

                <DetailItem
                  label="Payment Status"
                  value={
                    <StatusBadge
                      status={getStatusType(
                        paymentStatus,
                      )}
                    >
                      {formatStatus(
                        paymentStatus,
                      )}
                    </StatusBadge>
                  }
                />

              </div>
            </SectionCard>

            {/* VITALS */}

            {/* <SectionCard
              title="Vitals"
              icon={
                <Activity className="size-4" />
              }
            >

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">

                <Vital
                  label="Weight"
                  value={
                    vitals?.weight_kg != null
                      ? `${vitals.weight_kg} kg`
                      : "—"
                  }
                />

                <Vital
                  label="Height"
                  value={
                    vitals?.height_cm != null
                      ? `${vitals.height_cm} cm`
                      : "—"
                  }
                />

                <Vital
                  label="BMI"
                  value={
                    vitals?.bmi ??
                    "—"
                  }
                />

                <Vital
                  label="Blood Pressure"
                  value={
                    vitals?.bp_mm_hg ??
                    (
                      vitals?.bp_systolic !=
                        null &&
                      vitals?.bp_diastolic !=
                        null
                    )
                      ? `${vitals.bp_systolic}/${vitals.bp_diastolic}`
                      : "—"
                  }
                />

                <Vital
                  label="Pulse"
                  value={
                    vitals?.pulse_bpm != null
                      ? `${vitals.pulse_bpm} bpm`
                      : "—"
                  }
                />

                <Vital
                  label="Temperature"
                  value={
                    vitals?.temperature_f != null
                      ? `${vitals.temperature_f} °F`
                      : "—"
                  }
                />

                <Vital
                  label="SpO₂"
                  value={
                    vitals?.spo2 != null
                      ? `${vitals.spo2}%`
                      : "—"
                  }
                />

                <Vital
                  label="Respiratory Rate"
                  value={
                    vitals?.respiratory_rate !=
                    null
                      ? `${vitals.respiratory_rate} /min`
                      : "—"
                  }
                />

                <Vital
                  label="BSA"
                  value={
                    vitals?.bsa ??
                    "—"
                  }
                />

              </div>

              {vitals?.vitals_recorded_at && (
                <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground/80">
                  Recorded{" "}
                  {formatDate(
                    vitals.vitals_recorded_at,
                  )}{" "}
                  at{" "}
                  {formatTime(
                    vitals.vitals_recorded_at,
                  )}
                </p>
              )}

            </SectionCard> */}

            {/* PRESCRIPTION */}

            {/* <SectionCard
              title="Prescription"
              icon={
                <FileText className="size-4" />
              }
            >

              {prescription?.exists ? (
                <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ClipboardList className="size-5" />
                    </div>

                    <div>

                      <p className="text-sm font-semibold text-foreground">
                        Prescription available
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground/80">
                        A prescription has been created
                        for this appointment.
                      </p>

                    </div>

                  </div>

                  <StatusBadge
                    status={getStatusType(
                      prescription.status,
                    )}
                  >
                    {formatStatus(
                      prescription.status,
                    )}
                  </StatusBadge>

                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/50 px-4 py-8 text-center">

                  <FileText className="mx-auto size-6 text-muted-foreground/50" />

                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    No prescription found
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground/80">
                    No prescription has been created
                    for this appointment.
                  </p>

                </div>
              )}

            </SectionCard> */}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   VITAL
================================================================ */

function Vital({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/50 px-3 py-3">

      <p className="text-xs font-medium text-muted-foreground/80">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold text-foreground/80">
        {value}
      </p>

    </div>
  );
}