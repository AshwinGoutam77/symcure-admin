import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  height?: number;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Consistent frame for every chart: title, loading skeleton, empty state, footer note. */
export function ChartCard({
  title, description, action, loading, empty, emptyText = "No data for this period", height = 260, footer, className, children,
}: ChartCardProps) {
  return (
    <SectionCard title={title} description={description} action={action} className={className}>
      {loading ? (
        <Skeleton className="w-full" style={{ height }} />
      ) : empty ? (
        <EmptyState compact icon={<BarChart3 className="size-5" />} title={emptyText} />
      ) : (
        children
      )}
      {footer && <div className={cn("mt-4 border-t pt-3 text-xs text-muted-foreground")}>{footer}</div>}
    </SectionCard>
  );
}
