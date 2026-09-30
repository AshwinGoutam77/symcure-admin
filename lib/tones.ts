/**
 * Semantic tones — the ONE mapping used by StatusBadge, StatCard, AlertBox,
 * charts and attention cards so colour always means the same thing.
 * Class strings are written out in full so Tailwind can detect them.
 */
export type Tone = "primary" | "success" | "warning" | "danger" | "info" | "violet" | "neutral";

export const toneStyles: Record<
  Tone,
  { soft: string; solid: string; text: string; border: string; icon: string; dot: string; hover: string; chart: string }
> = {
  primary: {
    soft: "bg-primary/10", solid: "bg-primary", text: "text-primary", border: "border-primary/25",
    icon: "bg-primary/10 text-primary", dot: "bg-primary", hover: "hover:bg-primary/15", chart: "var(--chart-1)",
  },
  success: {
    soft: "bg-success-soft", solid: "bg-success", text: "text-success", border: "border-success/25",
    icon: "bg-success-soft text-success", dot: "bg-success", hover: "hover:bg-success-soft/70", chart: "var(--chart-2)",
  },
  warning: {
    soft: "bg-warning-soft", solid: "bg-warning", text: "text-warning", border: "border-warning/30",
    icon: "bg-warning-soft text-warning", dot: "bg-warning", hover: "hover:bg-warning-soft/70", chart: "var(--chart-3)",
  },
  danger: {
    soft: "bg-destructive-soft", solid: "bg-destructive", text: "text-destructive", border: "border-destructive/25",
    icon: "bg-destructive-soft text-destructive", dot: "bg-destructive", hover: "hover:bg-destructive-soft/70", chart: "var(--chart-5)",
  },
  info: {
    soft: "bg-info-soft", solid: "bg-info", text: "text-info", border: "border-info/25",
    icon: "bg-info-soft text-info", dot: "bg-info", hover: "hover:bg-info-soft/70", chart: "var(--chart-1)",
  },
  violet: {
    soft: "bg-chart-4/10", solid: "bg-chart-4", text: "text-chart-4", border: "border-chart-4/25",
    icon: "bg-chart-4/10 text-chart-4", dot: "bg-chart-4", hover: "hover:bg-chart-4/15", chart: "var(--chart-4)",
  },
  neutral: {
    soft: "bg-muted", solid: "bg-muted-foreground", text: "text-muted-foreground", border: "border-border",
    icon: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60", hover: "hover:bg-muted/70", chart: "var(--muted-foreground)",
  },
};

/** Map any backend status string to a tone */
const STATUS_TONE: Record<string, Tone> = {
  active: "success", approved: "success", approve: "success", completed: "success", complete: "success",
  success: "success", paid: "success", verified: "success", confirmed: "success", online: "success",
  pending: "warning", submitted: "warning", under_review: "warning", in_progress: "warning",
  warning: "warning", unpaid: "warning", processing: "warning", awaiting: "warning",
  scheduled: "info", upcoming: "info", info: "info", booked: "info",
  rejected: "danger", reject: "danger", cancelled: "danger", canceled: "danger", suspended: "danger",
  failed: "danger", error: "danger", deleted: "danger", no_show: "danger", expired: "danger",
  refunded: "violet",
  inactive: "neutral", draft: "neutral", disabled: "neutral",
};

export function statusTone(status?: string | null): Tone {
  if (!status) return "neutral";
  return STATUS_TONE[String(status).toLowerCase().trim().replace(/[\s-]+/g, "_")] ?? "neutral";
}

/** Ordered categorical chart colours */
export const chartPalette = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)",
];
