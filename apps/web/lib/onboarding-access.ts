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

export type RouteAccessDecision =
  | { action: "allow"; familyContext: FamilyBootstrapResult }
  | { action: "redirect"; route: string; familyContext?: FamilyBootstrapResult };

interface OnboardingRouteOptions {
  currentPath?: string;
  requestedPath?: string;
  requireApprovedMembership?: boolean;
  includeAppRecommendation?: boolean;
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

export async function resolveOnboardingRoute(options: OnboardingRouteOptions = {}): Promise<RouteAccessDecision> {
  const requestedPath = options.requestedPath ?? options.currentPath ?? ONBOARDING_ROUTES.dashboard;

  if (!getAccessToken()) {
    clearAuthSession();
    return { action: "redirect", route: getLoginRoute(requestedPath) };
  }

  const familyContext = await loadAvailableFamilies();
  const invitationRedirect = resolveInvitationRedirect(familyContext);

  if (invitationRedirect) {
    return { action: "redirect", route: invitationRedirect, familyContext };
  }

  if (familyContext.status === "unauthenticated") {
    return { action: "redirect", route: getLoginRoute(requestedPath), familyContext };
  }

  if (familyContext.status === "pending") {
    if (options.currentPath === ONBOARDING_ROUTES.pendingShell && !options.requireApprovedMembership) {
      return { action: "allow", familyContext };
    }

    return { action: "redirect", route: ONBOARDING_ROUTES.pendingShell, familyContext };
  }

  if (familyContext.status === "no-family") {
    return { action: "redirect", route: ONBOARDING_ROUTES.familyStart, familyContext };
  }

  if (options.requireApprovedMembership || options.includeAppRecommendation !== false) {
    const completionRoute = getOnboardingCompletionRoute();

    if (completionRoute !== ONBOARDING_ROUTES.dashboard && options.currentPath !== completionRoute) {
      return { action: "redirect", route: completionRoute, familyContext };
    }
  }

  return { action: "allow", familyContext };
}

export async function resolveAppRecommendationRoute(currentPath: string = ONBOARDING_ROUTES.appRecommendation): Promise<RouteAccessDecision> {
  const decision = await resolveOnboardingRoute({
    currentPath,
    includeAppRecommendation: false,
    requestedPath: currentPath,
  });

  if (decision.action === "redirect") {
    return decision;
  }

  if (hasCompletedOnboardingAppPrompt()) {
    return { action: "redirect", route: ONBOARDING_ROUTES.dashboard, familyContext: decision.familyContext };
  }

  return decision;
}

export async function resolveDashboardEntry(currentPath: string = ONBOARDING_ROUTES.dashboard): Promise<RouteAccessDecision> {
  return resolveOnboardingRoute({ currentPath, requestedPath: ONBOARDING_ROUTES.dashboard });
}

export async function resolveProtectedFamilyRoute(currentPath: string): Promise<RouteAccessDecision> {
  return resolveOnboardingRoute({
    currentPath,
    includeAppRecommendation: true,
    requestedPath: currentPath,
    requireApprovedMembership: true,
  });
}

export async function routeAfterAuthentication(router: AppRouterInstance, fallbackPath: string = ONBOARDING_ROUTES.dashboard): Promise<void> {
  const requestedPath = getSafeRedirectPath(fallbackPath);
  const decision = await resolveOnboardingRoute({ requestedPath });

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
