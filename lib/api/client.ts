export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  timeoutMs?: number;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://symcure.myclientwebsite.com/api/v1").replace(/\/$/, "");
const TOKEN_KEY = "symcure_admin_token";
const REFRESH_TOKEN_KEY = "symcure_admin_refresh_token";

export function getAdminToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAdminTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function getErrorMessage(payload: any, fallback: string) {
  return payload?.error?.message || payload?.message || payload?.error || fallback;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30000);

  try {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    const token = getAdminToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    if (options.body !== undefined && !isFormData) headers.set("Content-Type", "application/json");

    const url = path.startsWith("http") ? path : `${API_BASE_URL}/${path.replace(/^\//, "")}`;
    const response = await fetch(url, {
      ...options,
      headers,
      body:
        options.body === undefined || isFormData
          ? (options.body as BodyInit | null | undefined)
          : JSON.stringify(options.body),
      signal: controller.signal,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text();

    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") {
        clearAdminTokens();
        if (window.location.pathname !== "/login") window.location.replace("/login");
      }
      throw new ApiError(
        getErrorMessage(payload, `Request failed with status ${response.status}`),
        response.status,
        payload?.error?.code,
        payload?.error?.details,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 408);
    }
    if (error instanceof TypeError && /fetch/i.test(error.message)) {
      throw new ApiError(
        "Unable to reach the Symcure API. Check the API URL and make sure CORS allows this admin panel origin.",
        0,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const adminGet = <T>(path: string) => apiFetch<T>(path, { method: "GET" });
export const adminPost = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body });
export const adminPatch = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body });
export const adminPut = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT", body });
export const adminDelete = <T>(path: string) => apiFetch<T>(path, { method: "DELETE" });

export function queryString(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const result = search.toString();
  return result ? `?${result}` : "";
}

export function unwrapData<T = any>(payload: any): T {
  return payload?.data ?? payload;
}
