import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ApiError, type FamilyWithMembership, listFamilies } from "./api";
import {
  clearActiveFamilyId,
  clearAuthSession,
  getAccessToken,
  getActiveFamilyId,
  setActiveFamilyId
} from "./session";

export type FamilyBootstrapResult =
  | { status: "unauthenticated"; families: []; activeFamilyId: null }
  | { status: "no-family"; families: []; activeFamilyId: null }
  | { status: "ready"; families: FamilyWithMembership[]; activeFamilyId: string };

const AUTH_ERROR_CODES = new Set(["auth.requires_auth", "auth.invalid_token", "auth.expired_token"]);

export function requireAuth(router: AppRouterInstance, redirectTo = "/login"): boolean {
  if (getAccessToken()) {
    return true;
  }

  clearAuthSession();
  router.replace(redirectTo);
  return false;
}

export async function loadAvailableFamilies(preferredFamilyId?: string | null): Promise<FamilyBootstrapResult> {
  if (!getAccessToken()) {
    clearAuthSession();
    return { status: "unauthenticated", families: [], activeFamilyId: null };
  }

  const families = await listFamilies();

  if (families.length === 0) {
    clearActiveFamilyId();
    return { status: "no-family", families: [], activeFamilyId: null };
  }

  const requestedFamilyId = preferredFamilyId ?? getActiveFamilyId();
  const activeFamily = families.find((family) => family.family.id === requestedFamilyId) ?? families[0];

  setActiveFamilyId(activeFamily.family.id);

  return { status: "ready", families, activeFamilyId: activeFamily.family.id };
}

export function chooseActiveFamily(familyId: string): string {
  setActiveFamilyId(familyId);
  return familyId;
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || (error.code ? AUTH_ERROR_CODES.has(error.code) : false));
}

export function handleMissingOrInvalidAuth(error: unknown, router: AppRouterInstance, redirectTo = "/login"): boolean {
  if (!isAuthError(error)) {
    return false;
  }

  clearAuthSession();
  router.replace(redirectTo);
  return true;
}

export function getUserFacingApiMessage(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof ApiError)) {
    return fallbackMessage;
  }

  switch (error.code) {
    case "auth.requires_auth":
    case "auth.invalid_token":
    case "auth.expired_token":
      return "Your session has expired. Please sign in again.";
    case "family.missing_context":
      return "Choose a family before continuing.";
    case "family.access_denied":
      return "That family could not be loaded for your account.";
    case "validation.invalid_input":
      return error.message || "Please check the form and try again.";
    default:
      return error.message || fallbackMessage;
  }
}
