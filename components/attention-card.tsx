import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tones";

interface AttentionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  tone?: Extract<Tone, "warning" | "info" | "danger" | "success">;
}

/** Actionable "needs attention" row; tone colour == severity, same meaning as StatusBadge. */
export function AttentionCard({ icon, title, description, href, tone = "warning" }: AttentionCardProps) {
  const t = toneStyles[tone];
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[68px] items-center gap-3 rounded-lg px-4 py-3 transition-colors",
        t.soft, t.border, t.hover,
      )}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-card/70 [&_svg]:size-[18px]", t.text)}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
