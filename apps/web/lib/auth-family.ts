import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ApiError, type FamilyWithMembership, listFamilies } from "./api";
import {
  clearActiveFamilyId,
  clearAuthSession,
  clearPendingFamilyRequest,
  getAccessToken,
  getActiveFamilyId,
  getPendingFamilyRequest,
  setActiveFamilyId,
  type PendingFamilyRequest
} from "./session";

export type FamilyMembershipStatus = "approved" | "pending" | "rejected";

export type FamilyBootstrapResult =
  | { status: "unauthenticated"; families: []; activeFamilyId: null; pendingRequest: null }
  | { status: "no-family"; families: []; activeFamilyId: null; pendingRequest: null }
  | { status: "pending"; families: FamilyWithMembership[]; activeFamilyId: string | null; pendingRequest: PendingFamilyRequest | null }
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
    return { status: "unauthenticated", families: [], activeFamilyId: null, pendingRequest: null };
  }

  const families = sortFamilies(await listFamilies());
  const pendingRequest = getPendingFamilyRequest();

  if (families.length === 0) {
    clearActiveFamilyId();

    if (pendingRequest) {
      return { status: "pending", families: [], activeFamilyId: null, pendingRequest };
    }

    return { status: "no-family", families: [], activeFamilyId: null, pendingRequest: null };
  }

  const requestedFamilyId = preferredFamilyId ?? getActiveFamilyId();
  const activeFamily = families.find((family) => family.family.id === requestedFamilyId) ?? families.find((family) => getFamilyMembershipStatus(family) === "approved") ?? families[0];
  const membershipStatus = getFamilyMembershipStatus(activeFamily);

  setActiveFamilyId(activeFamily.family.id);

  if (membershipStatus !== "approved") {
    return {
      status: "pending",
      families,
      activeFamilyId: activeFamily.family.id,
      pendingRequest
    };
  }

  clearPendingFamilyRequest();

  return { status: "ready", families, activeFamilyId: activeFamily.family.id };
}

export function chooseActiveFamily(familyId: string): string {
  setActiveFamilyId(familyId);
  return familyId;
}

export function isPendingFamilyAccess(familyContext: FamilyBootstrapResult): familyContext is Extract<FamilyBootstrapResult, { status: "pending" }> {
  return familyContext.status === "pending";
}

export function getFamilyMembershipStatus(family: FamilyWithMembership): FamilyMembershipStatus {
  const membership = family.membership as FamilyWithMembership["membership"] & {
    familyMembershipStatus?: unknown;
    membershipStatus?: unknown;
    status?: unknown;
  };
  const status = membership.familyMembershipStatus ?? membership.membershipStatus ?? membership.status;

  return status === "pending" || status === "rejected" ? status : "approved";
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

function sortFamilies(families: FamilyWithMembership[]): FamilyWithMembership[] {
  return [...families].sort((left, right) => {
    const leftTime = Date.parse(left.family.createdAt);
    const rightTime = Date.parse(right.family.createdAt);
    const createdAtComparison = normalizeComparableTime(leftTime) - normalizeComparableTime(rightTime);

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return left.family.id.localeCompare(right.family.id);
  });
}

function normalizeComparableTime(value: number): number {
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}
