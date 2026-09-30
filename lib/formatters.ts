/**
 * Shared formatters. Import from here — do not re-declare per page.
 * Locale: en-IN, currency: INR.
 */

const isBlank = (v: unknown) => v === null || v === undefined || v === "";

function toDate(value: unknown): Date | null {
  if (isBlank(value)) return null;
  const str = String(value).trim();
  // Date-only strings are local calendar dates: avoid the UTC shift of new Date("2025-03-05")
  const dateOnly = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  // "YYYY-MM-DD HH:mm:ss" (MySQL style) -> ISO
  const d = new Date(/^\d{4}-\d{2}-\d{2} \d/.test(str) ? str.replace(" ", "T") : str);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: unknown) {
  const d = toDate(value);
  if (!d) return isBlank(value) ? "—" : String(value);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatTime(value: unknown) {
  const d = toDate(value);
  if (!d) return isBlank(value) ? "—" : String(value);
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .format(d)
    .replace(/\b(am|pm)\b/gi, (m) => m.toLowerCase());
}

export function formatDateTime(value: unknown) {
  if (isBlank(value)) return "—";
  return `${formatDate(value)}, ${formatTime(value)}`;
}

/** "12 Mar" — compact axis/label date */
export function formatShortDate(value: unknown) {
  const d = toDate(value);
  if (!d) return isBlank(value) ? "—" : String(value);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(d);
}

export function formatNumber(value: unknown) {
  if (isBlank(value)) return "0";
  const n = Number(value);
  return Number.isNaN(n) ? String(value) : new Intl.NumberFormat("en-IN").format(n);
}

/** 12,400 -> "12.4K" style (en-IN gives K / L / Cr) */
export function formatCompact(value: unknown) {
  const n = Number(value);
  if (isBlank(value) || Number.isNaN(n)) return "0";
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatMoney(value: unknown, opts: { decimals?: boolean } = {}) {
  if (isBlank(value)) return "₹0";
  const n = Number(value);
  if (Number.isNaN(n)) return `₹${value}`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  }).format(n);
}

export function formatCompactMoney(value: unknown) {
  return `₹${formatCompact(value)}`;
}

export function formatPercent(value: unknown, digits = 0) {
  const n = Number(value);
  if (isBlank(value) || Number.isNaN(n)) return "0%";
  return `${n.toFixed(digits)}%`;
}

/** snake_case / kebab-case -> "Title Case" */
export function formatLabel(value?: unknown) {
  if (isBlank(value)) return "—";
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getInitials(name?: string | null, fallback = "—") {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || fallback
  );
}

/** % change between two numbers; null when not computable */
export function pctChange(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
