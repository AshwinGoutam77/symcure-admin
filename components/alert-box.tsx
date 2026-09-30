import React from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tones";

interface AlertBoxProps {
  type?: "info" | "warning" | "error" | "success";
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  href?: string;
}

const toneFor: Record<NonNullable<AlertBoxProps["type"]>, Tone> = {
  info: "info", warning: "warning", error: "danger", success: "success",
};

const defaultIcons = {
  info: <Info className="size-5" />,
  warning: <AlertTriangle className="size-5" />,
  error: <AlertCircle className="size-5" />,
  success: <CheckCircle2 className="size-5" />,
};

export function AlertBox({ type = "info", title, children, className, icon, href }: AlertBoxProps) {
  const t = toneStyles[toneFor[type]];
  return (
    <div role="alert" className={cn("relative rounded-lg border p-4", t.soft, t.border, className)}>
      <div className="flex gap-3">
        <div className={cn("mt-0.5 shrink-0", t.text)}>{icon || defaultIcons[type]}</div>
        <div className="flex-1">
          {title && <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>}
          <div className="text-sm text-foreground/80">{children}</div>
        </div>
      </div>
      {href && <Link href={href} aria-label={title ?? "Open"} className="absolute inset-0 rounded-lg" />}
    </div>
  );
}
