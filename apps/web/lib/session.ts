import type { AuthResponse } from "./api";
import { notifyFamilyCacheReset } from "./family-cache-events";

const ACCESS_TOKEN_KEY = "familieappen.accessToken";
const ACTIVE_FAMILY_ID_KEY = "familieappen.activeFamilyId";
const PENDING_FAMILY_REQUEST_KEY = "familieappen.pendingFamilyRequest";

export interface PendingFamilyRequest {
  code: string;
  requestedAt: string;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function getAccessToken(): string | null {
  return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function saveAccessToken(accessToken: string): void {
  getStorage()?.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function saveAuthSession(auth: AuthResponse): void {
  saveAccessToken(auth.tokens.accessToken);
}

export function removeAccessToken(): void {
  getStorage()?.removeItem(ACCESS_TOKEN_KEY);
}

export function getActiveFamilyId(): string | null {
  return getStorage()?.getItem(ACTIVE_FAMILY_ID_KEY) ?? null;
}

export function setActiveFamilyId(familyId: string): void {
  getStorage()?.setItem(ACTIVE_FAMILY_ID_KEY, familyId);
}

export function clearActiveFamilyId(): void {
  getStorage()?.removeItem(ACTIVE_FAMILY_ID_KEY);
}

export function savePendingFamilyRequest(code: string): PendingFamilyRequest {
  const request = { code, requestedAt: new Date().toISOString() };

  getStorage()?.setItem(PENDING_FAMILY_REQUEST_KEY, JSON.stringify(request));

  return request;
}

export function getPendingFamilyRequest(): PendingFamilyRequest | null {
  const rawRequest = getStorage()?.getItem(PENDING_FAMILY_REQUEST_KEY);

  if (!rawRequest) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawRequest) as Partial<PendingFamilyRequest>;

    if (typeof parsed.code === "string" && typeof parsed.requestedAt === "string") {
      return { code: parsed.code, requestedAt: parsed.requestedAt };
    }
  } catch {
    clearPendingFamilyRequest();
  }

  return null;
}

export function clearPendingFamilyRequest(): void {
  getStorage()?.removeItem(PENDING_FAMILY_REQUEST_KEY);
}

export function clearAuthSession(): void {
  removeAccessToken();
  clearActiveFamilyId();
  clearPendingFamilyRequest();
  notifyFamilyCacheReset();
}
