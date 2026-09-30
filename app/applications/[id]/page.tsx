"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useAdminMutation,
  useAdminQuery,
} from "@/hooks/use-admin-api";
import {
  getApplication,
  approveApplication,
  rejectApplication,
  getApplicationDocumentUrl,
} from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Check,
  X,
  ExternalLink,
  FileText,
  User,
  Stethoscope,
  Building2,
  ShieldCheck,
  GraduationCap,
  BriefcaseBusiness,
  Clock3,
  RefreshCw,
  IndianRupee,
  MapPin,
  Mail,
  Phone,
  CalendarDays,
  LockKeyhole,
} from "lucide-react";
import { formatDate, formatDateTime, getInitials } from "@/lib/formatters";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function valueOrDash(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function getApplicantName(app: any) {
  if (app?.full_name) {
    return app.full_name;
  }

  const name = [app?.first_name, app?.last_name]
    .filter(Boolean)
    .join(" ");

  if (name) {
    return name;
  }

  if (app?.name) {
    return app.name;
  }

  return "Doctor Application";
}

function money(value: unknown) {
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

  return `₹${number.toLocaleString("en-IN")}`;
}

function normalizeStatus(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function statusClasses(status: string) {
  switch (normalizeStatus(status)) {
    case "approved":
    case "active":
      return "border-success/25 bg-success-soft text-success";

    case "rejected":
      return "border-destructive/25 bg-destructive-soft text-destructive";

    case "suspended":
      return "border-warning/25 bg-warning-soft text-warning";

    case "pending":
      return "border-warning/25 bg-warning-soft text-warning";

    case "draft":
      return "border-border bg-muted/50 text-muted-foreground";

    default:
      return "border-border bg-muted/50 text-muted-foreground";
  }
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: unknown;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
        {/* {icon} */}
        {label}
      </div>

      <p className="break-words text-xs font-medium text-foreground">
        {valueOrDash(value)}
      </p>
    </div>
  );
}

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
    <Card
      className={`overflow-hidden rounded-lg bg-card shadow-none ${className}`}
    >
      <CardHeader className="border-b border-border/60 px-5 py-0 mb-0 pb-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon && (
            <span className="text-primary">
              {icon}
            </span>
          )}
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5">
        {children}
      </CardContent>
    </Card>
  );
}

