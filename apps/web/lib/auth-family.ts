import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ApiError, type FamilyWithMembership, listFamilies } from "./api";
import { registerFamilyCacheResetListener } from "./family-cache-events";
import {
  clearActiveFamilyId,
  clearAuthSession,
  clearPendingFamilyRequest,
  getAccessToken,
  getActiveFamilyId,
  getPendingFamilyRequest,
  setActiveFamilyId,
  type PendingFamilyRequest,
} from "./session";

export type FamilyMembershipStatus = "approved" | "pending" | "rejected";

export type FamilyBootstrapResult =
  | {
      status: "unauthenticated";
      families: [];
      activeFamilyId: null;
      pendingRequest: null;
    }
  | {
      status: "no-family";
      families: [];
      activeFamilyId: null;
      pendingRequest: null;
    }
  | {
      status: "pending";
      families: FamilyWithMembership[];
      activeFamilyId: string | null;
      pendingRequest: PendingFamilyRequest | null;
    }
  | {
      status: "ready";
      families: FamilyWithMembership[];
      activeFamilyId: string;
    };

const AUTH_ERROR_CODES = new Set([
  "auth.requires_auth",
  "auth.invalid_token",
  "auth.expired_token",
]);
const FAMILY_CACHE_TTL_MS = 30_000;
const FAMILY_BOOTSTRAP_DEBUG_PREFIX =
  "[family-bootstrap:temporary-diagnostics]";

export interface FamilyBootstrapDebugSnapshot {
  accessTokenExists: boolean;
  activeFamilyIdExists: boolean;
  lastBootstrapStartedAt: string | null;
  lastBootstrapFinishedAt: string | null;
  lastBootstrapErrorCode: string | null;
  lastBootstrapErrorMessage: string | null;
  bootstrapInFlight: boolean;
}

interface FamilyBootstrapDebugState {
  lastBootstrapStartedAt: number | null;
  lastBootstrapFinishedAt: number | null;
  lastBootstrapErrorCode: string | null;
  lastBootstrapErrorMessage: string | null;
}

type FamilyCache = {
  result: FamilyBootstrapResult;
  timestamp: number;
};

let familyCache: FamilyCache | null = null;
let familyBootstrapPromise: Promise<FamilyBootstrapResult> | null = null;
let familyBootstrapDebugState: FamilyBootstrapDebugState = {
  lastBootstrapStartedAt: null,
  lastBootstrapFinishedAt: null,
  lastBootstrapErrorCode: null,
  lastBootstrapErrorMessage: null,
};

registerFamilyCacheResetListener(() => {
  resetFamilyCache();
});

export function requireAuth(
  router: AppRouterInstance,
  redirectTo = "/login",
): boolean {
  if (getAccessToken()) {
    return true;
  }

  clearAuthSession();
  router.replace(redirectTo);
  return false;
}

