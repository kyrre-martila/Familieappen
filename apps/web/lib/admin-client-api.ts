import { AdminApiError, safeAdminErrorMessage, type AdminDashboard, type AdminManagedUserDetail, type AdminStatistics, type AdminUser, type AdminUserListResponse, type AdminUserStatusUpdate, type AdvertisementListResponse, type Advertisement, type AdvertisementMutation, type AuditLogResponse, type AdminFamilySearchResponse, type AdminFamilyInviteCodeResponse, type AdminMoveUserFamilyResponse, type AdminCreateFamilyForUserResponse, type AdminFamilyRole, type AdminUserDeletionImpact, type AdminFamilyDeletionImpact, type AdminDeleteUserResponse, type AdminDeleteFamilyResponse, type AdminMoveFamilyImpact, type AdminSourceFamilyAction } from "./admin-shared";

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

export async function fetchAdminUsers(query: { search?: string; status?: "active" | "inactive"; sort?: "asc" | "desc"; page?: number; pageSize?: number } = {}): Promise<AdminUserListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  return adminClientRequest(`/admin/users${params.toString() ? `?${params}` : ""}`);
}

export async function fetchAdminUser(id: string): Promise<AdminManagedUserDetail> {
  return adminClientRequest(`/admin/users/${encodeURIComponent(id)}`);
}

export async function updateAdminUserStatus(id: string, body: { active: boolean }): Promise<AdminUserStatusUpdate> {
  return adminClientRequest(`/admin/users/${encodeURIComponent(id)}/status`, { method: "PATCH", body });
}

export async function fetchAdminStatistics(): Promise<AdminStatistics> {
  return adminClientRequest("/admin/statistics");
}


export async function fetchAdvertisements(query: { status?: string; page?: number; pageSize?: number } = {}): Promise<AdvertisementListResponse> { const q = qs(query); return adminClientRequest(`/admin/advertisements${q ? `?${q}` : ""}`); }
export async function fetchAdvertisement(id: string): Promise<Advertisement> { return adminClientRequest(`/admin/advertisements/${encodeURIComponent(id)}`); }
export async function createAdvertisement(body: AdvertisementMutation): Promise<Advertisement> { return adminClientRequest(`/admin/advertisements`, { method: "POST", body }); }
export async function updateAdvertisement(id: string, body: Partial<AdvertisementMutation>): Promise<Advertisement> { return adminClientRequest(`/admin/advertisements/${encodeURIComponent(id)}`, { method: "PATCH", body }); }
export async function deleteAdvertisement(id: string): Promise<{id:string;deleted:boolean}> { return adminClientRequest(`/admin/advertisements/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export async function fetchManagedAdmins(): Promise<AdminUser[]> { return adminClientRequest('/admin/admin-users'); }
export async function createManagedAdmin(body: {email:string; password:string; name:string; role:AdminUser['role']; active?:boolean}): Promise<AdminUser> { return adminClientRequest('/admin/admin-users', { method: 'POST', body }); }
export async function updateManagedAdmin(id:string, body: Partial<Pick<AdminUser,'name'|'role'|'active'>>): Promise<AdminUser> { return adminClientRequest(`/admin/admin-users/${encodeURIComponent(id)}`, { method: 'PATCH', body }); }
export async function fetchAuditLog(query: {adminId?:string; action?:string; from?:string; to?:string; page?:number; pageSize?:number} = {}): Promise<AuditLogResponse> { const q=qs(query); return adminClientRequest(`/admin/audit-log${q ? `?${q}` : ''}`); }

export async function searchAdminFamilies(query: { search?: string; inviteCode?: string; userId?: string; page?: number; pageSize?: number } = {}): Promise<AdminFamilySearchResponse> { const q = qs(query); return adminClientRequest(`/admin/families${q ? `?${q}` : ""}`); }
export async function fetchAdminFamilyInviteCode(userId: string, familyId: string): Promise<AdminFamilyInviteCodeResponse> { return adminClientRequest(`/admin/users/${encodeURIComponent(userId)}/families/${encodeURIComponent(familyId)}/invite-code`); }
export async function fetchAdminMoveFamilyImpact(userId: string, targetFamilyId: string): Promise<AdminMoveFamilyImpact> { return adminClientRequest(`/admin/users/${encodeURIComponent(userId)}/move-family-impact?targetFamilyId=${encodeURIComponent(targetFamilyId)}`); }
export async function moveAdminUserFamily(userId: string, body: { targetFamilyId: string; role: AdminFamilyRole; reason: string; sourceFamilyAction: AdminSourceFamilyAction }): Promise<AdminMoveUserFamilyResponse> { return adminClientRequest(`/admin/users/${encodeURIComponent(userId)}/move-family`, { method: "POST", body }); }
export async function createAdminFamilyForUser(userId: string, body: { name: string; reason: string }): Promise<AdminCreateFamilyForUserResponse> { return adminClientRequest(`/admin/users/${encodeURIComponent(userId)}/create-family`, { method: "POST", body }); }
export async function fetchAdminUserDeletionImpact(userId: string): Promise<AdminUserDeletionImpact> { return adminClientRequest(`/admin/users/${encodeURIComponent(userId)}/deletion-impact`); }
export async function deleteAdminUserPermanently(userId: string, body: { reason: string }): Promise<AdminDeleteUserResponse> { return adminClientRequest(`/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE", body }); }
export async function fetchAdminFamilyDeletionImpact(familyId: string): Promise<AdminFamilyDeletionImpact> { return adminClientRequest(`/admin/families/${encodeURIComponent(familyId)}/deletion-impact`); }
export async function deleteAdminFamilyPermanently(familyId: string, body: { reason: string }): Promise<AdminDeleteFamilyResponse> { return adminClientRequest(`/admin/families/${encodeURIComponent(familyId)}`, { method: "DELETE", body }); }

function qs(query: Record<string, string | number | undefined>) { const p = new URLSearchParams(); Object.entries(query).forEach(([k,v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); }); return p.toString(); }

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
    const code = body.error?.code ?? (typeof body.message === "string" && body.message.startsWith("admin.") ? body.message : undefined);
    return [safeAdminErrorMessage(response.status, code), response.status, code];
  } catch {
    return [safeAdminErrorMessage(response.status), response.status];
  }
}
