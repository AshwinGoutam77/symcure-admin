"use client";

import { AdminModal, InlineError, LoadingBlock } from "@/components/admin/kit";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getActivityLog } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";
import { apiErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function decode(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : { value: parsed };
    } catch {
      return { value };
    }
  }
  return typeof value === "object" ? (value as Record<string, unknown>) : { value };
}

function show(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function ActivityLogDetail({ logId, onClose }: { logId: string | number | null; onClose: () => void }) {
  const query = useAdminQuery(
    () => getActivityLog(String(logId)),
    ["admin", "activity-log", String(logId)],
    logId !== null,
  );
  const raw: any = query.data;
  const log = raw?.log ?? raw?.activity_log ?? raw ?? {};
  const before = decode(log.old_values);
  const after = decode(log.new_values);
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));

  return (
    <AdminModal
      open={logId !== null}
      onClose={onClose}
      size="lg"
      title="Activity details"
      description={log.description ?? undefined}
      footer={
        <Button type="button" variant="outline" className="h-9 text-xs" onClick={onClose}>
          Close
        </Button>
      }
    >
      {query.isLoading ? (
        <LoadingBlock label="Loading activity…" />
      ) : query.error ? (
        <InlineError>{apiErrorMessage(query.error)}</InlineError>
      ) : (
        <>
          <dl className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-3">
            <Meta label="When">{formatDateTime(log.created_at)}</Meta>
            <Meta label="Who">
              {log.actor_name ?? "—"}
              {log.role_name && <span className="block text-xs text-muted-foreground">{log.role_name}</span>}
            </Meta>
            <Meta label="Status">{log.status ? <StatusBadge status={log.status} /> : "—"}</Meta>
            <Meta label="Module">{log.module ?? "—"}</Meta>
            <Meta label="Action">{log.action ?? "—"}</Meta>
            <Meta label="Record">
              {log.entity_label ?? "—"}
              {(log.entity_type || log.entity_id) && (
                <span className="block text-xs text-muted-foreground">
                  {[log.entity_type, log.entity_id ? `#${log.entity_id}` : ""].filter(Boolean).join(" ")}
                </span>
              )}
            </Meta>
            <Meta label="IP address">{log.ip_address ?? "—"}</Meta>
            <Meta label="Request ID">
              <span className="text-xs">{log.request_id ?? "—"}</span>
            </Meta>
            <Meta label="Browser">
              <span className="line-clamp-2 text-xs text-muted-foreground">{log.user_agent ?? "—"}</span>
            </Meta>
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">What changed</h3>
            {keys.length ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Field</th>
                      <th className="px-3 py-2 font-medium">Before</th>
                      <th className="px-3 py-2 font-medium">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => {
                      const oldValue = show(before?.[key]);
                      const newValue = show(after?.[key]);
                      const changed = oldValue !== newValue;
                      return (
                        <tr key={key} className="border-t border-border align-top">
                          <td className="px-3 py-2 font-medium text-foreground">{key}</td>
                          <td className={cn("max-w-[260px] break-words px-3 py-2", changed ? "text-destructive" : "text-muted-foreground")}>
                            {oldValue}
                          </td>
                          <td className={cn("max-w-[260px] break-words px-3 py-2", changed ? "text-success" : "text-muted-foreground")}>
                            {newValue}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                No before/after values were recorded for this action.
              </p>
            )}
          </div>
        </>
      )}
    </AdminModal>
  );
}
