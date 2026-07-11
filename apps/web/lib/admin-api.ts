import "server-only";
import { cookies } from "next/headers";
import { AdminApiError, safeAdminErrorMessage, type AdminDashboard, type AdminManagedUserDetail, type AdminStatistics, type AdminUser, type AdminUserListResponse, type AdvertisementListResponse, type Advertisement, type AuditLogResponse, type AdminRole } from "./admin-shared";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

interface ApiEnvelope<T> { data: T }
interface ApiErrorBody { message?: string; error?: { code?: string; message?: string } }

export async function getCurrentAdmin(): Promise<AdminUser> {
  return adminApiRequest<AdminUser>("/admin/auth/me", { cache: "no-store" });
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  return adminApiRequest<AdminDashboard>("/admin/dashboard", { cache: "no-store" });
}

export async function getAdminUsers(query: { search?: string; status?: "active" | "inactive"; sort?: "asc" | "desc"; page?: number; pageSize?: number } = {}): Promise<AdminUserListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  return adminApiRequest<AdminUserListResponse>(`/admin/users${params.toString() ? `?${params}` : ""}`, { cache: "no-store" });
}

export async function getAdminUser(id: string): Promise<AdminManagedUserDetail> {
  return adminApiRequest<AdminManagedUserDetail>(`/admin/users/${encodeURIComponent(id)}`, { cache: "no-store" });
}

export async function getAdminStatistics(): Promise<AdminStatistics> {
  return adminApiRequest<AdminStatistics>("/admin/statistics", { cache: "no-store" });
}


export async function getAdvertisements(query: { status?: string; page?: number; pageSize?: number } = {}): Promise<AdvertisementListResponse> { const q = qs(query); return adminApiRequest(`/admin/advertisements${q ? `?${q}` : ""}`, { cache: "no-store" }); }
export async function getAdvertisement(id: string): Promise<Advertisement> { return adminApiRequest(`/admin/advertisements/${encodeURIComponent(id)}`, { cache: "no-store" }); }
export async function getManagedAdmins(): Promise<AdminUser[]> { return adminApiRequest('/admin/admin-users', { cache: 'no-store' }); }
export async function getAuditLog(query: {adminId?:string; action?:string; from?:string; to?:string; page?:number; pageSize?:number} = {}): Promise<AuditLogResponse> { const q=qs(query); return adminApiRequest(`/admin/audit-log${q ? `?${q}` : ''}`, { cache: 'no-store' }); }


function qs(query: Record<string, string | number | undefined>) { const p = new URLSearchParams(); Object.entries(query).forEach(([k,v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); }); return p.toString(); }

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

