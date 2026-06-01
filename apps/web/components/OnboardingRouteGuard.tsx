"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getRouteAccessMode, redirectIfNeeded, resolveRouteAccess, type RouteAccessMode } from "../lib/onboarding-access";

interface OnboardingRouteGuardProps {
  mode?: RouteAccessMode;
}

export function OnboardingRouteGuard({ mode }: OnboardingRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    async function guardRoute() {
      const accessMode = getRouteAccessMode(pathname, mode);

      if (!accessMode) {
        return;
      }

      const decision = await resolveRouteAccess({ currentPath: pathname, requestedPath: pathname, mode: accessMode });

      if (isActive) {
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
