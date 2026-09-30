import React from "react";
import { cn } from "@/lib/utils";
import { formatLabel } from "@/lib/formatters";
import { statusTone, toneStyles, type Tone } from "@/lib/tones";

interface StatusBadgeProps {
  /** Any backend status string (active, pending, under_review, cancelled…) */
  status?: string | null;
  /** Force a tone instead of inferring it from `status` */
  tone?: Tone;
  /** Defaults to the humanised status */
  children?: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ status, tone, children, dot = true, className }: StatusBadgeProps) {
  const t = toneStyles[tone ?? statusTone(status)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        t.soft, t.text, t.border, className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", t.dot)} aria-hidden />}
      {children ?? formatLabel(status)}
    </span>
  );
}
