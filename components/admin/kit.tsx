"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Lock, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";
import { cn } from "@/lib/utils";
import type { ListResult } from "@/lib/list";

/* ------------------------------------------------------------------ */
/* Form primitives                                                     */
/* ------------------------------------------------------------------ */

export const selectClass =
  "h-9 w-full rounded-md border border-border bg-muted/50 px-3 text-xs text-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60 disabled:cursor-not-allowed disabled:opacity-60";

export const filterSelectClass =
  "h-9 min-w-[140px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60";

export const textareaClass =
  "min-h-[96px] w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60 disabled:opacity-60";

export function FormField({
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function SwitchRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-xs font-medium text-foreground">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
          checked ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-card shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function InlineError({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <div className={cn("rounded-md border border-destructive/25 bg-destructive-soft px-3 py-2 text-xs text-destructive", className)}>
      {children}
    </div>
  );
}

export function InlineNotice({
  children,
  tone = "info",
  className,
}: {
  children?: React.ReactNode;
  tone?: "info" | "warning" | "success";
  className?: string;
}) {
  if (!children) return null;
  const styles = {
    info: "border-info/25 bg-info-soft text-info",
    warning: "border-warning/30 bg-warning-soft text-warning",
    success: "border-success/25 bg-success-soft text-success",
  }[tone];
  return <div className={cn("rounded-md border px-3 py-2 text-xs", styles, className)}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Modal + confirm                                                     */
/* ------------------------------------------------------------------ */

export function AdminModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  busy,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  busy?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const width = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn("flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl", width)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "destructive",
  busy,
  error,
  children,
  confirmDisabled,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: "destructive" | "default";
  busy?: boolean;
  error?: React.ReactNode;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
}) {
  return (
    <AdminModal
      open={open}
      onClose={onClose}
      busy={busy}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          {tone === "destructive" && (
            <span className="flex size-7 items-center justify-center rounded-full bg-destructive-soft text-destructive">
              <AlertTriangle className="size-4" />
            </span>
          )}
          {title}
        </span>
      }
      footer={
        <>
          <Button type="button" variant="outline" className="h-9 text-xs" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={tone === "destructive" ? "destructive" : "default"}
            className="h-9 text-xs"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy && <RefreshCw className="mr-1.5 size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children}
      <InlineError>{error}</InlineError>
    </AdminModal>
  );
}

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-[280px]", className)}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 border-border bg-muted/50 pl-9 pr-9 text-xs focus:bg-card"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Card that wraps a list: title + count on the left, filters on the right, table body, pagination footer. */
export function ListCard({
  title,
  subtitle,
  filters,
  error,
  children,
  footer,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  filters?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-card">
      <div className="border-b border-border/60 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground/80">{subtitle}</p>}
          </div>
          {filters && <div className="flex w-full flex-col flex-wrap gap-2 sm:flex-row lg:w-auto lg:justify-end">{filters}</div>}
        </div>
      </div>
      {error && <div className="border-b border-destructive/25 bg-destructive-soft px-5 py-3 text-xs text-destructive">{error}</div>}
      <div className="overflow-x-auto px-5 py-4">{children}</div>
      {footer}
    </section>
  );
}

export function ListFooter({
  list,
  onPageChange,
  disabled,
}: {
  list: Pick<ListResult, "from" | "to" | "total" | "currentPage" | "lastPage">;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (!list.total) return null;
  return (
    <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground/80">
        Showing <span className="font-medium text-muted-foreground">{list.from}</span>
        {" – "}
        <span className="font-medium text-muted-foreground">{list.to}</span>
        {" of "}
        <span className="font-medium text-muted-foreground">{list.total}</span>
      </p>
      {list.lastPage > 1 && (
        <Pagination currentPage={list.currentPage} totalPages={list.lastPage} disabled={disabled} onPageChange={onPageChange} />
      )}
    </div>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/** Shown in place of a page when the role has no view permission for its menu. */
export function NoAccess({ title = "You don't have access to this page" }: { title?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="size-5" />
        </div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your role doesn&apos;t include this menu. Ask a super admin to grant it in Role Permissions.
        </p>
      </div>
    </div>
  );
}

/** Small icon-less action button used in table action columns. */
export function RowAction({
  children,
  onClick,
  tone = "default",
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        tone === "danger"
          ? "border-destructive/25 text-destructive hover:bg-destructive-soft"
          : "border-border bg-card text-foreground hover:bg-muted/60",
      )}
    >
      {children}
    </button>
  );
}

export function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = React.useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
