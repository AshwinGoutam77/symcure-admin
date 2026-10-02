"use client";

import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";

import { getPatient } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatLabel, getInitials } from "@/lib/formatters";

type Patient = {
  [x: string]: unknown;
  id?: number;
  account_code?: string;
  full_name?: string;
  relationship?: string;
  guardian_type?: string;
  guardian_name?: string;
  mobile?: string;
  email?: string;
  dob?: string;
  gender?: string;
  blood_group?: string | null;

  aadhaar_mask?: string | null;
  abha_mask?: string | null;

  address?: {
    street?: string | null;
    area?: string | null;
    city?: string | null;
    state?: string | null;
    pin_code?: string | null;
  } | null;

  allergies?: string | null;
  existing_conditions?: string | null;
  current_medications?: string | null;

  created_source?: string;
  is_app_account?: boolean;
  effective_status?: string;
  status?: string;

  parent_account?: any;

  total_appointments?: number;
  last_visited_date?: string | null;
  follow_up_date?: string | null;
  created_at?: string;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function buildAddress(address?: Patient["address"]) {
  if (!address) return "—";

  return [
    address.street,
    address.area,
    address.city,
    address.state,
    address.pin_code,
  ]
    .filter(Boolean)
    .join(", ") || "—";
}

function displayValue(value: any) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useAdminQuery(
    () => getPatient(id),
    ["admin", "patient", id],
    Boolean(id),
  );

  const patient: Patient =
    (data as any)?.patient ??
    (data as any)?.data?.patient ??
    (data as any)?.data ??
    {};

  const name = patient.full_name || "Patient";

  const status = String(
    patient.effective_status ??
    patient.status ??
    "active",
  ).toLowerCase();

  const initials = getInitials(name);

  const address = buildAddress(patient.address);

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                   */
  /* ------------------------------------------------------------------------ */

  if (isLoading) {
    return (
      <main className="w-full">
        <div className="space-y-6">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-border" />

          <div className="h-[220px] animate-pulse rounded-[28px] bg-card border border-border" />

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-xl bg-card border border-border" />
            <div className="h-72 animate-pulse rounded-xl bg-card border border-border" />
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Error                                                                     */
  /* ------------------------------------------------------------------------ */

  if (error) {
    return (
      <main className="w-full">
        <div className="w-full">
          <div className="rounded-xl border border-destructive/25 bg-destructive-soft p-5">
            <p className="text-sm font-semibold text-destructive">
              Unable to load patient
            </p>

            <p className="mt-1 text-xs text-destructive">
              {error.message || "Something went wrong while loading patient details."}
            </p>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg border-destructive/25 bg-card text-xs"
                onClick={() => refetch()}
              >
                Try Again
              </Button>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-card text-xs"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full">
      <div className="flex w-full flex-col gap-5">

        {/* ---------------------------------------------------------------- */}
        {/* PAGE HEADER                                                       */}
        {/* ---------------------------------------------------------------- */}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground/80">
              <span>Administration</span>
              <span>/</span>
              <span>Patients</span>
              <span>/</span>
              <span className="text-muted-foreground">
                {patient.account_code || `Patient #${patient.id ?? id}`}
              </span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Patient Details
            </h1>

            <p className="mt-1 text-xs text-muted-foreground">
              View patient profile, contact details, identity and appointment information.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Patients
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Patient Header                                                   */}
        {/* ---------------------------------------------------------------- */}

        <section className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-foreground">
                      {name}
                    </h2>

                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                        status === "active"
                          ? "bg-success-soft text-success"
                          : status === "inactive"
                            ? "bg-muted text-muted-foreground"
                            : "bg-warning-soft text-warning",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mr-1.5 h-1.5 w-1.5 rounded-full",
                          status === "active"
                            ? "bg-success"
                            : status === "inactive"
                              ? "bg-muted-foreground/40"
                              : "bg-warning",
                        ].join(" ")}
                      />
                      {formatLabel(status)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium">
                      {patient.account_code || `Patient #${patient.id ?? id}`}
                    </span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>{formatLabel(patient.gender)}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>
                      {patient.relationship
                        ? formatLabel(patient.relationship)
                        : "Self"}
                    </span>
                  </div>

                  {(patient.mobile || patient.email) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {patient.mobile && (
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                          <Phone className="size-3.5 text-muted-foreground/80" />
                          {patient.mobile}
                        </div>
                      )}

                      {patient.email && (
                        <div className="inline-flex max-w-[320px] items-center gap-1.5 truncate rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                          <Mail className="size-3.5 shrink-0 text-muted-foreground/80" />
                          <span className="truncate">{patient.email}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 lg:min-w-[420px]">
                <HeaderMetric
                  label="Appointments"
                  value={patient.total_appointments ?? 0}
                />
                <HeaderMetric
                  label="Last Visit"
                  value={formatDate(patient.last_visited_date)}
                />
                <HeaderMetric
                  label="Registered"
                  value={formatDate(patient.created_at)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Patient Information                                               */}
        {/* ---------------------------------------------------------------- */}

        <div className="grid gap-5 lg:grid-cols-2">

          <InfoCard
            title="Patient Information"
            icon={<User className="size-4" />}
          >
            <InfoGrid>
              <InfoItem
                label="Full Name"
                value={patient.full_name}
              />

              <InfoItem
                label="Date of Birth"
                value={formatDate(patient.dob)}
              />

              <InfoItem
                label="Gender"
                value={formatLabel(patient.gender)}
              />

              <InfoItem
                label="Relationship"
                value={formatLabel(patient.relationship)}
              />

              <InfoItem
                label="Mobile"
                value={patient.mobile}
              />

              <InfoItem
                label="Email"
                value={patient.email}
              />
            </InfoGrid>

            {(patient.guardian_name || patient.guardian_type) && (
              <div className="mt-5 border-t border-border/60 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground/80">
                  Guardian
                </p>

                <InfoGrid>
                  <InfoItem
                    label="Guardian Type"
                    value={patient.guardian_type}
                  />

                  <InfoItem
                    label="Guardian Name"
                    value={patient.guardian_name}
                  />
                </InfoGrid>
              </div>
            )}
          </InfoCard>

          {/* ---------------------------------------------------------------- */}
          {/* Address & Identity                                               */}
          {/* ---------------------------------------------------------------- */}

          <InfoCard
            title="Address & Identity"
            icon={<MapPin className="size-4" />}
          >
            <div className="rounded-lg  bg-muted/50 p-3.5">
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground/80" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground/80">
                    Address
                  </p>

                  <p className="mt-1 text-xs leading-5 text-foreground/80">
                    {address}
                  </p>
                </div>
              </div>
            </div>

            <InfoGrid className="mt-4">
              <InfoItem
                label="Aadhaar"
                value={patient.aadhaar_mask}
              />

              <InfoItem
                label="ABHA"
                value={patient.abha_mask}
              />

              <InfoItem
                label="App Account"
                value={patient.is_app_account ? "Yes" : "No"}
              />

              <InfoItem
                label="Created Source"
                value={formatLabel(patient.created_source)}
              />
            </InfoGrid>
          </InfoCard>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Appointment Summary                                               */}
        {/* ---------------------------------------------------------------- */}

        <Card className="overflow-hidden rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/60 px-5 py-4 pt-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="size-4" />
              </div>

              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Appointment Summary
                </CardTitle>

                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Patient appointment activity
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <div className="grid gap-3 sm:grid-cols-3">

              <SummaryMetric
                icon={<CalendarDays className="size-4" />}
                label="Total Appointments"
                value={patient.total_appointments ?? 0}
              />

              <SummaryMetric
                icon={<Clock3 className="size-4" />}
                label="Last Visited"
                value={formatDate(patient.last_visited_date)}
              />

              <SummaryMetric
                icon={<CalendarDays className="size-4" />}
                label="Follow-up"
                value={formatDate(patient.follow_up_date)}
              />

            </div>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Account Information                                               */}
        {/* ---------------------------------------------------------------- */}

        <Card className="overflow-hidden rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/60 px-5 py-4 pt-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ShieldCheck className="size-4" />
              </div>

              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Account Information
                </CardTitle>

                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Registration and account details
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <InfoGrid>
              <InfoItem
                label="Account Code"
                value={patient.account_code}
              />

              <InfoItem
                label="Status"
                value={formatLabel(status)}
              />

              <InfoItem
                label="Created Source"
                value={formatLabel(patient.created_source)}
              />

              <InfoItem
                label="Registered"
                value={formatDateTime(patient.created_at)}
              />

                 {/*  {value?.created_by_doctor_name && <span className="block text-[10px] text-muted-foreground">Register By: {value?.created_by_doctor_name}</span>} */}
                <InfoItem
                  label="Registered By"
                  value={formatDate(patient?.created_by_doctor_name)}
                />

              <InfoItem
                label="Parent Account"
                value={
                  patient.parent_account
                    ? "Linked"
                    : "No parent account"
                }
              />
            </InfoGrid>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function HeaderMetric({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="rounded-lg  bg-muted/50 px-3.5 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground/80">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {displayValue(value)}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-lg bg-card shadow-sm">
      <CardHeader className="border-b border-border/60 px-5 py-4 pt-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>

          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              {title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {children}
      </CardContent>
    </Card>
  );
}

function InfoGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-x-6 gap-y-4 sm:grid-cols-2 ${className}`}
    >
      {children}
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-[0.03em] text-muted-foreground/80">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-medium leading-5 text-foreground/80">
        {displayValue(value)}
      </p>
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg  bg-muted/50 px-4 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-sm">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.03em] text-muted-foreground/80">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold text-foreground">
          {displayValue(value)}
        </p>
      </div>
    </div>
  );
}