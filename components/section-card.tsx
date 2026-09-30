import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Remove body padding (tables, lists that go edge-to-edge) */
  flush?: boolean;
}

/** The one card surface for page sections: header (title/desc/action) + body. */
export function SectionCard({
  title, description, icon, action, children, className, contentClassName, flush,
}: SectionCardProps) {
  const hasHeader = title || description || action;
  return (
    <section className={cn("overflow-hidden rounded-lg bg-card text-card-foreground shadow-card", className)}>
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>}
              {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(!flush && "p-5", contentClassName)}>{children}</div>
    </section>
  );
}
