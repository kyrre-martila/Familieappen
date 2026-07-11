import { AdminApiError, safeAdminErrorMessage, type AdminDashboard, type AdminUser } from "./admin-shared";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const API_REQUEST_TIMEOUT_MS = 15_000;
interface ApiEnvelope<T> { data: T }
interface ApiErrorBody { message?: string; error?: { code?: string; message?: string } }

export async function adminLogin(input: { email: string; password: string }): Promise<{ admin: AdminUser; session: { expiresAt: string } }> {
  return adminClientRequest("/admin/auth/login", { method: "POST", body: input });
}

export async function adminLogout(): Promise<{ message: string }> {
  return adminClientRequest("/admin/auth/logout", { method: "POST" });
}

export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  return adminClientRequest("/admin/dashboard");
}

async function adminClientRequest<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "include",
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new AdminApiError("The request timed out. Please try again.", 408, "network.timeout");
    throw new AdminApiError("Could not reach the admin service. Please try again.", 0, "network.unavailable");
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
  if (!response.ok) throw new AdminApiError(...(await getErrorDetails(response)));
  return ((await response.json()) as ApiEnvelope<T>).data;
}

async function getErrorDetails(response: Response): Promise<[string, number, string?]> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return [safeAdminErrorMessage(response.status, body.error?.code), response.status, body.error?.code];
  } catch {
    return [safeAdminErrorMessage(response.status), response.status];
  }
}
