import type { Family, FamilyDashboardResponse, FamilyMember, FamilyMemberRole, ManualFamilyMemberRole } from "@familieappen/shared";

export type { Family, FamilyDashboardResponse, FamilyMember, FamilyMemberRole, ManualFamilyMemberRole };

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    tokenType: "Bearer";
    expiresIn: number;
  };
}

export interface FamilyDetails {
  family: Family;
  members: FamilyMember[];
}

export interface FamilyWithMembership {
  family: Family;
  membership: FamilyMember;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const ACCESS_TOKEN_KEY = "familieappen.accessToken";
const ACTIVE_FAMILY_ID_KEY = "familieappen.activeFamilyId";

interface ApiEnvelope<TData> {
  data: TData;
}

interface ApiErrorBody {
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveAuthSession(auth: AuthResponse): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, auth.tokens.accessToken);
}

export function getActiveFamilyId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_FAMILY_ID_KEY);
}

export function setActiveFamilyId(familyId: string): void {
  window.localStorage.setItem(ACTIVE_FAMILY_ID_KEY, familyId);
}

export function clearActiveFamilyId(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACTIVE_FAMILY_ID_KEY);
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(ACTIVE_FAMILY_ID_KEY);
}

export async function register(input: { name: string; email: string; password: string }): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: input,
    includeAuth: false
  });
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: input,
    includeAuth: false
  });
}

export async function createFamily(input: { name: string }): Promise<FamilyDetails> {
  return apiRequest<FamilyDetails>("/families", {
    method: "POST",
    body: input
  });
}

export async function listFamilies(): Promise<FamilyWithMembership[]> {
  return apiRequest<FamilyWithMembership[]>("/families");
}

export async function getFamily(familyId: string): Promise<FamilyDetails> {
  return apiRequest<FamilyDetails>(`/families/${encodeURIComponent(familyId)}`);
}

export async function getFamilyDashboard(familyId: string): Promise<FamilyDashboardResponse> {
  return apiRequest<FamilyDashboardResponse>(`/families/${encodeURIComponent(familyId)}/dashboard`);
}

export async function addFamilyMember(
  familyId: string,
  input: { displayName: string; role: ManualFamilyMemberRole }
): Promise<FamilyMember> {
  return apiRequest<FamilyMember>(`/families/${encodeURIComponent(familyId)}/members`, {
    method: "POST",
    body: input
  });
}

export async function removeFamilyMember(familyId: string, memberId: string): Promise<FamilyMember> {
  return apiRequest<FamilyMember>(
    `/families/${encodeURIComponent(familyId)}/members/${encodeURIComponent(memberId)}`,
    { method: "DELETE" }
  );
}

async function apiRequest<TData>(
  path: string,
  options: { method?: string; body?: unknown; includeAuth?: boolean } = {}
): Promise<TData> {
  const headers = new Headers({ Accept: "application/json" });
  const includeAuth = options.includeAuth ?? true;

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (includeAuth) {
    const token = getAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  const envelope = (await response.json()) as ApiEnvelope<TData>;

  return envelope.data;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;

    return body.message || "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}
