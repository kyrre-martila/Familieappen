import "server-only";
import { cookies } from "next/headers";
import { AdminApiError, safeAdminErrorMessage, type AdminDashboard, type AdminUser } from "./admin-shared";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

interface ApiEnvelope<T> { data: T }
interface ApiErrorBody { message?: string; error?: { code?: string; message?: string } }

export async function getCurrentAdmin(): Promise<AdminUser> {
  return adminApiRequest<AdminUser>("/admin/auth/me", { cache: "no-store" });
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  return adminApiRequest<AdminDashboard>("/admin/dashboard", { cache: "no-store" });
}

async function adminApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (cookieHeader) headers.set("Cookie", cookieHeader);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new AdminApiError("Could not reach the admin service. Please try again.", 0, "network.unavailable");
  }

  if (!response.ok) {
    throw new AdminApiError(...(await getAdminErrorDetails(response)));
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  return envelope.data;
}

async function getAdminErrorDetails(response: Response): Promise<[string, number, string?]> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return [safeAdminErrorMessage(response.status, body.error?.code), response.status, body.error?.code];
  } catch {
    return [safeAdminErrorMessage(response.status), response.status];
  }
}

