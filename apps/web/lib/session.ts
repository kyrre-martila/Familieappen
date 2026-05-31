import type { AuthResponse } from "./api";

const ACCESS_TOKEN_KEY = "familieappen.accessToken";
const ACTIVE_FAMILY_ID_KEY = "familieappen.activeFamilyId";

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

export function clearAuthSession(): void {
  removeAccessToken();
  clearActiveFamilyId();
}