export async function loadAvailableFamilies(
  preferredFamilyId?: string | null,
  signal?: AbortSignal,
): Promise<FamilyBootstrapResult> {
  if (!getAccessToken()) {
    recordFamilyBootstrapFinish();
    logFamilyBootstrap("bootstrap:auth-missing", {
      preferredFamilyIdProvided:
        preferredFamilyId !== undefined && preferredFamilyId !== null,
    });
    clearAuthSession();
    return {
      status: "unauthenticated",
      families: [],
      activeFamilyId: null,
      pendingRequest: null,
    };
  }

  const canUseCache =
    preferredFamilyId === undefined || preferredFamilyId === null;

  if (canUseCache) {
    const cachedResult = getFreshFamilyCache();

    if (cachedResult) {
      return cachedResult;
    }

    if (familyBootstrapPromise && !signal) {
      logFamilyBootstrap("bootstrap:retry", { reason: "reuse-in-flight" });
      return familyBootstrapPromise;
    }
  }

  recordFamilyBootstrapStart();
  logFamilyBootstrap("bootstrap:start", {
    preferredFamilyIdProvided:
      preferredFamilyId !== undefined && preferredFamilyId !== null,
    cacheEnabled: canUseCache,
  });

  const bootstrapPromise = fetchAvailableFamilies(preferredFamilyId, signal);

  if (!canUseCache) {
    try {
      const result = await bootstrapPromise;
      recordFamilyBootstrapFinish();
      logFamilyBootstrap("bootstrap:success", {
        status: result.status,
        familyCount: result.families.length,
        activeFamilyIdExists: Boolean(result.activeFamilyId),
      });
      return result;
    } catch (error) {
      recordFamilyBootstrapError(error);
      throw error;
    }
  }

  // Signal-owned provider attempts must never enter the shared in-flight slot:
  // a retry needs a fresh request rather than an aborted predecessor.
  if (!signal) familyBootstrapPromise = bootstrapPromise;

  try {
    const result = await bootstrapPromise;
    recordFamilyBootstrapFinish();
    logFamilyBootstrap("bootstrap:success", {
      status: result.status,
      familyCount: result.families.length,
      activeFamilyIdExists: Boolean(result.activeFamilyId),
    });

    if (familyBootstrapPromise === bootstrapPromise && getAccessToken()) {
      familyCache = { result, timestamp: Date.now() };
    }

    return result;
  } catch (error) {
    recordFamilyBootstrapError(error);
    throw error;
  } finally {
    if (familyBootstrapPromise === bootstrapPromise) {
      familyBootstrapPromise = null;
    }
  }
}

export function getCachedFamilyBootstrapResult(): FamilyBootstrapResult | null {
  if (!getAccessToken()) {
    return null;
  }

  return familyCache?.result ?? null;
}

export function clearFamilyCache(): void {
  resetFamilyCache();
}

export function forceFamilyBootstrapRestart(): void {
  logFamilyBootstrap("bootstrap:retry", { reason: "manual-retry" });
  resetFamilyCache();
}

export function getFamilyBootstrapDebugSnapshot(): FamilyBootstrapDebugSnapshot {
  return {
    accessTokenExists: Boolean(getAccessToken()),
    activeFamilyIdExists: Boolean(getActiveFamilyId()),
    lastBootstrapStartedAt: formatDebugTime(
      familyBootstrapDebugState.lastBootstrapStartedAt,
    ),
    lastBootstrapFinishedAt: formatDebugTime(
      familyBootstrapDebugState.lastBootstrapFinishedAt,
    ),
    lastBootstrapErrorCode: familyBootstrapDebugState.lastBootstrapErrorCode,
    lastBootstrapErrorMessage:
      familyBootstrapDebugState.lastBootstrapErrorMessage,
    bootstrapInFlight: Boolean(familyBootstrapPromise),
  };
}

export function chooseActiveFamily(familyId: string): string {
  clearFamilyCache();
  setActiveFamilyId(familyId);
  return familyId;
}

export function isPendingFamilyAccess(
  familyContext: FamilyBootstrapResult,
): familyContext is Extract<FamilyBootstrapResult, { status: "pending" }> {
  return familyContext.status === "pending";
}

export function getFamilyMembershipStatus(
  family: FamilyWithMembership,
): FamilyMembershipStatus {
  const membership = family.membership as FamilyWithMembership["membership"] & {
    familyMembershipStatus?: unknown;
    membershipStatus?: unknown;
    status?: unknown;
  };
  const status =
    membership.familyMembershipStatus ??
    membership.membershipStatus ??
    membership.status;

  return status === "pending" || status === "rejected" ? status : "approved";
}

export function isAuthError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 ||
      (error.code ? AUTH_ERROR_CODES.has(error.code) : false))
  );
}

export function handleMissingOrInvalidAuth(
  error: unknown,
  router: AppRouterInstance,
  redirectTo = "/login",
): boolean {
  if (!isAuthError(error)) {
    return false;
  }

  clearAuthSession();
  router.replace(redirectTo);
  return true;
}