function StatusPill({
  status,
  children,
}: {
  status: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
        status,
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children ?? status}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id ?? "");

  const [actionModal, setActionModal] = useState<
    "approve" | "reject" | null
  >(null);

  const [reason, setReason] = useState("");

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useAdminQuery(
    () => getApplication(id),
    ["admin", "doctor-application", id],
    Boolean(id),
  );

  const approveMutation = useAdminMutation<string, unknown>(
    (applicationId) => approveApplication(applicationId),
  );

  const rejectMutation = useAdminMutation<
    { id: string; reason: string },
    unknown
  >(({ id: applicationId, reason: rejectionReason }) =>
    rejectApplication(applicationId, rejectionReason),
  );

  const payload: any = data ?? {};

  const app: any = payload.application ?? payload;
  const documents: any[] = Array.isArray(payload.documents)
    ? payload.documents
    : [];

  const qualifications: any[] = Array.isArray(
    payload.qualifications,
  )
    ? payload.qualifications
    : [];

  const professionals: any[] = Array.isArray(
    payload.professionals,
  )
    ? payload.professionals
    : [];

  const applicantName = getApplicantName(app);
  const initials = getInitials(applicantName);

  const applicationStatus = normalizeStatus(app?.status);

  const isPending =
    applicationStatus === "pending";

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                */
  /* ---------------------------------------------------------------------- */

  async function confirmApprove() {
    try {
      await approveMutation.mutateAsync(id);

      setActionModal(null);
      setReason("");

      await refetch();
    } catch {
      // mutation error is displayed below
    }
  }

  async function confirmReject() {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        id,
        reason: trimmedReason,
      });

      setActionModal(null);
      setReason("");

      await refetch();
    } catch {
      // mutation error is displayed below
    }
  }

  async function openDocument(documentId: string) {
    try {
      const result: any =
        await getApplicationDocumentUrl(
          id,
          documentId,
        );

      const url = result?.url;

      if (url) {
        window.open(
          url,
          "_blank",
          "noopener,noreferrer",
        );
      }
    } catch {
      // document URL error can be handled by global API handling
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Loading / Error                                                        */
  /* ---------------------------------------------------------------------- */

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />
          Loading application...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-destructive/25 bg-destructive-soft p-5 text-sm text-destructive">
          {error.message}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full">
        <div className="space-y-5">

          {/* ---------------------------------------------------------------- */}
          {/* Page Header                                                      */}
          {/* ---------------------------------------------------------------- */}

          <div className="flex flex-col gap-4 sm:flex-row items-center sm:justify-between">

            {/* Left */}
            <div className="min-w-0">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to Applications
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex flex-wrap items-center gap-2">

              {isPending && (
                <>
                  {/* Reject */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="default"
                    onClick={() => {
                      setReason("");
                      setActionModal("reject");
                    }}
                    disabled={rejectMutation.isPending}
                  >
                    Reject Application
                  </Button>

                  {/* Approve */}
                  <Button
                    type="button"
                    variant="primary"
                    size="default"
                    onClick={() => {
                      setActionModal("approve");
                    }}
                    disabled={approveMutation.isPending}
                  >
                    Approve Application
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Main Layout                                                      */}
          {/* ---------------------------------------------------------------- */}

          <div className="grid grid-cols-1 gap-4">
            <div className="min-w-0 space-y-4">

              {/* ---------------------------------------------------------- */}
              {/* Applicant Hero                                             */}
              {/* ---------------------------------------------------------- */}

              <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-r from-primary/10 via-white to-primary/10 p-5">
                <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white bg-card text-lg font-semibold text-primary shadow-sm">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-foreground">
                          {applicantName}
                        </h2>

                        <StatusPill
                          status={
                            applicationStatus
                          }
                        />
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {valueOrDash(
                          app.specialization_name ??
                          app.other_specialization,
                        )}

                        {(app.city_name ||
                          app.city) && (
                            <>
                              {" · "}
                              {valueOrDash(
                                app.city_name ??
                                app.city,
                              )}
                            </>
                          )}

                        {(app.state_name ||
                          app.state) && (
                            <>
                              {", "}
                              {valueOrDash(
                                app.state_name ??
                                app.state,
                              )}
                            </>
                          )}
                      </p>

                      <p className="mt-2 font-mono text-xs text-muted-foreground/80">
                        {valueOrDash(
                          app.application_code,
                        )}
                        {" · "}
                        MRN:{" "}
                        {valueOrDash(
                          app.medical_registration_number,
                        )}
                        {" · "}
                        Submitted{" "}
                        {formatDate(
                          app.submitted_at,
                        )}
                      </p>
                    </div>
                  </div>


                  {/* Fees */}
                  <div className="grid grid-cols-2 gap-2 sm:min-w-[250px]">
                    <div className="rounded-xl border border-primary/25 bg-white/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                        Online Fee
                      </p>

                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {money(
                          app.online_consultation_fee,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-primary/25 bg-white/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                        Clinic Fee
                      </p>

                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {money(
                          app.clinic_consultation_fee,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* Error Messages                                              */}
              {/* ---------------------------------------------------------- */}

              {(approveMutation.error ||
                rejectMutation.error) && (
                  <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 text-xs text-destructive">
                    {(
                      approveMutation.error ||
                      rejectMutation.error
                    )?.message}
                  </div>
                )}

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">


                {/* ---------------------------------------------------------- */}
                {/* Personal Information                                       */}
                {/* ---------------------------------------------------------- */}

                <SectionCard
                  title="Personal Information"
                  icon={
                    <User className="size-4" />
                  }
                >
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">

                    <Field
                      label="First Name"
                      value={app.first_name}
                    />

                    <Field
                      label="Last Name"
                      value={app.last_name}
                    />

                    <Field
                      label="Mobile"
                      value={app.mobile}
                      icon={
                        <Phone className="size-4" />
                      }
                    />

                    <Field
                      label="Email"
                      value={app.email}
                      icon={
                        <Mail className="size-4" />
                      }
                    />

                    <Field
                      label="Date of Birth"
                      value={formatDate(
                        app.dob,
                      )}
                      icon={
                        <CalendarDays className="size-4" />
                      }
                    />

                    <Field
                      label="Gender"
                      value={
                        app.gender
                          ? String(
                            app.gender,
                          )
                            .charAt(0)
                            .toUpperCase() +
                          String(
                            app.gender,
                          ).slice(1)
                          : "—"
                      }
                    />

                    <Field
                      label="Experience"
                      value={
                        app.experience_years !==
                          null &&
                          app.experience_years !==
                          undefined
                          ? `${app.experience_years} years`
                          : "—"
                      }
                    />

                    <Field
                      label="Pincode"
                      value={app.pincode}
                    />
                  </div>
                </SectionCard>

                {/* ---------------------------------------------------------- */}
                {/* Professional Information                                   */}
                {/* ---------------------------------------------------------- */}

                <SectionCard
                  title="Professional Information"
                  icon={
                    <Stethoscope className="size-4" />
                  }
                >
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">

                    <Field
                      label="Medical Registration Number"
                      value={
                        app.medical_registration_number
                      }
                    />

                    <Field
                      label="Registration Year"
                      value={
                        app.registration_year
                      }
                    />

                    <Field
                      label="State Medical Council"
                      value={
                        app.state_medical_council
                      }
                    />

                    <Field
                      label="Specialization"
                      value={
                        app.specialization_name ??
                        app.other_specialization
                      }
                    />

                    <Field
                      label="Qualification"
                      value={
                        app.other_qualification
                      }
                    />
                  </div>
                </SectionCard>

                {/* ---------------------------------------------------------- */}
                {/* Clinic Information                                         */}
                {/* ---------------------------------------------------------- */}

                <SectionCard
                  title="Clinic Information"
                  icon={
                    <Building2 className="size-4" />
                  }
                >
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">

                    <Field
                      label="Clinic Name"
                      value={
                        app.clinic_name
                      }
                    />

                    <Field
                      label="Area / Locality"
                      value={app.area}
                    />

                    <div className="sm:col-span-2">
                      <Field
                        label="Address"
                        value={
                          app.address_line ??
                          app.clinic_address
                        }
                        icon={
                          <MapPin className="size-4" />
                        }
                      />
                    </div>

                    <Field
                      label="City"
                      value={app.city_name}
                    />

                    <Field
                      label="District"
                      value={app.district_name}
                    />

                    <Field
                      label="State"
                      value={app.state_name}
                    />

                    <Field
                      label="Pincode"
                      value={app.pincode}
                    />

                    <Field
                      label="Clinic Consultation Fee"
                      value={money(
                        app.clinic_consultation_fee,
                      )}
                      icon={
                        <IndianRupee className="size-4" />
                      }
                    />

                    <Field
                      label="Online Consultation Fee"
                      value={money(
                        app.online_consultation_fee,
                      )}
                      icon={
                        <IndianRupee className="size-4" />
                      }
                    />
                  </div>
                </SectionCard>

                {/* ---------------------------------------------------------- */}
                {/* Professional Affiliations                                 */}
                {/* ---------------------------------------------------------- */}

                <SectionCard
                  title="Professional Affiliations"
                  icon={
                    <BriefcaseBusiness className="size-4" />
                  }
                >
                  {professionals.length ===
                    0 ? (
                    <p className="text-xs text-muted-foreground/80">
                      No professional affiliation
                      information provided.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {professionals.map(
                        (
                          professional,
                          index,
                        ) => (
                          <div
                            key={
                              professional.id ??
                              index
                            }
                          // className="rounded-lg border border-border bg-muted/50 p-4"
                          >
                            <div className="grid gap-4 sm:grid-cols-2">

                              <Field
                                label="Designation"
                                value={
                                  professional.designation
                                }
                              />

                              <Field
                                label="Department"
                                value={
                                  professional.department
                                }
                              />

                              <Field
                                label="Institute"
                                value={
                                  professional.institute
                                }
                              />

                              <Field
                                label="City"
                                value={
                                  professional.city_name
                                }
                              />

                              <Field
                                label="State"
                                value={
                                  professional.state_name
                                }
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </SectionCard>

                {/* ---------------------------------------------------------- */}
                {/* Qualifications                                             */}
                {/* ---------------------------------------------------------- */}

                <SectionCard
                  title={`Qualifications (${qualifications.length})`}
                  icon={
                    <GraduationCap className="size-4" />
                  }
                >
                  {qualifications.length ===
                    0 ? (
                    <p className="text-xs text-muted-foreground/80">
                      No qualification records
                      found.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {qualifications.map(
                        (
                          qualification,
                          index,
                        ) => (
                          <div
                            key={
                              qualification.id ??
                              index
                            }
                          // className="rounded-lg border border-border bg-muted/50 p-4"
                          >
                            <div className="grid gap-4 sm:grid-cols-2">

                              <Field
                                label="Degree"
                                value={
                                  qualification.degree_name
                                }
                              />

                              <Field
                                label="Specialization"
                                value={
                                  qualification.qualification_specialization_name
                                }
                              />

                              <Field
                                label="College"
                                value={
                                  qualification.college_name
                                }
                              />

                              <Field
                                label="Year of Completion"
                                value={
                                  qualification.year_of_completion
                                }
                              />

                              <Field
                                label="College State"
                                value={
                                  qualification.college_state
                                }
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </SectionCard>

                {/* ---------------------------------------------------------- */}
                {/* Identity & Consent                                         */}
                {/* ---------------------------------------------------------- */}

                <SectionCard
                  title="Identity & Consent"
                  icon={
                    <ShieldCheck className="size-4" />
                  }
                >
                  <div className="space-y-4">

                    <div className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary" />

                        <div>
                          <p className="text-xs font-semibold text-primary">
                            Sensitive information is
                            masked
                          </p>

                          <p className="mt-0.5 text-xs text-primary">
                            Aadhaar and ABHA values are
                            intentionally displayed in
                            masked form.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">

                      <Field
                        label="Aadhaar"
                        value={
                          app.aadhaar_mask
                        }
                      />

                      <Field
                        label="ABHA"
                        value={
                          app.abha_mask
                        }
                      />

                      <Field
                        label="HP ID"
                        value={
                          app.hp_id_mask
                        }
                      />

                      <Field
                        label="Aadhaar Consent"
                        value={
                          app.aadhaar_consent_at
                            ? formatDateTime(
                              app.aadhaar_consent_at,
                            )
                            : "Not recorded"
                        }
                      />

                      <Field
                        label="Terms Accepted"
                        value={
                          app.terms_accepted_at
                            ? formatDateTime(
                              app.terms_accepted_at,
                            )
                            : "Not recorded"
                        }
                      />

                      <Field
                        label="Privacy Policy Consent"
                        value={
                          app.privacy_policy_consent_at
                            ? formatDateTime(
                              app.privacy_policy_consent_at,
                            )
                            : "Not recorded"
                        }
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* ---------------------------------------------------------- */}
                {/* Documents                                                  */}
                {/* ---------------------------------------------------------- */}

                <SectionCard
                  title={`Uploaded Documents (${documents.length})`}
                  icon={
                    <FileText className="size-4" />
                  }
                >
                  {documents.length ===
                    0 ? (
                    <p className="text-xs text-muted-foreground/80">
                      No documents found.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {documents.map(
                        (document) => (
                          <div
                            key={document.id}
                            className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <FileText className="size-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {document.document_type ??
                                    document.type ??
                                    "Document"}
                                </p>

                                <p className="mt-0.5 text-xs text-muted-foreground/80">
                                  Document ID:{" "}
                                  {valueOrDash(
                                    document.id,
                                  )}
                                  {" · "}
                                  File ID:{" "}
                                  {valueOrDash(
                                    document.file_id,
                                  )}
                                </p>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 bg-card text-xs"
                              onClick={() =>
                                void openDocument(
                                  String(
                                    document.id,
                                  ),
                                )
                              }
                            >
                              <ExternalLink className="mr-1.5 size-4" />
                              View Document
                            </Button>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </SectionCard>

                {/* ---------------------------------------------------------- */}
                {/* Application Metadata                                       */}
                {/* ---------------------------------------------------------- */}

                <SectionCard
                  title="Application Information"
                  icon={
                    <Clock3 className="size-4" />
                  }
                >
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    <Field
                      label="Application Code"
                      value={
                        app.application_code
                      }
                    />

                    <Field
                      label="Current Step"
                      value={
                        app.current_step
                      }
                    />

                    <Field
                      label="Status"
                      value={
                        app.status
                      }
                    />

                    <Field
                      label="Submitted At"
                      value={formatDateTime(
                        app.submitted_at,
                      )}
                    />

                    <Field
                      label="Created At"
                      value={formatDateTime(
                        app.created_at,
                      )}
                    />

                    <Field
                      label="Last Updated"
                      value={formatDateTime(
                        app.updated_at,
                      )}
                    />

                    <Field
                      label="Reviewed At"
                      value={
                        app.reviewed_at
                          ? formatDateTime(
                            app.reviewed_at,
                          )
                          : "Not reviewed"
                      }
                    />

                    <Field
                      label="Reviewed By"
                      value={
                        app.reviewed_by
                      }
                    />
                  </div>

                  {app.rejection_reason && (
                    <div className="mt-5 rounded-lg border border-destructive/25 bg-destructive-soft p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                        Rejection Reason
                      </p>

                      <p className="mt-1 text-sm text-destructive">
                        {app.rejection_reason}
                      </p>
                    </div>
                  )}

                  {app.suspension_reason && (
                    <div className="mt-5 rounded-lg border border-warning/25 bg-warning-soft p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                        Suspension Reason
                      </p>

                      <p className="mt-1 text-sm text-warning">
                        {app.suspension_reason}
                      </p>
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* APPROVE MODAL                                                      */}
      {/* ================================================================== */}

      {actionModal === "approve" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[420px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            {/* Content */}
            <div className="px-5 py-5">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Check className="size-4" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground">
                    Approve Doctor Application
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Approve the registration application for{" "}
                    <span className="font-semibold text-foreground/80">
                      {applicantName}
                    </span>
                    ?
                  </p>
                </div>
              </div>

              {/* Application info */}
              <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Application
                </span>

                <span className="text-xs font-semibold text-foreground">
                  {valueOrDash(app.application_code)}
                </span>
              </div>

              {/* Info */}
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />

                <p className="text-xs leading-4.5 text-primary">
                  This action will approve the doctor registration application.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/50 px-5 py-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActionModal(null)}
                disabled={approveMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => void confirmApprove()}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending
                  ? "Approving..."
                  : "Confirm Approval"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* REJECT MODAL                                                       */}
      {/* ================================================================== */}

      {actionModal === "reject" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[440px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            {/* Content */}
            <div className="px-5 py-5">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive-soft text-destructive">
                  <X className="size-4" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground">
                    Reject Doctor Application
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Enter a reason for rejecting{" "}
                    <span className="font-semibold text-foreground/80">
                      {applicantName}
                    </span>
                    's application.
                  </p>
                </div>
              </div>

              {/* Application info */}
              <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Application
                </span>

                <span className="text-xs font-semibold text-foreground">
                  {valueOrDash(app.application_code)}
                </span>
              </div>

              {/* Reason */}
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Rejection Reason
                  <span className="ml-1 text-destructive">*</span>
                </label>

                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  placeholder="Enter reason for rejection..."
                  className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-xs leading-5 text-foreground/80 outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:ring-2 focus:ring-primary/30"
                />

                <div className="mt-1 flex items-center justify-between">
                  {!reason.trim() ? (
                    <p className="text-xs text-muted-foreground/80">
                      A rejection reason is required.
                    </p>
                  ) : (
                    <span />
                  )}

                  <span className="text-xs text-muted-foreground/80">
                    {reason.length} characters
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/50 px-5 py-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setActionModal(null);
                  setReason("");
                }}
                disabled={rejectMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="destructive"
                // size="sm"
                onClick={() => void confirmReject()}
                disabled={!reason.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending
                  ? "Rejecting..."
                  : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}