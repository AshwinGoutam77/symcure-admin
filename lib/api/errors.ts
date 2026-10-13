import { ApiError } from "./client";

/** Readable message for any thrown value, with friendlier copy for the common admin error codes. */
export function apiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) {
    if (error.code === "PERMISSION_DENIED") {
      const permission = (error.details as any)?.permission;
      return permission
        ? `You don't have permission for this action (${permission}). Ask a super admin to grant it.`
        : "You don't have permission for this action. Ask a super admin to grant it.";
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export function errorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined;
}

export function errorDetails<T = Record<string, any>>(error: unknown): T | undefined {
  return error instanceof ApiError ? (error.details as T) : undefined;
}

/** Laravel-style field errors ({ field: [msg] }) → { field: msg } for inline form messages. */
export function fieldErrors(error: unknown): Record<string, string> {
  const details = errorDetails<any>(error);
  const source = details?.errors ?? details;
  if (!source || typeof source !== "object") return {};
  const out: Record<string, string> = {};
  Object.entries(source).forEach(([key, value]) => {
    if (Array.isArray(value) && typeof value[0] === "string") out[key] = value[0];
    else if (typeof value === "string") out[key] = value;
  });
  return out;
}

/** Turns a `used_by` map ({ doctors: 3, patients: 12 }) into "3 doctors, 12 patients". */
export function describeUsage(usedBy: unknown): string {
  if (!usedBy || typeof usedBy !== "object") return "";
  return Object.entries(usedBy as Record<string, number>)
    .filter(([, count]) => Number(count) > 0)
    .map(([table, count]) => `${count} ${table.replaceAll("_", " ")}`)
    .join(", ");
}