export function getUserFacingApiMessage(
  error: unknown,
  fallbackMessage: string,
): string {
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

async function fetchAvailableFamilies(
  preferredFamilyId?: string | null,
  signal?: AbortSignal,
): Promise<FamilyBootstrapResult> {
  const families = sortFamilies(await listFamilies(signal));
  const pendingRequest = getPendingFamilyRequest();

  if (families.length === 0) {
    clearActiveFamilyId();

    if (pendingRequest) {
      return {
        status: "pending",
        families: [],
        activeFamilyId: null,
        pendingRequest,
      };
    }

    return {
      status: "no-family",
      families: [],
      activeFamilyId: null,
      pendingRequest: null,
    };
  }

  const requestedFamilyId = preferredFamilyId ?? getActiveFamilyId();
  const activeFamily =
    families.find((family) => family.family.id === requestedFamilyId) ??
    families.find(
      (family) => getFamilyMembershipStatus(family) === "approved",
    ) ??
    families[0];
  const membershipStatus = getFamilyMembershipStatus(activeFamily);

  setActiveFamilyId(activeFamily.family.id);

  if (membershipStatus !== "approved") {
    return {
      status: "pending",
      families,
      activeFamilyId: activeFamily.family.id,
      pendingRequest,
    };
  }

  clearPendingFamilyRequest();

  return { status: "ready", families, activeFamilyId: activeFamily.family.id };
}

function getFreshFamilyCache(): FamilyBootstrapResult | null {
  if (
    !familyCache ||
    Date.now() - familyCache.timestamp > FAMILY_CACHE_TTL_MS
  ) {
    return null;
  }

  return familyCache.result;
}

function resetFamilyCache(): void {
  familyCache = null;
  familyBootstrapPromise = null;
}

function sortFamilies(
  families: FamilyWithMembership[],
): FamilyWithMembership[] {
  return [...families].sort((left, right) => {
    const leftTime = Date.parse(left.family.createdAt);
    const rightTime = Date.parse(right.family.createdAt);
    const createdAtComparison =
      normalizeComparableTime(leftTime) - normalizeComparableTime(rightTime);

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return left.family.id.localeCompare(right.family.id);
  });
}

function normalizeComparableTime(value: number): number {
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function recordFamilyBootstrapStart(): void {
  familyBootstrapDebugState = {
    lastBootstrapStartedAt: Date.now(),
    lastBootstrapFinishedAt: null,
    lastBootstrapErrorCode: null,
    lastBootstrapErrorMessage: null,
  };
}

function recordFamilyBootstrapFinish(): void {
  familyBootstrapDebugState.lastBootstrapFinishedAt = Date.now();
}

function recordFamilyBootstrapError(error: unknown): void {
  recordFamilyBootstrapFinish();
  const code =
    error instanceof ApiError
      ? (error.code ?? `http.${error.status}`)
      : error instanceof Error
        ? error.name
        : "unknown";
  const message =
    error instanceof Error ? error.message : "Unknown bootstrap error";

  familyBootstrapDebugState.lastBootstrapErrorCode = code;
  familyBootstrapDebugState.lastBootstrapErrorMessage = message;
  logFamilyBootstrap(
    code === "network.timeout" ? "bootstrap:timeout" : "bootstrap:error",
    { code, message },
  );
}

function logFamilyBootstrap(
  event: string,
  metadata: Record<string, string | number | boolean | null | undefined> = {},
): void {
  if (typeof console === "undefined") {
    return;
  }

  console.info(FAMILY_BOOTSTRAP_DEBUG_PREFIX, event, {
    ...metadata,
    accessTokenExists: Boolean(getAccessToken()),
    activeFamilyIdExists: Boolean(getActiveFamilyId()),
    inFlight: Boolean(familyBootstrapPromise),
  });
}

function formatDebugTime(timestamp: number | null): string | null {
  return timestamp === null ? null : new Date(timestamp).toISOString();
}
