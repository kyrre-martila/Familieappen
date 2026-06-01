import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getInvitationPostAuthRoute } from "./invitation-flow";
import { getInvitationContext, getInvitationResumeRoute, INVITATION_ROUTES } from "./invitation-context";
import { getOnboardingCompletionRoute, hasCompletedOnboardingAppPrompt, ONBOARDING_APP_PROMPT_ROUTE, ONBOARDING_DASHBOARD_ROUTE } from "./onboarding-completion";
import { loadAvailableFamilies, type FamilyBootstrapResult } from "./auth-family";
import { clearAuthSession, getAccessToken } from "./session";

export const ONBOARDING_ROUTES = {
  login: "/login",
  familyStart: "/onboarding/family-start",
  pendingShell: ONBOARDING_DASHBOARD_ROUTE,
  appRecommendation: ONBOARDING_APP_PROMPT_ROUTE,
  dashboard: ONBOARDING_DASHBOARD_ROUTE,
} as const;

export const PROTECTED_FAMILY_ROUTES = [
  "/dashboard",
  "/calendar",
  "/shopping",
  "/tasks",
  "/meals",
  "/wishlists",
  "/settings",
] as const;

export type RouteAccessMode = "app-shell" | "pending-shell" | "approved-family" | "app-recommendation";

export type RouteAccessDecision =
  | { action: "allow"; familyContext: FamilyBootstrapResult }
  | { action: "redirect"; route: string; familyContext?: FamilyBootstrapResult };

interface RouteAccessOptions {
  currentPath?: string;
  requestedPath?: string;
  mode?: RouteAccessMode;
  preferredFamilyId?: string | null;
}

export function getLoginRoute(requestedPath: string = ONBOARDING_ROUTES.dashboard): string {
  if (!requestedPath || requestedPath === ONBOARDING_ROUTES.login) {
    return ONBOARDING_ROUTES.login;
  }

  return `${ONBOARDING_ROUTES.login}?next=${encodeURIComponent(requestedPath)}`;
}

export function isProtectedFamilyRoute(pathname: string): boolean {
  return PROTECTED_FAMILY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function getRouteAccessMode(pathname: string, mode?: RouteAccessMode): RouteAccessMode | null {
  if (mode) {
    return mode;
  }

  if (pathname === ONBOARDING_ROUTES.appRecommendation) {
    return "app-recommendation";
  }

  if (pathname === ONBOARDING_ROUTES.dashboard) {
    return "pending-shell";
  }

  if (isProtectedFamilyRoute(pathname)) {
    return "approved-family";
  }

  return null;
}

export async function resolveRouteAccess(options: RouteAccessOptions = {}): Promise<RouteAccessDecision> {
  const currentPath = options.currentPath ?? ONBOARDING_ROUTES.dashboard;
  const requestedPath = options.requestedPath ?? currentPath;
  const mode = getRouteAccessMode(currentPath, options.mode) ?? "pending-shell";

  if (!getAccessToken()) {
    clearAuthSession();
    return { action: "redirect", route: getLoginRoute(requestedPath) };
  }

  const familyContext = await loadAvailableFamilies(options.preferredFamilyId);
  const invitationRedirect = resolveInvitationRedirect(familyContext);

  if (invitationRedirect) {
    return { action: "redirect", route: invitationRedirect, familyContext };
  }

  if (familyContext.status === "unauthenticated") {
    return { action: "redirect", route: getLoginRoute(requestedPath), familyContext };
  }

  if (familyContext.status === "no-family") {
    return { action: "redirect", route: ONBOARDING_ROUTES.familyStart, familyContext };
  }

  if (familyContext.status === "pending") {
    if (mode === "pending-shell") {
      return { action: "allow", familyContext };
    }

    if (mode === "app-shell" && currentPath !== ONBOARDING_ROUTES.appRecommendation) {
      return { action: "allow", familyContext };
    }

    if (mode === "approved-family") {
      return { action: "allow", familyContext };
    }

    return { action: "redirect", route: ONBOARDING_ROUTES.pendingShell, familyContext };
  }

  if (mode === "app-recommendation") {
    if (hasCompletedOnboardingAppPrompt()) {
      return { action: "redirect", route: ONBOARDING_ROUTES.dashboard, familyContext };
    }

    return { action: "allow", familyContext };
  }

  const completionRoute = getOnboardingCompletionRoute();

  if (completionRoute !== ONBOARDING_ROUTES.dashboard && currentPath !== completionRoute) {
    return { action: "redirect", route: completionRoute, familyContext };
  }

  return { action: "allow", familyContext };
}

export async function resolveOnboardingRoute(options: RouteAccessOptions = {}): Promise<RouteAccessDecision> {
  return resolveRouteAccess(options);
}

export async function resolveAppRecommendationRoute(currentPath: string = ONBOARDING_ROUTES.appRecommendation): Promise<RouteAccessDecision> {
  return resolveRouteAccess({ currentPath, requestedPath: currentPath, mode: "app-recommendation" });
}

export async function resolveDashboardEntry(
  currentPath: string = ONBOARDING_ROUTES.dashboard,
  preferredFamilyId?: string | null,
): Promise<RouteAccessDecision> {
  return resolveRouteAccess({ currentPath, requestedPath: ONBOARDING_ROUTES.dashboard, mode: "pending-shell", preferredFamilyId });
}

export async function resolveProtectedFamilyRoute(currentPath: string, preferredFamilyId?: string | null): Promise<RouteAccessDecision> {
  return resolveRouteAccess({
    currentPath,
    requestedPath: currentPath,
    mode: "approved-family",
    preferredFamilyId,
  });
}

export async function routeAfterAuthentication(router: AppRouterInstance, fallbackPath: string = ONBOARDING_ROUTES.dashboard): Promise<void> {
  const requestedPath = getSafeRedirectPath(fallbackPath);
  const decision = await resolveRouteAccess({ currentPath: requestedPath, requestedPath });

  router.push(decision.action === "redirect" ? decision.route : requestedPath);
}

export function redirectIfNeeded(router: AppRouterInstance, decision: RouteAccessDecision): boolean {
  if (decision.action !== "redirect") {
    return false;
  }

  router.replace(decision.route);
  return true;
}

function resolveInvitationRedirect(familyContext: FamilyBootstrapResult): string | null {
  const invitationContext = getInvitationContext();

  if (!invitationContext || invitationContext.status === "declined") {
    return null;
  }

  if (invitationContext.status === "pending-approval") {
    return INVITATION_ROUTES.pendingApproval(invitationContext.token);
  }

  if (familyContext.status !== "unauthenticated" && familyContext.families.length > 0) {
    return INVITATION_ROUTES.alreadyInFamily(invitationContext.token);
  }

  if (invitationContext.status === "accepted" || invitationContext.status === "switch-requested") {
    return getInvitationPostAuthRoute();
  }

  return getInvitationResumeRoute();
}

function getSafeRedirectPath(fallbackPath: string): string {
  if (typeof window === "undefined") {
    return fallbackPath;
  }

  const redirectPath = new URLSearchParams(window.location.search).get("next");

  if (!redirectPath || !redirectPath.startsWith("/") || redirectPath.startsWith("//")) {
    return fallbackPath;
  }

  return redirectPath;
}
