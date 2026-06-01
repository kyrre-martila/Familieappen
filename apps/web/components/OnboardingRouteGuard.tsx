"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ONBOARDING_ROUTES, isProtectedFamilyRoute, redirectIfNeeded, resolveAppRecommendationRoute, resolveOnboardingRoute, resolveProtectedFamilyRoute } from "../lib/onboarding-access";

interface OnboardingRouteGuardProps {
  mode?: "approved-family" | "app-recommendation";
}

export function OnboardingRouteGuard({ mode }: OnboardingRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    async function guardRoute() {
      const decision = mode === "app-recommendation"
        ? await resolveAppRecommendationRoute(pathname)
        : pathname === ONBOARDING_ROUTES.dashboard
          ? await resolveOnboardingRoute({ currentPath: pathname, requestedPath: pathname })
          : mode === "approved-family" || isProtectedFamilyRoute(pathname)
            ? await resolveProtectedFamilyRoute(pathname)
            : null;

      if (isActive && decision) {
        redirectIfNeeded(router, decision);
      }
    }

    void guardRoute();

    return () => {
      isActive = false;
    };
  }, [mode, pathname, router]);

  return null;
}
