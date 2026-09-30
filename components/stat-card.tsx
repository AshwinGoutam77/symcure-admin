import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tones";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/charts/sparkline";

export interface StatTrend {
  /** % change vs previous period */
  value: number | null;
  label?: string;
  /** true when "up" is bad (e.g. cancellations) */
  invert?: boolean;
}

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  href?: string;
  trend?: StatTrend;
  spark?: number[];
  loading?: boolean;
  className?: string;
}

function TrendChip({ trend }: { trend: StatTrend }) {
  if (trend.value === null || Number.isNaN(trend.value)) return null;
  const flat = Math.abs(trend.value) < 0.05;
  const good = trend.invert ? trend.value < 0 : trend.value > 0;
  const tone = flat ? toneStyles.neutral : good ? toneStyles.success : toneStyles.danger;
  const Icon = flat ? Minus : trend.value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular", tone.soft, tone.text)}>
      <Icon className="size-3" aria-hidden />
      {Math.abs(trend.value).toFixed(1)}%
    </span>
  );
}

/** The one KPI tile. Replaces the per-page MetricCard copies. */
export function StatCard({
  title, value, description, icon, tone = "primary", href, trend, spark, loading, className,
}: StatCardProps) {
  const t = toneStyles[tone];

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="truncate text-xl font-semibold tracking-tight text-foreground tabular">{value}</p>
          {spark && <Sparkline data={spark} color={t.chart} />}
        </div>
      )}

      {(description || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {trend && !loading && <TrendChip trend={trend} />}
          <span className="truncate">{trend?.label ?? description}</span>
        </div>
      )}
    </>
  );

  const base = "block rounded-lg bg-card p-5 shadow-card";
  if (href) {
    return (
      <Link
        href={href}
        className={cn(base, "transition-all hover:-translate-y-px hover:border-primary/30 hover:shadow-pop", className)}
      >
        {body}
      </Link>
    );
  }
  return <div className={cn(base, className)}>{body}</div>;
}
