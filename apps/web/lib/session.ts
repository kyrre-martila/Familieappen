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

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safelyUseStorage(operation: (storage: Storage) => void): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    operation(storage);
  } catch {
    // Storage can be unavailable in constrained standalone/private browsing contexts.
  }
}

export function getAccessToken(): string | null {
  try {
    return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function saveAccessToken(accessToken: string): void {
  safelyUseStorage((storage) => storage.setItem(ACCESS_TOKEN_KEY, accessToken));
}

export function saveAuthSession(auth: AuthResponse): void {
  saveAccessToken(auth.tokens.accessToken);
}

export function removeAccessToken(): void {
  safelyUseStorage((storage) => storage.removeItem(ACCESS_TOKEN_KEY));
}

export function getActiveFamilyId(): string | null {
  try {
    return getStorage()?.getItem(ACTIVE_FAMILY_ID_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setActiveFamilyId(familyId: string): void {
  safelyUseStorage((storage) => storage.setItem(ACTIVE_FAMILY_ID_KEY, familyId));
}

export function clearActiveFamilyId(): void {
  safelyUseStorage((storage) => storage.removeItem(ACTIVE_FAMILY_ID_KEY));
}

export function savePendingFamilyRequest(code: string): PendingFamilyRequest {
  const request = { code, requestedAt: new Date().toISOString() };

  safelyUseStorage((storage) => storage.setItem(PENDING_FAMILY_REQUEST_KEY, JSON.stringify(request)));

  return request;
}

export function getPendingFamilyRequest(): PendingFamilyRequest | null {
  let rawRequest: string | null | undefined;

  try {
    rawRequest = getStorage()?.getItem(PENDING_FAMILY_REQUEST_KEY);
  } catch {
    rawRequest = null;
  }

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
  safelyUseStorage((storage) => storage.removeItem(PENDING_FAMILY_REQUEST_KEY));
}

export function clearAuthSession(): void {
  removeAccessToken();
  clearActiveFamilyId();
  clearPendingFamilyRequest();
  notifyFamilyCacheReset();
}
