"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { FamilyBootstrapResult } from "../lib/auth-family";
import { getLoginRoute, ONBOARDING_ROUTES } from "../lib/onboarding-access";
import { RequireAuth, RequireFamily } from "./AuthGuards";
import { useAuth } from "./AuthProvider";
import { useFamily } from "./FamilyProvider";

/** Compatibility adapter for screens not yet migrated directly to useFamily. */
export function useFamilyAccess() {
  const { state: auth } = useAuth();
  const { state, familyContext, retry } = useFamily();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "unauthenticated") router.replace(getLoginRoute(pathname));
    else if (state.status === "no-family") router.replace(ONBOARDING_ROUTES.familyStart);
  }, [auth.status, pathname, router, state.status]);

  if (state.status === "ready") return { status: "approved" as const, familyContext: familyContext as Extract<FamilyBootstrapResult, { status: "ready" }>, retry };
  if (state.status === "pending") return { status: "pending" as const, familyContext: familyContext as Extract<FamilyBootstrapResult, { status: "pending" }>, retry };
  if (state.status === "error") return { status: "error" as const, familyContext: null, retry };
  if (state.status === "no-family" || auth.status === "unauthenticated") return { status: "redirecting" as const, familyContext, retry };
  return { status: "loading" as const, familyContext: null, retry };
}

export function ProtectedFamilyRoute({ children }: { children: ReactNode }) {
  return <RequireAuth><RequireFamily>{children}</RequireFamily></RequireAuth>;
}
