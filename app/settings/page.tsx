"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCw, Save, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, InlineError, InlineNotice, LoadingBlock, NoAccess, SwitchRow, textareaClass } from "@/components/admin/kit";
import { getPaymentSettings, getSystemSettings, updatePaymentSettings, updateSystemSettings } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { usePermission } from "@/hooks/use-permission";
import { apiErrorMessage, fieldErrors } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type Tab = "system" | "payment";

function settingsOf(payload: any): Record<string, any> {
  return payload?.settings ?? payload ?? {};
}

function prettyJson(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

const SYSTEM_GROUPS: Array<{
  title: string;
  description: string;
  fields: Array<{ key: string; label: string; type?: string; placeholder?: string }>;
}> = [
  {
    title: "Support",
    description: "Shown to patients and doctors when they need help.",
    fields: [
      { key: "support_email", label: "Support email", type: "email" },
      { key: "support_mobile", label: "Support mobile" },
      { key: "whatsapp_number", label: "WhatsApp number" },
    ],
  },
  {
    title: "Social links",
    description: "Full profile URLs.",
    fields: [
      { key: "social_facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
      { key: "social_instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
      { key: "social_x", label: "X (Twitter)", placeholder: "https://x.com/…" },
      { key: "social_linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/…" },
    ],
  },
  {
    title: "Patient app",
    description: "Store links and the current app version.",
    fields: [
      { key: "play_store_url", label: "Play Store URL" },
      { key: "app_store_url", label: "App Store URL" },
      { key: "patient_app_version", label: "Patient app version", placeholder: "e.g. 1.4.2" },
    ],
  },
];

const PDF_KEY = "default_prescription_pdf_format_setting";
const PAY_NUMBER_KEYS = [
  "default_commission_rate",
  "clinic_consultation_commission_amt",
  "online_consultation_commission_amt",
  "online_free_cancellation_window_hours",
  "online_late_penalty_percent",
] as const;

type PaymentForm = {
  default_commission_rate: string;
  clinic_consultation_commission_amt: string;
  online_consultation_commission_amt: string;
  free_cancellation_window_options: string;
  online_free_cancellation_window_hours: string;
  online_late_penalty_enabled: boolean;
  online_late_penalty_percent: string;
};

export default function SettingsPage() {
  const systemPerm = usePermission("system_settings", "settings");
  const paymentPerm = usePermission("payment_settings", "settings");
  const [tab, setTab] = useState<Tab>("system");

  useEffect(() => {
    if (!systemPerm.loading && !systemPerm.view && paymentPerm.view) setTab("payment");
  }, [systemPerm.loading, systemPerm.view, paymentPerm.view]);

  const systemQuery = useAdminQuery(getSystemSettings, ["admin", "system-settings"], systemPerm.view);
  const paymentQuery = useAdminQuery(getPaymentSettings, ["admin", "payment-settings"], paymentPerm.view);

  const saveSystem = useAdminMutation<Record<string, unknown>, unknown>(updateSystemSettings);
  const savePayment = useAdminMutation<Record<string, unknown>, unknown>(updatePaymentSettings);

  /* ---------------- System ---------------- */
  const [system, setSystem] = useState<Record<string, string>>({});
  const [pdfJson, setPdfJson] = useState("");
  const [systemErrors, setSystemErrors] = useState<Record<string, string>>({});
  const [systemMessage, setSystemMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const s = settingsOf(systemQuery.data);
    const next: Record<string, string> = {};
    SYSTEM_GROUPS.flatMap((g) => g.fields).forEach((f) => {
      next[f.key] = s[f.key] === null || s[f.key] === undefined ? "" : String(s[f.key]);
    });
    setSystem(next);
    setPdfJson(prettyJson(s[PDF_KEY]));
  }, [systemQuery.data]);

  async function handleSaveSystem() {
    setSystemMessage(null);
    setSystemErrors({});
    const body: Record<string, unknown> = {};
    Object.entries(system).forEach(([key, value]) => {
      body[key] = String(value ?? "").trim() || null;
    });
    if (pdfJson.trim()) {
      try {
        const parsed = JSON.parse(pdfJson);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
        body[PDF_KEY] = parsed;
      } catch {
        setSystemErrors({ [PDF_KEY]: 'This must be a valid JSON object, e.g. { "paper_size": "A4" }.' });
        return;
      }
    }
    try {
      await saveSystem.mutateAsync(body);
      setSystemMessage({ ok: true, text: "System settings saved." });
    } catch (error) {
      setSystemErrors(fieldErrors(error));
      setSystemMessage({ ok: false, text: apiErrorMessage(error) });
    }
  }

  /* ---------------- Payment ---------------- */
  const [payment, setPayment] = useState<PaymentForm>({
    default_commission_rate: "",
    clinic_consultation_commission_amt: "",
    online_consultation_commission_amt: "",
    free_cancellation_window_options: "",
    online_free_cancellation_window_hours: "",
    online_late_penalty_enabled: false,
    online_late_penalty_percent: "",
  });
  const [windowOptionsWasArray, setWindowOptionsWasArray] = useState(true);
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  const [paymentMessage, setPaymentMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const s = settingsOf(paymentQuery.data);
    const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
    let options = s.free_cancellation_window_options;
    if (typeof options === "string") {
      try {
        const parsed = JSON.parse(options);
        if (Array.isArray(parsed)) options = parsed;
      } catch {
        /* plain comma list */
      }
    }
    setWindowOptionsWasArray(Array.isArray(options) || options === undefined || options === null);
    const penalty = s.online_late_penalty_enabled;
    setPayment({
      default_commission_rate: str(s.default_commission_rate),
      clinic_consultation_commission_amt: str(s.clinic_consultation_commission_amt),
      online_consultation_commission_amt: str(s.online_consultation_commission_amt),
      free_cancellation_window_options: Array.isArray(options) ? options.join(", ") : str(options),
      online_free_cancellation_window_hours: str(s.online_free_cancellation_window_hours),
      online_late_penalty_enabled: penalty === true || penalty === 1 || penalty === "1" || penalty === "true",
      online_late_penalty_percent: str(s.online_late_penalty_percent),
    });
  }, [paymentQuery.data]);

  function setPay<K extends keyof PaymentForm>(key: K, value: PaymentForm[K]) {
    setPayment((p) => ({ ...p, [key]: value }));
    setPaymentErrors((e) => ({ ...e, [key]: "" }));
  }

  async function handleSavePayment() {
    setPaymentMessage(null);
    const errors: Record<string, string> = {};
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    PAY_NUMBER_KEYS.forEach((key) => {
      const value = payment[key];
      if (value.trim() !== "" && (Number.isNaN(Number(value)) || Number(value) < 0)) errors[key] = "Enter a number of 0 or more.";
    });
    if (payment.online_late_penalty_percent && Number(payment.online_late_penalty_percent) > 100) {
      errors.online_late_penalty_percent = "Can't be more than 100%.";
    }
    const optionList = payment.free_cancellation_window_options
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (optionList.some((v) => Number.isNaN(Number(v)))) {
      errors.free_cancellation_window_options = "Use numbers separated by commas, e.g. 2, 4, 6.";
    }
    setPaymentErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      await savePayment.mutateAsync({
        default_commission_rate: num(payment.default_commission_rate),
        clinic_consultation_commission_amt: num(payment.clinic_consultation_commission_amt),
        online_consultation_commission_amt: num(payment.online_consultation_commission_amt),
        free_cancellation_window_options: windowOptionsWasArray ? optionList.map(Number) : optionList.join(","),
        online_free_cancellation_window_hours: num(payment.online_free_cancellation_window_hours),
        online_late_penalty_enabled: payment.online_late_penalty_enabled,
        online_late_penalty_percent: num(payment.online_late_penalty_percent),
      });
      setPaymentMessage({ ok: true, text: "Payment settings saved. New appointments use these defaults." });
    } catch (error) {
      setPaymentErrors(fieldErrors(error));
      setPaymentMessage({ ok: false, text: apiErrorMessage(error) });
    }
  }

  if (!systemPerm.loading && !systemPerm.view && !paymentPerm.view) return <NoAccess />;

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode; visible: boolean }> = [
    { key: "system", label: "System settings", icon: <Settings2 className="size-4" />, visible: systemPerm.view },
    { key: "payment", label: "Payment settings", icon: <CreditCard className="size-4" />, visible: paymentPerm.view },
  ];

  const loading = tab === "system" ? systemQuery.isLoading : paymentQuery.isLoading;
  const loadError = tab === "system" ? systemQuery.error : paymentQuery.error;
  const canEdit = tab === "system" ? systemPerm.edit : paymentPerm.edit;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Settings" }]}
        title="Settings"
        description="Platform-wide defaults. Changes apply immediately."
        actions={
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-1.5 text-xs"
            onClick={() => void (tab === "system" ? systemQuery.refetch() : paymentQuery.refetch())}
          >
            <RefreshCw className="size-4" /> Reload
          </Button>
        }
      />

      <div className="mb-5 flex gap-1 border-b border-border/60">
        {tabs
          .filter((t) => t.visible)
          .map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition",
                tab === t.key ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.icon}
              {t.label}
              {tab === t.key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
      </div>

      {!canEdit && !loading && <InlineNotice className="mb-4">Your role can view these settings but not change them.</InlineNotice>}

      {loading ? (
        <LoadingBlock label="Loading settings…" />
      ) : loadError ? (
        <InlineError>{apiErrorMessage(loadError)}</InlineError>
      ) : tab === "system" ? (
        <div className="space-y-5">
          {SYSTEM_GROUPS.map((group) => (
            <SectionCard key={group.title} title={group.title} description={group.description}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.fields.map((field) => (
                  <FormField key={field.key} label={field.label} error={systemErrors[field.key]}>
                    <Input
                      type={field.type ?? "text"}
                      value={system[field.key] ?? ""}
                      placeholder={field.placeholder}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSystem((s) => ({ ...s, [field.key]: value }));
                        setSystemErrors((er) => ({ ...er, [field.key]: "" }));
                      }}
                      className="h-9 text-sm"
                    />
                  </FormField>
                ))}
              </div>
            </SectionCard>
          ))}

          <SectionCard
            title="Default prescription PDF format"
            description="JSON object used as the starting PDF layout for new doctors. Saved exactly as entered."
          >
            <FormField label="Format (JSON)" error={systemErrors[PDF_KEY]}>
              <textarea
                value={pdfJson}
                disabled={!canEdit}
                onChange={(e) => {
                  setPdfJson(e.target.value);
                  setSystemErrors((er) => ({ ...er, [PDF_KEY]: "" }));
                }}
                spellCheck={false}
                className={cn(textareaClass, "min-h-[220px] font-mono text-xs")}
              />
            </FormField>
          </SectionCard>

          {systemMessage &&
            (systemMessage.ok ? <InlineNotice tone="success">{systemMessage.text}</InlineNotice> : <InlineError>{systemMessage.text}</InlineError>)}
          {canEdit && (
            <div className="flex justify-end">
              <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={() => void handleSaveSystem()} disabled={saveSystem.isPending}>
                {saveSystem.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save system settings
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <SectionCard title="Commission" description="Platform defaults. Doctors with a custom commission keep their own amounts.">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Default commission rate (%)" error={paymentErrors.default_commission_rate}>
                <Input type="number" min={0} step="0.01" value={payment.default_commission_rate} disabled={!canEdit} onChange={(e) => setPay("default_commission_rate", e.target.value)} className="h-9 text-sm" />
              </FormField>
              <FormField label="Clinic consultation commission (₹)" error={paymentErrors.clinic_consultation_commission_amt}>
                <Input type="number" min={0} value={payment.clinic_consultation_commission_amt} disabled={!canEdit} onChange={(e) => setPay("clinic_consultation_commission_amt", e.target.value)} className="h-9 text-sm" />
              </FormField>
              <FormField label="Online consultation commission (₹)" error={paymentErrors.online_consultation_commission_amt}>
                <Input type="number" min={0} value={payment.online_consultation_commission_amt} disabled={!canEdit} onChange={(e) => setPay("online_consultation_commission_amt", e.target.value)} className="h-9 text-sm" />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="Cancellation" description="How long before an appointment patients can cancel for free.">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Free cancellation window options (hours)"
                hint="Choices doctors can pick from, comma separated."
                error={paymentErrors.free_cancellation_window_options}
              >
                <Input value={payment.free_cancellation_window_options} placeholder="2, 4, 6, 12, 24" disabled={!canEdit} onChange={(e) => setPay("free_cancellation_window_options", e.target.value)} className="h-9 text-sm" />
              </FormField>
              <FormField label="Online free cancellation window (hours)" error={paymentErrors.online_free_cancellation_window_hours}>
                <Input type="number" min={0} value={payment.online_free_cancellation_window_hours} disabled={!canEdit} onChange={(e) => setPay("online_free_cancellation_window_hours", e.target.value)} className="h-9 text-sm" />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="Late cancellation penalty" description="Applied to online appointments cancelled after the free window.">
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <SwitchRow
                label="Charge a late cancellation penalty"
                checked={payment.online_late_penalty_enabled}
                disabled={!canEdit}
                onChange={(v) => setPay("online_late_penalty_enabled", v)}
              />
              <FormField label="Penalty (%)" error={paymentErrors.online_late_penalty_percent}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={payment.online_late_penalty_percent}
                  disabled={!canEdit || !payment.online_late_penalty_enabled}
                  onChange={(e) => setPay("online_late_penalty_percent", e.target.value)}
                  className="h-9 text-sm"
                />
              </FormField>
            </div>
          </SectionCard>

          {paymentMessage &&
            (paymentMessage.ok ? <InlineNotice tone="success">{paymentMessage.text}</InlineNotice> : <InlineError>{paymentMessage.text}</InlineError>)}
          {canEdit && (
            <div className="flex justify-end">
              <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={() => void handleSavePayment()} disabled={savePayment.isPending}>
                {savePayment.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save payment settings
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
