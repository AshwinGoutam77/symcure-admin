"use client";

import { useEffect, useState } from "react";
import { KeyRound, RefreshCw, Save, UserRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, InlineError, InlineNotice, LoadingBlock } from "@/components/admin/kit";
import { changeAdminPassword, getAdminMe, updateAdminProfile } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { apiErrorMessage, errorCode, fieldErrors } from "@/lib/api/errors";
import { getInitials } from "@/lib/formatters";

export default function AccountPage() {
  const meQuery = useAdminQuery(getAdminMe, ["admin", "me"]);
  const user: any = meQuery.data?.user ?? {};
  const role: any = meQuery.data?.role ?? {};

  const [profile, setProfile] = useState({ full_name: "", email: "", mobile: "" });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileMessage, setProfileMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [pw, setPw] = useState({ current_password: "", new_password: "", new_password_confirmation: "" });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwMessage, setPwMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!meQuery.data?.user) return;
    setProfile({
      full_name: user.full_name ?? user.name ?? "",
      email: user.email ?? "",
      mobile: user.mobile ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meQuery.data]);

  const profileMutation = useAdminMutation<Record<string, unknown>, unknown>(updateAdminProfile);
  const passwordMutation = useAdminMutation<typeof pw, unknown>(changeAdminPassword);

  async function saveProfile() {
    setProfileMessage(null);
    const errors: Record<string, string> = {};
    if (!profile.full_name.trim()) errors.full_name = "Name is required.";
    if (!/^\d{10}$/.test(profile.mobile.trim())) errors.mobile = "Enter a 10-digit mobile number.";
    if (profile.email && !/^\S+@\S+\.\S+$/.test(profile.email.trim())) errors.email = "Enter a valid email.";
    setProfileErrors(errors);
    if (Object.keys(errors).length) return;
    try {
      await profileMutation.mutateAsync({
        full_name: profile.full_name.trim(),
        email: profile.email.trim() || null,
        mobile: profile.mobile.trim(),
      });
      setProfileMessage({ tone: "success", text: "Profile saved." });
    } catch (error) {
      setProfileErrors(fieldErrors(error));
      setProfileMessage({ tone: "error", text: apiErrorMessage(error) });
    }
  }

  async function savePassword() {
    setPwMessage(null);
    const errors: Record<string, string> = {};
    if (!pw.current_password) errors.current_password = "Enter your current password.";
    if (pw.new_password.length < 8) errors.new_password = "Use at least 8 characters.";
    if (pw.new_password !== pw.new_password_confirmation) errors.new_password_confirmation = "Passwords don't match.";
    setPwErrors(errors);
    if (Object.keys(errors).length) return;
    try {
      await passwordMutation.mutateAsync(pw);
      setPw({ current_password: "", new_password: "", new_password_confirmation: "" });
      setPwMessage({ tone: "success", text: "Password changed. You stay signed in on this device." });
    } catch (error) {
      if (errorCode(error) === "INVALID_CURRENT_PASSWORD") {
        setPwErrors({ current_password: "Your current password is incorrect." });
        return;
      }
      setPwErrors(fieldErrors(error));
      setPwMessage({ tone: "error", text: apiErrorMessage(error) });
    }
  }

  if (meQuery.isLoading) return <LoadingBlock label="Loading your account…" />;

  return (
    <>
      <PageHeader breadcrumbs={[{ label: "My account" }]} title="My account" description="Your own name, contact details and password." />

      <div className="mb-5 flex items-center gap-4 rounded-lg bg-card p-5 shadow-card">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
          {getInitials(profile.full_name || user.full_name, "AD")}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">{user.full_name ?? "Administrator"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge tone={role.is_super_admin ? "violet" : "info"} dot={false}>
              {role.name ?? "Admin"}
            </StatusBadge>
            <span className="text-xs text-muted-foreground">Your role and status can only be changed by a super admin.</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Profile" description="Mobile must be unique among admins." icon={<UserRound className="size-4" />}>
          <div className="space-y-4">
            <FormField label="Full name" required error={profileErrors.full_name}>
              <Input value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} className="h-9 text-sm" />
            </FormField>
            <FormField label="Mobile" required error={profileErrors.mobile}>
              <Input
                value={profile.mobile}
                inputMode="numeric"
                maxLength={10}
                onChange={(e) => setProfile((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, "") }))}
                className="h-9 text-sm"
              />
            </FormField>
            <FormField label="Email" error={profileErrors.email}>
              <Input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} className="h-9 text-sm" />
            </FormField>
            {profileMessage?.tone === "success" ? (
              <InlineNotice tone="success">{profileMessage.text}</InlineNotice>
            ) : (
              <InlineError>{profileMessage?.text}</InlineError>
            )}
            <div className="flex justify-end">
              <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={() => void saveProfile()} disabled={profileMutation.isPending}>
                {profileMutation.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save profile
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Change password" description="You need your current password. No OTP is sent." icon={<KeyRound className="size-4" />}>
          <div className="space-y-4">
            <FormField label="Current password" required error={pwErrors.current_password}>
              <Input
                type="password"
                autoComplete="current-password"
                value={pw.current_password}
                onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))}
                className="h-9 text-sm"
              />
            </FormField>
            <FormField label="New password" required error={pwErrors.new_password} hint="At least 8 characters.">
              <Input
                type="password"
                autoComplete="new-password"
                value={pw.new_password}
                onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))}
                className="h-9 text-sm"
              />
            </FormField>
            <FormField label="Confirm new password" required error={pwErrors.new_password_confirmation}>
              <Input
                type="password"
                autoComplete="new-password"
                value={pw.new_password_confirmation}
                onChange={(e) => setPw((p) => ({ ...p, new_password_confirmation: e.target.value }))}
                className="h-9 text-sm"
              />
            </FormField>
            {pwMessage?.tone === "success" ? <InlineNotice tone="success">{pwMessage.text}</InlineNotice> : <InlineError>{pwMessage?.text}</InlineError>}
            <div className="flex justify-end">
              <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={() => void savePassword()} disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? <RefreshCw className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Change password
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
