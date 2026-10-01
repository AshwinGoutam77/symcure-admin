"use client";

import { useEffect, useState } from "react";
import {
  HardDrive,
  Lock,
  RefreshCw,
  Save,
  Settings2,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  getSystemSettings,
  getPaymentSettings,
  getAppSettings,
  updateSystemSettings,
  updatePaymentSettings,
  updateAppSettings,
} from "@/lib/api/admin";

import {
  useAdminMutation,
  useAdminQuery,
} from "@/hooks/use-admin-api";

export default function SettingsPage() {
  /* ---------------------------------------------------------------------- */
  /* Queries                                                                */
  /* ---------------------------------------------------------------------- */

  const system = useAdminQuery(
    getSystemSettings,
    ["admin", "system-settings"],
  );

  const payment = useAdminQuery(
    getPaymentSettings,
    ["admin", "payment-settings"],
  );

  const app = useAdminQuery(
    getAppSettings,
    ["admin", "app-settings"],
  );

  /* ---------------------------------------------------------------------- */
  /* Mutations                                                              */
  /* ---------------------------------------------------------------------- */

  const saveSystem =
    useAdminMutation<
      Record<string, unknown>,
      unknown
    >(updateSystemSettings);

  const savePayment =
    useAdminMutation<
      Record<string, unknown>,
      unknown
    >(updatePaymentSettings);

  const saveApp =
    useAdminMutation<string, unknown>(
      updateAppSettings,
    );

  /* ---------------------------------------------------------------------- */
  /* Forms                                                                  */
  /* ---------------------------------------------------------------------- */

  const [systemForm, setSystemForm] =
    useState<Record<string, string>>({});

  const [paymentForm, setPaymentForm] =
    useState<Record<string, string>>({});

  const [appVersion, setAppVersion] =
    useState("");

  /* ---------------------------------------------------------------------- */
  /* Populate forms                                                         */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    setSystemForm(
      ((system.data as any)?.settings ??
        {}) as Record<string, string>,
    );
  }, [system.data]);

  useEffect(() => {
    setPaymentForm(
      ((payment.data as any)?.settings ??
        {}) as Record<string, string>,
    );
  }, [payment.data]);

  useEffect(() => {
    setAppVersion(
      String(
        (app.data as any)?.settings
          ?.patient_app_version ?? "",
      ),
    );
  }, [app.data]);

  /* ---------------------------------------------------------------------- */
  /* Refresh                                                                */
  /* ---------------------------------------------------------------------- */

  function refreshAll() {
    void system.refetch();
    void payment.refetch();
    void app.refetch();
  }

  /* ---------------------------------------------------------------------- */
  /* Save handlers                                                          */
  /* ---------------------------------------------------------------------- */

  async function handleSaveSystem() {
    try {
      await saveSystem.mutateAsync(
        systemForm,
      );

      void system.refetch();
    } catch {
      // Error displayed through saveSystem.error.
    }
  }

  async function handleSavePayment() {
    try {
      await savePayment.mutateAsync(
        paymentForm,
      );

      void payment.refetch();
    } catch {
      // Error displayed through savePayment.error.
    }
  }

  async function handleSaveAppVersion() {
    try {
      await saveApp.mutateAsync(
        appVersion,
      );

      void app.refetch();
    } catch {
      // Error displayed through saveApp.error.
    }
  }

  const isRefreshing =
    system.isLoading ||
    payment.isLoading ||
    app.isLoading;

  const hasError =
    system.error ||
    payment.error ||
    app.error ||
    saveSystem.error ||
    savePayment.error ||
    saveApp.error;

  return (
    <div className="w-full">
      <div className="space-y-5">

        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}

        <PageHeader
          breadcrumbs={[
            { label: "Administration" },
            { label: "Settings" },
          ]}
          title="Platform Settings"
          description="Manage system, payment and application configuration from the Admin API."
          className="mb-0"
        />

        {/* ---------------------------------------------------------------- */}
        {/* Global Error                                                      */}
        {/* ---------------------------------------------------------------- */}

        {hasError && (
          <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3">
            <p className="text-xs font-semibold text-destructive">
              Unable to update settings
            </p>

            <p className="mt-1 text-xs text-destructive">
              {(
                system.error ||
                payment.error ||
                app.error ||
                saveSystem.error ||
                savePayment.error ||
                saveApp.error
              )?.message ??
                "Something went wrong. Please try again."}
            </p>
          </div>
        )}

        <div className="mt-5"></div>

        {/* ---------------------------------------------------------------- */}
        {/* System Settings                                                  */}
        {/* ---------------------------------------------------------------- */}

        <SettingsSection
          icon={<Lock className="size-4" />}
          title="System Settings"
          description="Configure support and communication details used across the platform."
          action={
            <Button
              type="button"
              onClick={() =>
                void handleSaveSystem()
              }
              disabled={
                saveSystem.isPending ||
                system.isLoading
              }
              className="h-9 rounded-lg px-4 text-xs font-semibold"
            >
              {saveSystem.isPending ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  Save Changes
                </>
              )}
            </Button>
          }
        >
          {system.isLoading ? (
            <SettingsLoading />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingInput
                label="Support Email"
                value={
                  systemForm.support_email ??
                  ""
                }
                onChange={(value) =>
                  setSystemForm((current) => ({
                    ...current,
                    support_email: value,
                  }))
                }
              />

              <SettingInput
                label="Support Mobile"
                value={
                  systemForm.support_mobile ??
                  ""
                }
                onChange={(value) =>
                  setSystemForm((current) => ({
                    ...current,
                    support_mobile: value,
                  }))
                }
              />

              <SettingInput
                label="WhatsApp Number"
                value={
                  systemForm.whatsapp_number ??
                  ""
                }
                onChange={(value) =>
                  setSystemForm((current) => ({
                    ...current,
                    whatsapp_number: value,
                  }))
                }
              />
            </div>
          )}
        </SettingsSection>

        {/* ---------------------------------------------------------------- */}
        {/* Application Settings                                             */}
        {/* ---------------------------------------------------------------- */}

        <SettingsSection
          icon={<Settings2 className="size-4" />}
          title="Application Settings"
          description="Manage application-level configuration exposed to the platform."
          action={
            <Button
              type="button"
              onClick={() =>
                void handleSaveAppVersion()
              }
              disabled={
                saveApp.isPending ||
                app.isLoading
              }
              className="h-9 rounded-lg px-4 text-xs font-semibold"
            >
              {saveApp.isPending ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  Save App Version
                </>
              )}
            </Button>
          }
        >
          {app.isLoading ? (
            <SettingsLoading />
          ) : (
            <div className="max-w-md">
              <SettingInput
                label="Patient App Version"
                value={appVersion}
                onChange={setAppVersion}
                placeholder="e.g. 1.0.0"
              />
            </div>
          )}
        </SettingsSection>

        {/* ---------------------------------------------------------------- */}
        {/* Payment Settings                                                 */}
        {/* ---------------------------------------------------------------- */}

        <SettingsSection
          icon={<span className="text-xs font-bold">₹</span>}
          title="Payment & Commission Defaults"
          description="Configure the default commission values used for consultation payments."
          action={
            <Button
              type="button"
              onClick={() =>
                void handleSavePayment()
              }
              disabled={
                savePayment.isPending ||
                payment.isLoading
              }
              className="h-9 rounded-lg px-4 text-xs font-semibold"
            >
              {savePayment.isPending ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  Save Changes
                </>
              )}
            </Button>
          }
        >
          {payment.isLoading ? (
            <SettingsLoading />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SettingInput
                label="Default Commission Rate %"
                value={
                  paymentForm.default_commission_rate ??
                  ""
                }
                onChange={(value) =>
                  setPaymentForm((current) => ({
                    ...current,
                    default_commission_rate:
                      value,
                  }))
                }
                type="number"
              />

              <SettingInput
                label="Clinic Commission Amount ₹"
                value={
                  paymentForm
                    .clinic_consultation_commission_amt ??
                  ""
                }
                onChange={(value) =>
                  setPaymentForm((current) => ({
                    ...current,
                    clinic_consultation_commission_amt:
                      value,
                  }))
                }
                type="number"
              />

              <SettingInput
                label="Online Commission Amount ₹"
                value={
                  paymentForm
                    .online_consultation_commission_amt ??
                  ""
                }
                onChange={(value) =>
                  setPaymentForm((current) => ({
                    ...current,
                    online_consultation_commission_amt:
                      value,
                  }))
                }
                type="number"
              />
            </div>
          )}
        </SettingsSection>

        {/* ---------------------------------------------------------------- */}
        {/* Platform Information                                             */}
        {/* ---------------------------------------------------------------- */}

        <section className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                <HardDrive className="size-4 text-primary" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Platform Information
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Current platform architecture and security configuration.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <Info
              label="API"
              value="/api/v1"
            />

            <Info
              label="Authentication"
              value="HttpOnly admin session"
            />

            <Info
              label="Authorization"
              value="Server-side RBAC"
            />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Footer                                                           */}
        {/* ---------------------------------------------------------------- */}

        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground/80">
          <span>
            Platform configuration
          </span>

          <Button
            type="button"
            variant="ghost"
            onClick={refreshAll}
            disabled={isRefreshing}
            className="h-8 px-2 text-xs"
          >
            <RefreshCw
              className={[
                "mr-1.5 size-3.5",
                isRefreshing &&
                  "animate-spin",
              ]
                .filter(Boolean)
                .join(" ")}
            />
            Refresh data
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Settings Section                                                           */
/* -------------------------------------------------------------------------- */

function SettingsSection({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {title}
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground/80">
              {description}
            </p>
          </div>
        </div>

        {action}
      </div>

      <div className="px-5 py-5">
        {children}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Setting Input                                                              */
/* -------------------------------------------------------------------------- */

function SettingInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </label>

      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-9 rounded-lg border-border text-xs shadow-none"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Info                                                                       */
/* -------------------------------------------------------------------------- */

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

function SettingsLoading() {
  return (
    <div className="flex min-h-[100px] items-center justify-center">
      <div className="text-center">
        <RefreshCw className="mx-auto size-5 animate-spin text-primary" />

        <p className="mt-2 text-xs text-muted-foreground">
          Loading settings...
        </p>
      </div>
    </div>
  );
}