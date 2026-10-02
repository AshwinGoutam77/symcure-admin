"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  IndianRupee,
  Info,
  Lock,
  RefreshCw,
  Save,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import {
  approveApplication,
  getAppointments,
  getDoctor,
  getDoctorSchedule,
  getEarnings,
  getDoctorRegistrationLookups,
  rejectApplication,
  setDoctorCommission,
  setDoctorStatus,
  updateDoctor,
} from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { useToast } from "@/components/ui/use-toast";
import { Pagination } from "@/components/pagination";

const TABS = [
  "Profile Info",
  "Documents",
  "Availability Config",
  "Appointments",
  "Commission",
  "Earnings",
] as const;

type Tab = (typeof TABS)[number];

type FormState = {
  district_id: string;
  first_name: string;
  last_name: string;
  mobile: string;
  email: string;
  dob: string;
  gender: string;
  clinic_name: string;
  address_line: string;
  area: string;
  pincode: string;
  state_id: string;
  city_id: string;
  experience_years: string;
  registration_year: string;
  specialization_id: string;
  other_specialization: string;
  clinic_consultation_fee: string;
  online_consultation_fee: string;
  show_fees_on_app: boolean;
  visible_on_app: boolean;
  bio: string;
};

const emptyForm: FormState = {
  first_name: "",
  last_name: "",
  mobile: "",
  email: "",
  dob: "",
  gender: "",
  clinic_name: "",
  address_line: "",
  area: "",
  pincode: "",
  state_id: "",
  district_id: "",
  city_id: "",
  experience_years: "",
  registration_year: "",
  specialization_id: "",
  other_specialization: "",
  clinic_consultation_fee: "",
  online_consultation_fee: "",
  show_fees_on_app: true,
  visible_on_app: true,
  bio: "",
};

function unwrap<T = any>(value: any): T {
  return (value?.data ?? value) as T;
}

function money(value: any) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function dateLabel(value: any) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function dateTimeLabel(value: any) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace("AM", "am")
    .replace("PM", "pm");
}

function timeLabel(value: any) {
  if (!value) return "—";

  const raw = String(value).trim();

  // API format: HH:mm:ss or HH:mm
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (match) {
    const hour = Number(match[1]);
    const minute = match[2];

    const suffix = hour >= 12 ? "pm" : "am";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
  }

  // Fallback for full datetime values
  const date = new Date(raw);

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .format(date)
      .replace("AM", "am")
      .replace("PM", "pm");
  }

  return raw;
}

function initials(first: string, last: string) {
  const value = `${first} ${last}`.trim();
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "DR"
  );
}

function normalizeStatus(value: any) {
  return String(value ?? "—").toLowerCase().replace(/_/g, " ");
}

function statusTone(value: any) {
  const status = normalizeStatus(value);
  if (status === "active" || status === "approved" || status === "paid") {
    return "green";
  }
  if (status === "suspended" || status === "rejected" || status === "cancelled") {
    return "red";
  }
  if (status === "pending" || status === "pending review") return "amber";
  return "slate";
}

function Pill({ value, children }: { value: any; children?: ReactNode }) {
  const tone = statusTone(value);
  const styles = {
    green: "bg-success-soft text-success border-success/25",
    red: "bg-destructive-soft text-destructive border-destructive/25",
    amber: "bg-warning-soft text-warning border-warning/25",
    slate: "bg-muted text-muted-foreground border-border",
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children ?? normalizeStatus(value)}
    </span>
  );
}

function SectionCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-lg bg-card shadow-sm ${className}`}>
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={`h-10 w-full rounded-md border px-3 text-xs outline-none transition ${error
          ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/10"
          : disabled
            ? "cursor-not-allowed border-border bg-muted/50 text-muted-foreground/80"
            : "border-border focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
          }`}
      />
      {error ? (
        <span className="mt-1 block text-[11px] text-destructive">{error}</span>
      ) : null}
    </label>
  );
}

function Modal({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  icon: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] rounded-lg bg-card shadow-xl">
        <div className="p-5">
          <div className="flex items-center gap-2">
            {/* <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50">
            {icon}
          </div> */}
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
          </div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AdminDoctorDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id ?? "");

  const handleBack = () => {
    router.back();
  };

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("Profile Info");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [actionModal, setActionModal] = useState<"suspend" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [commissionForm, setCommissionForm] = useState({ online: "", clinic: "" });
  const [earningsStart, setEarningsStart] = useState("");
  const [earningsEnd, setEarningsEnd] = useState("");
  const [appliedEarningsStart, setAppliedEarningsStart] = useState("");
  const [appliedEarningsEnd, setAppliedEarningsEnd] = useState("");
  const [appointmentStart, setAppointmentStart] = useState("");
  const [appointmentEnd, setAppointmentEnd] = useState("");
  const [appliedAppointmentStart, setAppliedAppointmentStart] = useState("");
  const [appliedAppointmentEnd, setAppliedAppointmentEnd] = useState("");
  const [appointmentStatus, setAppointmentStatus] = useState("");
  const [appliedAppointmentStatus, setAppliedAppointmentStatus] = useState("");
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [earningsPage, setEarningsPage] = useState(1);

  const doctorQuery = useAdminQuery(
    () => getDoctor(id),
    ["admin", "doctor", id],
    Boolean(id),
  );

  const registrationLookupsQuery = useAdminQuery(
    () => getDoctorRegistrationLookups(),
    ["admin", "doctor-registration-lookups"],
    Boolean(id),
  );

  const registrationLookups = unwrap<any>(
    registrationLookupsQuery.data,
  );

  const states = Array.isArray(registrationLookups?.states)
    ? registrationLookups.states
    : [];

  const cities = Array.isArray(registrationLookups?.cities)
    ? registrationLookups.cities
    : [];

  const filteredCities = useMemo(() => {
    if (!form.state_id) return [];

    return cities.filter(
      (city: any) =>
        String(city.state_id) === String(form.state_id),
    );
  }, [cities, form.state_id]);

  const districts = Array.isArray(registrationLookups?.districts)
    ? registrationLookups.districts
    : [];

  const filteredDistricts = useMemo(() => {
    if (!form.state_id) return [];

    return districts.filter(
      (district: any) =>
        String(district.state_id) === String(form.state_id)
    );
  }, [districts, form.state_id]);

  const doctorResponse = unwrap<any>(doctorQuery.data);

  const doctor = doctorResponse?.doctor ?? doctorResponse ?? {};

  const statusOverview =
    doctorResponse?.status_overview ??
    doctor?.status_overview ??
    {};

  const application =
    doctorResponse?.application ??
    doctor?.application ??
    {};

  const documents =
    doctorResponse?.documents ??
    doctor?.documents ??
    [];


  const commission =
    doctorResponse?.commission ??
    doctor?.commission ??
    {};

  const doctorName = `${doctor?.first_name ?? ""} ${doctor?.last_name ?? ""}`.trim() || doctor?.full_name || doctor?.name || `Doctor #${id}`;
  const firstName = doctor?.first_name ?? doctor?.firstName ?? "";
  const lastName = doctor?.last_name ?? doctor?.lastName ?? "";
  const currentStatus = statusOverview.account_status ?? doctor?.account_status ?? doctor?.status ?? "active";
  const applicationStatus = statusOverview.application_status ?? doctor?.application_status ?? application?.status;

  const saveDoctor = useAdminMutation<Record<string, unknown>, unknown>(
    (body) => updateDoctor(id, body),
  );

  const statusMutation = useAdminMutation<{ status: "active" | "suspended"; reason?: string }, unknown>(
    (body) => setDoctorStatus(id, body),
  );

  const rejectMutation = useAdminMutation<string, unknown>(
    (value) => rejectApplication(String(application?.id ?? doctor?.application_id ?? ""), value),
  );

  const approveMutation = useAdminMutation<void, unknown>(
    () => approveApplication(String(application?.id ?? doctor?.application_id ?? "")),
  );

  const commissionMutation = useAdminMutation<Record<string, unknown>, unknown>(
    (body) => setDoctorCommission(id, body),
  );

  const scheduleQuery = useAdminQuery(
    () => getDoctorSchedule(id),
    ["admin", "doctor-schedule", id],
    Boolean(id) && activeTab === "Availability Config",
  );

  const appointmentsQuery = useAdminQuery(
    () =>
      getAppointments({
        doctor_id: id,
        status: appliedAppointmentStatus || undefined,
        date_from: appliedAppointmentStart || undefined,
        date_to: appliedAppointmentEnd || undefined,
        page: appointmentPage,
        limit: 20,
      }),
    [
      "admin",
      "doctor-appointments",
      {
        id,
        appliedAppointmentStatus,
        appliedAppointmentStart,
        appliedAppointmentEnd,
        appointmentPage,
      },
    ],
    Boolean(id) && activeTab === "Appointments",
  );

  const earningsQuery = useAdminQuery(
    () =>
      getEarnings({
        doctor_id: id,
        start: appliedEarningsStart,
        end: appliedEarningsEnd,
        page: earningsPage,
        limit: 20,
      }),
    [
      "admin",
      "doctor-earnings",
      {
        id,
        appliedEarningsStart,
        appliedEarningsEnd,
        earningsPage,
      },
    ],
    Boolean(
      id &&
      appliedEarningsStart &&
      appliedEarningsEnd &&
      activeTab === "Earnings",
    ),
  );

  useEffect(() => {
    const d = doctor;
    if (!d || !Object.keys(d).length) return;

    setForm({
      first_name: d.first_name ?? d.firstName ?? "",
      last_name: d.last_name ?? d.lastName ?? "",
      mobile: d.mobile ?? "",
      email: d.email ?? "",
      dob: d.dob ?? "",
      gender: d.gender ?? "",
      clinic_name: d.clinic_name ?? d.clinic?.name ?? "",
      address_line: d.address_line ?? d.address ?? d.clinic?.address ?? "",
      area: d.area ?? d.clinic?.area ?? "",
      pincode: d.pincode ?? d.clinic?.pincode ?? "",
      state_id: String(d.state_id ?? ""),
      city_id: String(d.city_id ?? ""),
      district_id: String(d.district_id ?? ""),
      experience_years: String(d.experience_years ?? d.experience ?? ""),
      registration_year: String(d.registration_year ?? ""),
      specialization_id: String(d.specialization_id ?? ""),
      other_specialization: d.other_specialization ?? "",
      clinic_consultation_fee: String(d.clinic_consultation_fee ?? d.clinic_fee ?? ""),
      online_consultation_fee: String(d.online_consultation_fee ?? d.online_fee ?? ""),
      show_fees_on_app: Boolean(d.show_fees_on_app),
      visible_on_app: d.visible_on_app !== false,
      bio: d.bio ?? "",
    });

    setCommissionForm({
      online: String(
        commission?.online_consultation_commission_amt ??
        commission?.online_fee ??
        "",
      ),
      clinic: String(
        commission?.clinic_consultation_commission_amt ??
        commission?.clinic_fee ??
        "",
      ),
    });
  }, [doctorQuery.data]);

  useEffect(() => {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    );

    const iso = (d: Date) => {
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      return `${d.getFullYear()}-${month}-${day}`;
    };

    const startDate = iso(start);
    const endDate = iso(end);

    setEarningsStart(startDate);
    setEarningsEnd(endDate);

    setAppliedEarningsStart(startDate);
    setAppliedEarningsEnd(endDate);

    setAppointmentStart(startDate);
    setAppointmentEnd(endDate);

    setAppliedAppointmentStart(startDate);
    setAppliedAppointmentEnd(endDate);

    setAppointmentPage(1);
  }, []);

  const summary = unwrap<any>(earningsQuery.data)?.summary ?? {};
  const earningsResponse = unwrap<any>(earningsQuery.data);

  const ledgerMeta = earningsResponse?.ledger ?? {};

  const ledger = Array.isArray(ledgerMeta?.data)
    ? ledgerMeta.data
    : [];

  const earningsCurrentPage =
    ledgerMeta?.current_page ?? 1;

  const earningsLastPage =
    ledgerMeta?.last_page ?? 1;

  const earningsTotal =
    ledgerMeta?.total ?? 0;

  const earningsFrom =
    ledgerMeta?.from ?? 0;

  const earningsTo =
    ledgerMeta?.to ?? 0;

  const rawAppointmentsResponse = appointmentsQuery.data?.data as any;

  const appointmentsResponse =
    rawAppointmentsResponse?.data ?? rawAppointmentsResponse ?? {};

  const appointmentRows = Array.isArray(
    appointmentsResponse?.data
  )
    ? appointmentsResponse.data
    : Array.isArray(rawAppointmentsResponse)
      ? rawAppointmentsResponse
      : [];

  const appointmentsMeta =
    appointmentsQuery?.data?.meta
  { };

  const appointmentCurrentPage =
    Number(appointmentsMeta?.current_page ?? 1);


  const appointmentLastPage =
    Number(appointmentsMeta?.last_page ?? 1);

  const appointmentTotal =
    Number(appointmentsMeta?.total ?? appointmentRows.length);

  const appointmentPerPage =
    Number(appointmentsMeta?.per_page ?? 20);

  const appointmentFrom =
    appointmentTotal > 0
      ? ((appointmentCurrentPage - 1) * appointmentPerPage) + 1
      : 0;

  const appointmentTo =
    appointmentTotal > 0
      ? Math.min(
        appointmentFrom + appointmentRows.length - 1,
        appointmentTotal,
      )
      : 0;

  const schedule = unwrap<any>(scheduleQuery.data)?.schedule ?? unwrap<any>(scheduleQuery.data)?.weekly_schedule ?? unwrap<any>(scheduleQuery.data)?.data ?? [];

  const weeklyRows = useMemo(() => {
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    if (!Array.isArray(schedule)) {
      return [];
    }

    const grouped = new Map<number, any[]>();

    schedule.forEach((slot: any) => {
      const day = Number(slot?.day_of_week);

      if (!Number.isInteger(day) || day < 0 || day > 6) {
        return;
      }

      if (!grouped.has(day)) {
        grouped.set(day, []);
      }

      grouped.get(day)!.push(slot);
    });

    return dayNames.map((name, dayIndex) => {
      const sessions = (grouped.get(dayIndex) ?? []).sort(
        (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
      );

      return {
        dayIndex,
        day: name,
        sessions,
        active: sessions.length > 0,
      };
    });
  }, [schedule]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};

    if (!form.first_name.trim()) {
      errors.first_name = "First name is required.";
    }

    if (!form.last_name.trim()) {
      errors.last_name = "Last name is required.";
    }

    if (!form.mobile.trim()) {
      errors.mobile = "Mobile number is required.";
    }

    if (!form.email.trim()) {
      errors.email = "Email is required.";
    }

    if (!form.gender.trim()) {
      errors.gender = "Gender is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        title: "Required fields missing",
        description: "Please fill in all required fields before saving.",
        variant: "destructive",
      });
      return;
    }

    setFormErrors({});

    try {
      const response: any = await saveDoctor.mutateAsync({
        first_name: form.first_name,
        last_name: form.last_name,
        mobile: form.mobile || undefined,
        email: form.email || undefined,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        clinic_name: form.clinic_name || undefined,
        address_line: form.address_line || undefined,
        area: form.area || undefined,
        pincode: form.pincode || undefined,
        state_id: form.state_id || undefined,
        district_id: form.district_id || undefined,
        city_id: form.city_id || undefined,
        experience_years: form.experience_years
          ? Number(form.experience_years)
          : undefined,
        registration_year: form.registration_year
          ? Number(form.registration_year)
          : undefined,
        specialization_id: form.specialization_id || undefined,
        other_specialization: form.other_specialization || undefined,
        clinic_consultation_fee: form.clinic_consultation_fee
          ? Number(form.clinic_consultation_fee)
          : undefined,
        online_consultation_fee: form.online_consultation_fee
          ? Number(form.online_consultation_fee)
          : undefined,
        show_fees_on_app: form.show_fees_on_app,
        visible_on_app: form.visible_on_app,
        bio: form.bio || undefined,
      });

      // API may return HTTP 200 with success:false
      if (response?.success === false) {
        throw new Error(
          response?.error?.message ||
          response?.message ||
          "Failed to update doctor profile.",
        );
      }

      toast({
        title: "Success",
        description:
          response?.message || "Doctor profile updated successfully.",
      });

      // Refresh doctor data
      await doctorQuery.refetch();
    } catch (error: any) {
      console.error("Doctor profile update failed:", error);

      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.data?.error?.message ||
        error?.data?.message ||
        error?.error?.message ||
        error?.message ||
        "Failed to update doctor profile.";

      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleStatusAction = async () => {
    if (!reason.trim()) return;
    await statusMutation.mutateAsync({
      status: normalizeStatus(currentStatus) === "suspended" ? "active" : "suspended",
      reason: reason.trim(),
    });
    setReason("");
    setActionModal(null);
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    await rejectMutation.mutateAsync(reason.trim());
    setReason("");
    setActionModal(null);
  };

  const handleApprove = async () => {
    await approveMutation.mutateAsync();
  };

  const handleCommissionSave = async () => {
    await commissionMutation.mutateAsync({
      online_consultation_commission_amt: commissionForm.online
        ? Number(commissionForm.online)
        : 0,
      clinic_consultation_commission_amt: commissionForm.clinic
        ? Number(commissionForm.clinic)
        : 0,
    });

    await doctorQuery.refetch();
  };

  if (doctorQuery.isLoading) {
    return (
      <div className="w-full">
        <div className="flex min-h-[60vh] items-center justify-center px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" />
            Loading doctor profile...
          </div>
        </div>
      </div>
    );
  }

  if (doctorQuery.error) {
    return (
      <div className="min-h-full bg-muted/50 p-6">
        <div className="rounded-xl border border-destructive/25 bg-destructive-soft p-5 text-sm text-destructive">
          {doctorQuery.error.message}
        </div>
      </div>
    );
  }

  const earningsColumns = [
    {
      key: "occurred_at",
      header: "Date",
      className: "whitespace-nowrap",
      render: (value: any, row: any) => (
        <div>
          <p className="text-xs text-foreground/80">
            {dateLabel(
              row.appointment?.consultation_date ?? value
            )}
          </p>

          <p className="text-xs text-muted-foreground/80">
            {timeLabel(value)}
          </p>
        </div>
      ),
    },

    {
      key: "appointment",
      header: "Appointment",
      render: (_value: any, row: any) => (
        <div>
          <p className="text-xs font-medium text-foreground/80">
            {row.appointment?.appointment_code ?? "—"}
          </p>

          <p className="text-xs text-muted-foreground/80">
            Token {row.appointment?.token_number ?? "—"}
          </p>
        </div>
      ),
    },

    {
      key: "patient",
      header: "Patient",
      render: (_value: any, row: any) => (
        <div>
          <p className="text-xs font-medium text-foreground/80">
            {row.appointment?.patient?.full_name ?? "—"}
          </p>

          <p className="text-xs text-muted-foreground/80">
            {row.appointment?.patient?.account_code ?? ""}
          </p>
        </div>
      ),
    },

    {
      key: "consult_type",
      header: "Consultation",
      render: (_value: any, row: any) => (
        <div>
          <p className="text-xs capitalize text-muted-foreground">
            {row.appointment?.consult_type ?? "—"}
          </p>

          <p className="text-xs text-muted-foreground/80">
            {row.appointment?.slot_text ?? ""}
          </p>
        </div>
      ),
    },

    {
      key: "payment_mode",
      header: "Payment",
      render: (_value: any, row: any) => (
        <span className="text-xs capitalize text-muted-foreground">
          {row.appointment?.payment_mode ?? "—"}
        </span>
      ),
    },

    {
      key: "gross_amount",
      header: "Gross",
      render: (value: any) => (
        <span className="text-xs font-semibold text-foreground/80">
          {money(value)}
        </span>
      ),
    },

    {
      key: "commission_amount",
      header: "Commission",
      render: (value: any) => (
        <span className="text-xs font-semibold text-destructive">
          {money(value)}
        </span>
      ),
    },

    {
      key: "net_amount",
      header: "Net",
      render: (value: any) => (
        <span className="text-xs font-semibold text-success">
          {money(value)}
        </span>
      ),
    },

    {
      key: "status",
      header: "Status",
      render: (value: any) => (
        <Pill value={value} />
      ),
    },
  ];

const appointmentColumns = [
  {
    key: "appointment_code",
    header: "Appointment",
    render: (_value: any, row: any) => (
      <div>
        <p className="text-xs font-semibold text-foreground">
          {row.appointment_code ??
            row.appointment_id ??
            row.id ??
            "—"}
        </p>

        {row.token_number ? (
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            Token: {row.token_number}
          </p>
        ) : null}
      </div>
    ),
  },

  {
    key: "patient",
    header: "Patient",
    render: (_value: any, row: any) => (
      <div className="min-w-0">
        <p className="max-w-[180px] truncate text-xs font-semibold text-foreground">
          {row.patient?.name ??
            row.patient?.full_name ??
            row.patient_name ??
            "—"}
        </p>

        {row.patient?.guardian_name &&
          row.patient?.guardian_type ? (
          <p className="max-w-[180px] truncate text-xs text-muted-foreground/80">
            {row.patient.guardian_type}{" "}
            {row.patient.guardian_name}
          </p>
        ) : null}

        {(row.patient?.patient_code ??
          row.patient?.account_code ??
          row.patient_code) ? (
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            {row.patient?.patient_code ??
              row.patient?.account_code ??
              row.patient_code}
          </p>
        ) : null}
      </div>
    ),
  },

  {
    key: "start_at",
    header: "Date / Time",
    render: (value: any, row: any) => (
      <div className="min-w-[125px]">
        <p className="text-xs font-medium text-foreground/80">
          {dateLabel(
            value ??
              row.date ??
              row.appointment_date,
          )}
        </p>

        <p className="mt-0.5 text-xs text-muted-foreground/80">
          {timeLabel(
            row.time ??
              row.start_time ??
              value,
          )}
        </p>
      </div>
    ),
  },

  {
    key: "consult_type",
    header: "Type",
    render: (value: any, row: any) => {
      const type = String(
        value ??
          row.type ??
          "",
      ).toLowerCase();

      const isClinic =
        type === "offline" ||
        type === "clinic";

      const label = isClinic
        ? "Clinic"
        : type === "online" ||
            type === "video"
          ? "Video"
          : value ??
            row.type ??
            "—";

      return (
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
            "text-[12px] font-semibold capitalize",
            isClinic
              ? "bg-warning-soft text-warning"
              : "bg-blue-50 text-blue-600",
          ].join(" ")}
        >
          <span
            className={[
              "size-1.5 rounded-full",
              isClinic
                ? "bg-amber-500"
                : "bg-blue-500",
            ].join(" ")}
          />

          {label}
        </span>
      );
    },
  },

  {
    key: "status",
    header: "Status",
    render: (value: any) => {
      const status = String(
        value ?? "",
      ).toLowerCase();

      let label = "—";

      if (status === "scheduled") {
        label = "Scheduled";
      } else if (status === "completed") {
        label = "Completed";
      } else if (status === "cancelled") {
        label = "Cancelled";
      } else if (status === "no_show") {
        label = "No Show";
      } else if (status === "unresolved") {
        label = "Unresolved";
      } else if (value) {
        label = String(value)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) =>
            char.toUpperCase(),
          );
      }

      if (status === "scheduled") {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-600">
            <span className="size-1.5 rounded-full bg-blue-500" />
            {label}
          </span>
        );
      }

      if (status === "completed") {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-600">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {label}
          </span>
        );
      }

      if (
        status === "cancelled" ||
        status === "no_show"
      ) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-semibold text-red-600">
            <span className="size-1.5 rounded-full bg-red-500" />
            {label}
          </span>
        );
      }

      if (status === "unresolved") {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-600">
            <span className="size-1.5 rounded-full bg-amber-500" />
            {label}
          </span>
        );
      }

      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
          <span className="size-1.5 rounded-full bg-current opacity-70" />
          {label}
        </span>
      );
    },
  },

  {
    key: "amount",
    header: "Amount",
    render: (value: any, row: any) => {
      const amount =
        value ??
        row.total_amount ??
        row.amount ??
        0;

      const paymentStatus = String(
        row.payment_status ??
          row.payment?.status ??
          row.status_payment ??
          "",
      ).toLowerCase();

      const isPaid =
        paymentStatus === "paid" ||
        paymentStatus === "success" ||
        paymentStatus === "completed";

      const isPending =
        paymentStatus === "pending" ||
        paymentStatus === "unpaid";

      const isNotRequired =
        paymentStatus ===
          "not_required" ||
        paymentStatus ===
          "not required" ||
        Number(amount) === 0 &&
          !isPending &&
          !isPaid;

      return (
        <div>
          <p className="text-xs font-semibold text-foreground">
            {money(amount)}
          </p>

          {isPaid ? (
            <p className="mt-0.5 text-[12px] font-medium text-emerald-600">
              Paid
            </p>
          ) : isPending ? (
            <p className="mt-0.5 text-[12px] font-medium text-amber-600">
              Pending
            </p>
          ) : isNotRequired ? (
            <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">
              Not Required
            </p>
          ) : null}
        </div>
      );
    },
  },

  {
    key: "action",
    header: "",
    render: (_value: any, row: any) => (
      <Link
        href={`/appointments/${
          row.id ??
          row.appointment_id
        }`}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/50 transition hover:bg-muted hover:text-muted-foreground"
      >
        <ChevronRight className="size-4" />
      </Link>
    ),
  },
];

  return (
    <div className="w-full">
      <div className="w-full">
        {/* PAGE HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground/80 hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Doctors
            </button>
            {/* <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {doctorName}
              </h1>
              <Pill value={applicationStatus ?? currentStatus}>
                {normalizeStatus(applicationStatus ?? currentStatus) === "pending"
                  ? "Pending Review"
                  : normalizeStatus(currentStatus)}
              </Pill>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
              <span>{doctor?.doctor_code ?? doctor?.code ?? `SYM-D-${id}`}</span>
              <span>•</span>
              <span>
                Registered {dateLabel(doctor?.registered_at ?? doctor?.registered_date ?? doctor?.created_at)}
              </span>
            </div> */}
          </div>
        </div>

        {/* HERO + SIDE ACTIONS */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_250px]">
          {/* ================================================================
      DOCTOR HEADER
  ================================================================= */}
          <div className="relative overflow-hidden rounded-lg border border-primary/15 bg-gradient-to-r from-primary/10 via-white to-primary/10 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Doctor Info */}
              <div className="flex min-w-0 items-center gap-4">
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-base font-semibold text-muted-foreground">
                  {initials(firstName, lastName)}
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold leading-6 text-foreground">
                      {doctorName}
                    </h2>

                    <StatusBadge
                      status={
                        normalizeStatus(currentStatus) === "active"
                          ? "active"
                          : normalizeStatus(currentStatus) === "suspended"
                            ? "suspended"
                            : "pending"
                      }
                    >
                      {normalizeStatus(currentStatus)}
                    </StatusBadge>
                  </div>

                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {doctor?.specialization_name ??
                      doctor?.specialization?.name ??
                      doctor?.specialty ??
                      "Specialization not available"}

                    {(doctor?.city_name || doctor?.city) && " · "}

                    {doctor?.city_name ?? doctor?.city ?? ""}

                    {(doctor?.state_name || doctor?.state) && ", "}

                    {doctor?.state_name ?? doctor?.state ?? ""}
                  </p>

                  <p className="mt-2 font-mono text-xs text-muted-foreground/80">
                    {doctor?.doctor_code ??
                      doctor?.code ??
                      `SYM-D-${id}`}

                    {" · "}

                    {doctor?.registration_number_mask ??
                      doctor?.medical_registration_number ??
                      "Registration not available"}

                    {" · Registered "}

                    {dateLabel(
                      doctor?.registered_at ??
                      doctor?.created_at
                    )}
                  </p>
                </div>
              </div>

              {/* Fees */}
              <div className="grid grid-cols-2 gap-3 sm:min-w-[250px]">
                <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Online Fee
                  </p>

                  <p className="mt-1 text-base font-semibold text-foreground">
                    {money(
                      doctor?.online_consultation_fee ??
                      doctor?.online_fee
                    )}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Clinic Fee
                  </p>

                  <p className="mt-1 text-base font-semibold text-foreground">
                    {money(
                      doctor?.clinic_consultation_fee ??
                      doctor?.clinic_fee
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================
      ACCOUNT ACTIONS
  ================================================================= */}
          <aside className="overflow-hidden rounded-lg bg-card shadow-sm">
            <div className="border-b border-border/60 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground/80">
                Account Actions
              </p>
            </div>

            <div className="space-y-2 p-3">
              {/* Pending Application */}
              {normalizeStatus(applicationStatus) === "pending" && (
                <>
                  <Button
                    variant="outline"
                    className="
              h-10
              w-full
              border-destructive/25
              bg-card
              text-xs
              font-semibold
              text-destructive
              hover:bg-destructive-soft
              hover:text-destructive
            "
                    onClick={() => {
                      setReason("");
                      setActionModal("reject");
                    }}
                  >
                    <X className="mr-1.5 size-4" />
                    Reject Application
                  </Button>

                  <Button
                    className="
              h-10
              w-full
              bg-primary
              text-xs
              font-semibold
              text-white
              hover:bg-primary/90
            "
                    onClick={() => void handleApprove()}
                    disabled={approveMutation.isPending}
                  >
                    <Check className="mr-1.5 size-4" />

                    {approveMutation.isPending
                      ? "Approving..."
                      : "Approve Application"}
                  </Button>
                </>
              )}

              {/* Suspend / Reactivate */}
              <Button
                variant={
                  normalizeStatus(currentStatus) === "suspended"
                    ? "primary"
                    : "warning"
                }
                className="w-full"
                onClick={() => {
                  setReason("");
                  setActionModal("suspend");
                }}
              >
                {normalizeStatus(currentStatus) === "suspended" ? (
                  <UserCheck className="mr-1.5 size-4" />
                ) : (
                  <UserX className="mr-1.5 size-4" />
                )}

                {normalizeStatus(currentStatus) === "suspended"
                  ? "Reactivate Account"
                  : "Suspend Account"}
              </Button>
            </div>
          </aside>
        </div>

        {/* TABS */}
        <div className="mt-5 overflow-x-auto border-b border-border/60">
          <div className="flex min-w-max items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`cursor-pointer relative px-3 py-2.5 text-sm font-semibold transition ${activeTab === tab
                  ? "text-primary"
                  : "text-muted-foreground/80 hover:text-foreground/80"
                  }`}
              >
                {tab}
                {activeTab === tab && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT + STATUS SIDEBAR */}
        {/* <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_250px]"> */}
        <div className="mt-5 grid grid-cols-1 gap-5">
          <main className="min-w-0 ">
            {/* PROFILE */}
            {activeTab === "Profile Info" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <SectionCard title="Personal Information" description="Core doctor identity and contact details.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="First Name *" value={form.first_name} onChange={(v) => {
                        updateField("first_name", v);
                        if (v.trim()) setFormErrors((prev) => ({ ...prev, first_name: "" }));
                      }} error={formErrors.first_name} />
                      <Field label="Last Name *" value={form.last_name} onChange={(v) => {
                        updateField("last_name", v);
                        if (v.trim()) setFormErrors((prev) => ({ ...prev, last_name: "" }));
                      }} error={formErrors.last_name} />
                      <Field label="Mobile *" value={form.mobile} onChange={(v) => {
                        updateField("mobile", v);
                        if (v.trim()) setFormErrors((prev) => ({ ...prev, mobile: "" }));
                      }} error={formErrors.mobile} />
                      <Field label="Email *" value={form.email} onChange={(v) => {
                        updateField("email", v);
                        if (v.trim()) setFormErrors((prev) => ({ ...prev, email: "" }));
                      }} type="email" error={formErrors.email} />
                      <Field label="Date of Birth" value={form.dob} onChange={(v) => updateField("dob", v)} type="date" />
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Gender *
                        </span>
                        <select
                          value={form.gender}
                          onChange={(e) => {
                            updateField("gender", e.target.value);
                            if (e.target.value) {
                              setFormErrors((prev) => ({ ...prev, gender: "" }));
                            }
                          }}
                          className={`h-10 w-full rounded-md border bg-card px-3 text-xs text-foreground/80 outline-none transition focus:ring-2 focus:ring-primary/10 ${formErrors.gender
                            ? "border-destructive focus:border-destructive focus:ring-destructive/10"
                            : "border-border focus:border-primary"
                            }`}
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                        {formErrors.gender ? (
                          <span className="mt-1 block text-[11px] text-destructive">
                            {formErrors.gender}
                          </span>
                        ) : null}
                      </label>
                      <Field label="Area / Locality" value={form.area} onChange={(v) => updateField("area", v)} />
                      <Field label="Pincode *" value={form.pincode} onChange={(v) => updateField("pincode", v)} />
                    </div>
                    <div className="mt-4">
                      <Field label="Address Line" value={form.address_line} onChange={(v) => updateField("address_line", v)} />
                    </div>
                  </SectionCard>

                  <SectionCard title="Professional Information" description="Registration, specialization, experience and consultation fees.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Registration Number *" value={String(doctor?.medical_registration_number ?? doctor?.registration_number_mask ?? "—")} disabled />
                      <Field label="Registration Year *" value={form.registration_year} onChange={(v) => updateField("registration_year", v)} />
                      <Field label="Specialization" value={doctor?.specialization_name ?? doctor?.specialization?.name ?? doctor?.specialty ?? "—"} disabled />
                      <Field label="Experience (Years)" value={form.experience_years} onChange={(v) => updateField("experience_years", v)} type="number" />
                      <Field label="Online Consultation Fee" value={form.online_consultation_fee} onChange={(v) => updateField("online_consultation_fee", v)} type="number" disabled />
                      <Field label="Clinic Consultation Fee" value={form.clinic_consultation_fee} onChange={(v) => updateField("clinic_consultation_fee", v)} type="number" disabled />
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                        <span>
                          <span className="block text-sm font-semibold text-foreground/80">Show fees on app</span>
                          <span className="block text-xs text-muted-foreground/80">Controls fee visibility in patient app.</span>
                        </span>
                        <input type="checkbox" checked={form.show_fees_on_app} onChange={(e) => updateField("show_fees_on_app", e.target.checked)} className="h-4 w-4 accent-primary" />
                      </label>
                      <label className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                        <span>
                          <span className="block text-sm font-semibold text-foreground/80">Visible on app</span>
                          <span className="block text-xs text-muted-foreground/80">Controls doctor search visibility.</span>
                        </span>
                        <input type="checkbox" checked={form.visible_on_app} onChange={(e) => updateField("visible_on_app", e.target.checked)} className="h-4 w-4 accent-primary" />
                      </label>
                    </div>
                  </SectionCard>
                </div>

                <SectionCard
                  title="Clinic Information"
                  description="Registered clinic location and practice information."
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label="Clinic Name"
                      value={form.clinic_name}
                      onChange={(v) => updateField("clinic_name", v)}
                    />

                    {/* State */}
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        State
                      </span>

                      <select
                        value={form.state_id}
                        onChange={(e) => {
                          const stateId = e.target.value;

                          updateField("state_id", stateId);

                          // Reset district and city when state changes
                          updateField("district_id", "");
                          updateField("city_id", "");
                        }}
                        disabled={registrationLookupsQuery.isLoading}
                        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground/80 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground/80"
                      >
                        <option value="">
                          {registrationLookupsQuery.isLoading
                            ? "Loading states..."
                            : "Select State"}
                        </option>

                        {states.map((state: any) => (
                          <option key={state.id} value={String(state.id)}>
                            {state.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* District */}
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        District
                      </span>

                      <select
                        value={form.district_id}
                        onChange={(e) => {
                          updateField("district_id", e.target.value);

                          // Reset city when district changes
                          updateField("city_id", "");
                        }}
                        disabled={
                          !form.state_id ||
                          registrationLookupsQuery.isLoading
                        }
                        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground/80 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground/80"
                      >
                        <option value="">
                          {!form.state_id
                            ? "Select state first"
                            : registrationLookupsQuery.isLoading
                              ? "Loading districts..."
                              : filteredDistricts.length
                                ? "Select District"
                                : "No districts available"}
                        </option>

                        {filteredDistricts.map((district: any) => (
                          <option
                            key={district.id}
                            value={String(district.id)}
                          >
                            {district.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* City */}
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        City
                      </span>

                      <select
                        value={form.city_id}
                        onChange={(e) =>
                          updateField("city_id", e.target.value)
                        }
                        disabled={
                          !form.district_id ||
                          registrationLookupsQuery.isLoading
                        }
                        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground/80 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground/80"
                      >
                        <option value="">
                          {!form.district_id
                            ? "Select district first"
                            : registrationLookupsQuery.isLoading
                              ? "Loading cities..."
                              : filteredCities.length
                                ? "Select City"
                                : "No cities available"}
                        </option>

                        {filteredCities.map((city: any) => (
                          <option
                            key={city.id}
                            value={String(city.id)}
                          >
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* Address */}
                    <Field
                      label="Clinic Address"
                      value={form.address_line}
                      onChange={(v) => updateField("address_line", v)}
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Locked Fields" description="Sensitive identity identifiers are masked and not editable after approval.">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Field label="Aadhaar Number" value={doctor?.aadhaar ?? doctor?.aadhaar_masked ?? "XXXX-XXXX-3456"} disabled />
                    <Field label="ABHA ID" value={doctor?.abha ?? doctor?.abha_masked ?? "XX-XXXX-XXXX-0001"} disabled />
                    <Field label="HP-ID" value={doctor?.hpid ?? doctor?.hpid_masked ?? "HP-XXXX-7842"} disabled />
                  </div>
                </SectionCard>

                <SectionCard title="Doctor Bio" description="Short profile description shown to patients.">
                  <textarea
                    rows={5}
                    value={form.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    className="w-full resize-none rounded-md border border-border px-3 py-2.5 text-sm text-foreground/80 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="Doctor bio..."
                  />
                </SectionCard>

                <div className="sticky bottom-0 z-30 -mx-5 mt-5 border-t border-border bg-white/95 px-5 py-3 backdrop-blur-sm">

                  <div className="flex items-center justify-between gap-3">

                    <div className="hidden sm:block">
                      <p className="text-xs font-medium text-foreground/80">
                        Profile changes
                      </p>

                      <p className="text-xs text-muted-foreground/80">
                        Save the updated doctor information.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => void handleSave()}
                      disabled={saveDoctor.isPending}
                      className="ml-auto min-w-[140px] cursor-pointer"
                    >
                      {saveDoctor.isPending ? (
                        <RefreshCw className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 size-4" />
                      )}

                      {saveDoctor.isPending
                        ? "Saving..."
                        : "Save Changes"}
                    </Button>

                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENTS */}
            {activeTab === "Documents" && (
              <SectionCard title="Uploaded Documents" description="Verification documents attached to this doctor profile.">
                {documents.length ? (
                  <div className="space-y-3">
                    {documents.map((doc: any, index: number) => {
                      const url = doc.url ?? doc.document_url ?? doc.file_url ?? null;
                      const title = doc.title ?? doc.document_name ?? doc.type_label ?? doc.type ?? `Document ${index + 1}`;
                      const size = doc.file_size_label ?? doc.size_label ?? (doc.file_size ? `${doc.file_size}` : "");
                      const uploaded = doc.uploaded_at ?? doc.created_at;
                      return (
                        <div key={doc.id ?? index} className="flex flex-col gap-4 rounded-xl border border-border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FileText className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                              <p className="mt-1 text-xs text-muted-foreground/80">
                                {uploaded ? `Uploaded ${dateTimeLabel(uploaded)}` : "Uploaded document"}
                                {doc.mime_type ? ` · ${doc.mime_type}` : ""}
                                {size ? ` · ${size}` : ""}
                              </p>
                              {doc.is_mandatory ? <p className="mt-1 text-xs font-medium text-success">✓ Mandatory document</p> : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {url ? (
                              <>
                                <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground/80 hover:bg-muted/50">
                                  <Eye className="mr-1.5 size-4" /> View
                                </a>
                                <a href={url} target="_blank" rel="noreferrer" download className="inline-flex h-8 items-center px-2 text-xs font-semibold text-primary hover:underline">
                                  <Download className="mr-1.5 size-4" /> Download
                                </a>
                              </>
                            ) : (
                              <span className="inline-flex h-8 items-center rounded-md border border-border bg-muted px-3 text-xs font-semibold text-muted-foreground/80">
                                View unavailable
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState icon={<FileText className="size-5" />} title="No documents available" text="No document records were returned by the doctor-detail API." />
                )}
              </SectionCard>
            )}

            {/* AVAILABILITY */}
            {activeTab === "Availability Config" && (
              <div className="space-y-4">
                <SectionCard title="Weekly Schedule" description="Current generated consultation sessions for this doctor.">
                  {scheduleQuery.isLoading ? (
                    <LoadingRow text="Loading weekly schedule..." />
                  ) : weeklyRows.length ? (
                    <div className="space-y-2">
                      {weeklyRows.map((row: any) => (
                        <div
                          key={row.dayIndex}
                          className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/50 px-4 py-3 sm:flex-row sm:items-center"
                        >
                          {/* DAY */}
                          <div className="w-24 shrink-0">
                            <span className="text-sm font-semibold text-foreground">
                              {row.day.slice(0, 3)}
                            </span>
                          </div>

                          {/* SCHEDULE */}
                          <div className="min-w-0 flex-1">
                            {row.sessions.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-2">
                                {row.sessions.map((session: any, index: number) => (
                                  <div
                                    key={session.id ?? index}
                                    className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2"
                                  >
                                    <span className="text-sm font-medium text-foreground/80">
                                      {timeLabel(session.start_time)}
                                      <span className="mx-1.5 text-muted-foreground/80">–</span>
                                      {timeLabel(session.end_time)}
                                    </span>

                                    {session.consult_type && (
                                      <span className="ml-2 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                        {session.consult_type === "offline"
                                          ? "Clinic"
                                          : session.consult_type}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground/80">
                                Not available
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={<CalendarDays className="size-5" />} title="No schedule returned" text="The schedule endpoint did not return any weekly sessions." />
                  )}
                </SectionCard>
              </div>
            )}

            {/* APPOINTMENTS */}
            {activeTab === "Appointments" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-card shadow-sm">
                  <div className="border-b border-border/60 px-5 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">

                      <div>
                        <h2 className="text-base font-semibold text-foreground">
                          Appointment Filters
                        </h2>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Filter this doctor's appointments by status and date.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">

                        <select
                          value={appointmentStatus}
                          onChange={(e) => {
                            setAppointmentStatus(e.target.value);
                            setAppointmentPage(1);
                          }}
                          className="h-9 min-w-[145px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                        >
                          <option value="">All statuses</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no_show">No-show</option>
                          <option value="unresolved">Unresolved</option>
                        </select>

                        <input
                          type="date"
                          value={appointmentStart}
                          max={appointmentEnd || undefined}
                          onChange={(e) => {
                            setAppointmentStart(e.target.value);
                            setAppointmentPage(1);
                          }}
                          className="h-9 rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                        />

                        <input
                          type="date"
                          value={appointmentEnd}
                          min={appointmentStart || undefined}
                          onChange={(e) => {
                            setAppointmentEnd(e.target.value);
                            setAppointmentPage(1);
                          }}
                          className="h-9 rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 gap-1.5 px-3 text-xs"
                          disabled={appointmentsQuery.isFetching}
                          onClick={() => {
                            if (
                              appointmentStart &&
                              appointmentEnd &&
                              appointmentStart > appointmentEnd
                            ) {
                              return;
                            }

                            setAppliedAppointmentStatus(
                              appointmentStatus,
                            );

                            setAppliedAppointmentStart(
                              appointmentStart,
                            );

                            setAppliedAppointmentEnd(
                              appointmentEnd,
                            );

                            setAppointmentPage(1);
                          }}
                        >
                          <RefreshCw
                            className={
                              appointmentsQuery.isFetching
                                ? "size-3.5 animate-spin"
                                : "size-3.5"
                            }
                          />

                          {appointmentsQuery.isFetching
                            ? "Loading..."
                            : "Filter"}
                        </Button>

                        {(appointmentStatus ||
                          appointmentStart ||
                          appointmentEnd) && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-9 px-3 text-xs"
                              disabled={appointmentsQuery.isFetching}
                              onClick={() => {
                                setAppointmentStatus("");
                                setAppointmentStart("");
                                setAppointmentEnd("");

                                setAppliedAppointmentStatus("");
                                setAppliedAppointmentStart("");
                                setAppliedAppointmentEnd("");

                                setAppointmentPage(1);
                              }}
                            >
                              Clear
                            </Button>
                          )}
                      </div>
                    </div>
                  </div>
                </div>

                <SectionCard
                  title="Appointments"
                  description={
                    appointmentsQuery.isLoading
                      ? "Loading appointment records..."
                      : `${appointmentTotal} appointment${appointmentTotal === 1 ? "" : "s"} found`
                  }
                >
                  {appointmentsQuery.isLoading ? (
                    <LoadingRow text="Loading appointments..." />
                  ) : appointmentRows.length ? (
                    <>
                      <div className="overflow-x-auto">
                        <DataTable
                          columns={appointmentColumns}
                          data={appointmentRows}
                          className="mt-0"
                        />
                      </div>

                      <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground/80">
                          Showing{" "}
                          <span className="font-medium text-muted-foreground">
                            {appointmentFrom}
                          </span>
                          {" – "}
                          <span className="font-medium text-muted-foreground">
                            {appointmentTo}
                          </span>
                          {" of "}
                          <span className="font-medium text-muted-foreground">
                            {appointmentTotal}
                          </span>
                        </p>

                        <Pagination
                          currentPage={Number(appointmentCurrentPage)}
                          totalPages={Number(appointmentLastPage)}
                          disabled={appointmentsQuery.isFetching}
                          onPageChange={(nextPage) => {
                            setAppointmentPage(nextPage);
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      icon={<CalendarDays className="size-5" />}
                      title="No appointments found"
                      text="Try changing the status or date range."
                    />
                  )}
                </SectionCard>
              </div>
            )}

            {/* COMMISSION */}
            {activeTab === "Commission" && (
              <>
                <SectionCard title="Commission Model" description="Per-doctor fixed commission overrides returned by the admin API.">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <CommissionCard label="Online Commission" value={commissionForm.online ? money(commissionForm.online) : "—"} active={Boolean(commission?.is_custom)} />
                    <CommissionCard label="Clinic Commission" value={commissionForm.clinic ? money(commissionForm.clinic) : "—"} active={Boolean(commission?.is_custom)} />
                    <CommissionCard label="Configuration" value={commission?.is_custom ? "Custom" : "Default"} active={Boolean(commission?.is_custom)} />
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Online Commission (₹)" value={commissionForm.online} onChange={(v) => setCommissionForm((p) => ({ ...p, online: v }))} type="number" />
                    <Field label="Clinic Commission (₹)" value={commissionForm.clinic} onChange={(v) => setCommissionForm((p) => ({ ...p, clinic: v }))} type="number" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => void handleCommissionSave()} disabled={commissionMutation.isPending} className="h-10 bg-primary px-4 text-sm font-semibold text-white">
                      {commissionMutation.isPending ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                      Save Commission
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 text-xs"
                      disabled={commissionMutation.isPending}
                      onClick={async () => {
                        await commissionMutation.mutateAsync({
                          reset_to_default: true,
                        });

                        await doctorQuery.refetch();
                      }}
                    >
                      Reset to Default
                    </Button>
                  </div>
                </SectionCard>
              </>
            )}

            {/* EARNINGS */}
            {activeTab === "Earnings" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-card shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between p-4">
                    <div>
                      <h2 className="text-md font-semibold text-foreground">
                        Earnings Range
                      </h2>

                      <p className="mt-1 text-xs text-muted-foreground/80">
                        Select a start and end date, then click Filter to load earnings.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="date"
                        value={earningsStart}
                        onChange={(e) => setEarningsStart(e.target.value)}
                        className="h-10 rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none focus:bg-card focus:ring-2 focus:ring-primary/10"
                      />

                      <input
                        type="date"
                        value={earningsEnd}
                        onChange={(e) => setEarningsEnd(e.target.value)}
                        className="h-10 rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none focus:bg-card focus:ring-2 focus:ring-primary/10"
                      />

                      <Button
                        variant="outline"
                        className="h-10 text-xs"
                        disabled={
                          !earningsStart ||
                          !earningsEnd ||
                          earningsQuery.isFetching
                        }
                        onClick={() => {
                          if (!earningsStart || !earningsEnd) {
                            return;
                          }

                          setEarningsPage(1);
                          setAppliedEarningsStart(earningsStart);
                          setAppliedEarningsEnd(earningsEnd);
                        }}
                      >
                        <RefreshCw
                          className={`mr-1.5 h-3.5 w-3.5 ${earningsQuery.isFetching ? "animate-spin" : ""
                            }`}
                        />

                        {earningsQuery.isFetching
                          ? "Loading..."
                          : "Filter"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <EarningMetric
                    label="Gross Earnings"
                    value={money(
                      summary.total_gross ??
                      summary.gross_earnings
                    )}
                  />

                  <EarningMetric
                    label="Platform Commission"
                    value={money(
                      summary.total_commission ??
                      summary.platform_commission
                    )}
                    danger
                  />

                  <EarningMetric
                    label="Net Paid"
                    value={money(
                      summary.total_net ??
                      summary.total_net_paid ??
                      summary.net_paid
                    )}
                    success
                  />
                </div>

                <SectionCard
                  title="Earnings Ledger"
                  description={
                    earningsQuery.isLoading
                      ? "Loading earning records..."
                      : `${Number(earningsTotal)} earning record${Number(earningsTotal) === 1 ? "" : "s"} found`
                  }
                >
                  {earningsQuery.isLoading ? (
                    <LoadingRow text="Loading earnings..." />
                  ) : ledger.length ? (
                    <>
                      <div className="overflow-x-auto">
                        <DataTable
                          columns={earningsColumns}
                          data={ledger}
                          className="mt-0"
                        />
                      </div>

                      <StandardPagination
                        currentPage={Number(earningsCurrentPage)}
                        lastPage={Number(earningsLastPage)}
                        total={Number(earningsTotal)}
                        from={Number(earningsFrom)}
                        to={Number(earningsTo)}
                        onPageChange={setEarningsPage}
                      />
                    </>
                  ) : (
                    <EmptyState
                      icon={<IndianRupee className="size-5" />}
                      title="No earnings records"
                      text="No ledger rows were returned for this doctor and date range."
                    />
                  )}
                </SectionCard>
              </div>
            )}
          </main>


        </div>
      </div>

      {/* ACTION MODALS */}
      {actionModal === "reject" && (
        <Modal
          title="Reject Application"
          icon={<X className="size-6 text-destructive" />}
          description={<>Rejecting <strong>{doctorName}</strong>. A reason is required and will be stored with the application review.</>}
          onClose={() => setActionModal(null)}
        >
          <div className="mt-5">
            <label className="text-sm font-semibold text-destructive">⚠ Reason is mandatory</label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="mt-2 w-full resize-none rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/30"
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" className="h-8 text-xs" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button className="h-10 bg-destructive text-sm text-white hover:bg-destructive/90" disabled={!reason.trim() || rejectMutation.isPending} onClick={() => void handleReject()}>
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </div>
        </Modal>
      )}

      {actionModal === "suspend" && (
        <Modal
          title={
            normalizeStatus(currentStatus) === "suspended"
              ? "Reactivate Doctor Account"
              : "Suspend Doctor Account"
          }
          icon={
            normalizeStatus(currentStatus) === "suspended" ? (
              <div className="flex h-10 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserCheck className="size-4" />
              </div>
            ) : (
              <div className="flex h-10 w-9 items-center justify-center rounded-lg bg-warning-soft text-warning">
                <UserX className="size-4" />
              </div>
            )
          }
          description={
            normalizeStatus(currentStatus) === "suspended" ? (
              <>
                Reactivating{" "}
                <strong className="font-semibold text-foreground/80">
                  {doctorName}
                </strong>{" "}
                will allow the account to log in again.
              </>
            ) : (
              <>
                Suspending{" "}
                <strong className="font-semibold text-foreground/80">
                  {doctorName}
                </strong>{" "}
                will block the account from logging in.
              </>
            )
          }
          onClose={() => {
            setActionModal(null);
            setReason("");
          }}
        >
          {/* Warning / Information */}
          {normalizeStatus(currentStatus) !== "suspended" && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning-soft/70 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />

              <p className="text-xs leading-4.5 text-warning">
                Existing appointments will not be changed by this action.
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
              Reason
              <span className="ml-1 text-destructive">*</span>
            </label>

            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                normalizeStatus(currentStatus) === "suspended"
                  ? "Enter reason for reactivation..."
                  : "Enter reason for suspension..."
              }
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-xs leading-5 text-foreground/80 outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:ring-2 focus:ring-primary/30"
            />

            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-muted-foreground/80">
                A reason is required to continue.
              </p>

              <span className="text-xs text-muted-foreground/80">
                {reason.length} characters
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setActionModal(null);
                setReason("");
              }}
              disabled={statusMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant={
                normalizeStatus(currentStatus) === "suspended"
                  ? "primary"
                  : "warning"
              }
              disabled={!reason.trim() || statusMutation.isPending}
              onClick={() => void handleStatusAction()}
            >
              {statusMutation.isPending
                ? "Saving..."
                : normalizeStatus(currentStatus) === "suspended"
                  ? "Confirm Reactivate"
                  : "Confirm Suspend"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}


function CommissionCard({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-4 text-center ${active ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{label}</p>
      <p className="mt-1.5 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function EarningMetric({ label, value, danger, success }: { label: string; value: string; danger?: boolean; success?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card px-5 py-4 text-center shadow-sm ${success ? "border-success/25" : "border-border"}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${danger ? "text-destructive" : success ? "text-success" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function StandardPagination({
  currentPage,
  lastPage,
  total,
  from,
  to,
  onPageChange,
}: {
  currentPage: number;
  lastPage: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= 0) return null;

  const page = Math.max(1, currentPage || 1);
  const last = Math.max(1, lastPage || 1);

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground/80">
        Showing{" "}
        <span className="font-medium text-muted-foreground">{from}</span>
        {" – "}
        <span className="font-medium text-muted-foreground">{to}</span>
        {" of "}
        <span className="font-medium text-muted-foreground">{total}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="mr-1 size-4" />
          Previous
        </Button>

        <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-foreground px-2 text-xs font-semibold text-white">
          {page}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs"
          disabled={page >= last}
          onClick={() => onPageChange(Math.min(last, page + 1))}
        >
          Next
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}

function LoadingRow({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
      <RefreshCw className="size-4 animate-spin" />
      {text}
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground/80">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-foreground/80">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground/80">{text}</p>
    </div>
  );
}
