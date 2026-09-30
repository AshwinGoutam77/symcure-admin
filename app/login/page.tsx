 "use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, ShieldCheck, Headset, Zap, LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { setAdminTokens } from "@/lib/api/client";
import { loginAdmin } from "@/lib/api/admin";
import { useAdminMutation } from "@/hooks/use-admin-api";

function LoginFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const loginMutation = useAdminMutation(loginAdmin);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const value = login.trim();
    if (!value) return setError("Mobile number or email is required.");
    if (!password) return setError("Password is required.");

    setPending(true);
    try {
      const data: any = await loginMutation.mutateAsync({
        login: value,
        password,
        device_id: `admin-web-${navigator.userAgent.slice(0, 40)}`,
      });
      if (!data?.access_token) throw new Error("Login succeeded but no access token was returned.");
      setAdminTokens(data.access_token, data.refresh_token);
      router.replace(next?.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[1060px] grid overflow-hidden rounded-[28px] bg-card shadow-[0_24px_80px_rgba(15,23,42,0.10)] lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden lg:flex relative overflow-hidden bg-sidebar p-12 text-sidebar-accent-foreground">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-green/25 blur-3xl" />
          <div className="relative z-10 flex flex-col justify-between">
            <div>
              <Image src="/symcure-logo-white.png" alt="Symcure" width={220} height={60} className="h-auto w-[220px]" priority />
              <div className="mt-20 max-w-md">
                <p className="text-xs font-semibold tracking-[0.2em] text-primary">ADMINISTRATION PORTAL</p>
                <h1 className="mt-4 text-4xl font-semibold leading-tight">Secure control for the Symcure platform.</h1>
                <p className="mt-5 text-sm leading-6 text-sidebar-muted">
                  Manage doctors, applications, appointments, patients, finance, master data and platform settings from one protected workspace.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                ["Secure", ShieldCheck],
                ["Fast", Zap],
                ["Support", Headset],
              ].map(([label, Icon]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <div key={label as string} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <I size={19} />
                    <p className="mt-3 text-sm font-medium">{label as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-7 sm:p-10 lg:p-14">
          <div className="mx-auto max-w-md">
            <div className="lg:hidden flex justify-center mb-8">
              <Image src="/symcure-logo.png" alt="Symcure" width={220} height={42} className="h-auto w-[210px]" priority />
            </div>

            <div className="mb-8">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LockKeyhole size={20} />
              </div>
              <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-primary">SECURE ACCESS</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in to continue to the Symcure Admin Panel.</p>
            </div>

            <form onSubmit={submit} className="space-y-5" noValidate>
              <div>
                <label className="text-sm font-medium text-foreground/80">Mobile number</label>
                <input
                type="number"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  autoComplete="username"
                  disabled={pending}
                  placeholder="Enter mobile number"
                  className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-muted/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground/80">Password</label>
                  <span className="text-xs text-muted-foreground/80">Admin credentials</span>
                </div>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={pending}
                    placeholder="Enter password"
                    className="h-12 w-full rounded-xl border border-border bg-card px-4 pr-12 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-muted/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="cursor-pointer absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-muted-foreground/80 hover:text-foreground/80"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </span>
                ) : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginFormPage />
    </Suspense>
  );
}
