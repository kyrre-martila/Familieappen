"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LockedFeatureState } from "./PendingAccess";
import { Card, EmptyState, PageContainer } from "./ui";
import { redirectIfNeeded, resolveProtectedFamilyRoute } from "../lib/onboarding-access";
import type { FamilyBootstrapResult } from "../lib/auth-family";

type FamilyAccessState =
  | { status: "loading"; familyContext: null }
  | { status: "approved"; familyContext: Extract<FamilyBootstrapResult, { status: "ready" }> }
  | { status: "pending"; familyContext: Extract<FamilyBootstrapResult, { status: "pending" }> }
  | { status: "redirecting"; familyContext: FamilyBootstrapResult | null }
  | { status: "error"; familyContext: null };

export function useFamilyAccess(): FamilyAccessState {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<FamilyAccessState>({ status: "loading", familyContext: null });

  useEffect(() => {
    let isActive = true;

    async function resolveAccess() {
      setState({ status: "loading", familyContext: null });

      try {
        const decision = await resolveProtectedFamilyRoute(pathname);

        if (!isActive) {
          return;
        }

        if (decision.action === "redirect") {
          redirectIfNeeded(router, decision);
          setState({ status: "redirecting", familyContext: decision.familyContext ?? null });
          return;
        }

        if (decision.familyContext.status === "pending") {
          setState({ status: "pending", familyContext: decision.familyContext });
          return;
        }

        if (decision.familyContext.status === "ready") {
          setState({ status: "approved", familyContext: decision.familyContext });
          return;
        }

        setState({ status: "redirecting", familyContext: decision.familyContext });
      } catch {
        if (isActive) {
          setState({ status: "error", familyContext: null });
        }
      }
    }

    void resolveAccess();

    return () => {
      isActive = false;
    };
  }, [pathname, router]);

  return state;
}

export function ProtectedFamilyRoute({ children }: { children: ReactNode }) {
  const access = useFamilyAccess();

  if (access.status === "approved") {
    return <>{children}</>;
  }

  if (access.status === "pending") {
    return <LockedFeatureState />;
  }

  if (access.status === "error") {
    return (
      <PageContainer>
        <Card tone="default">
          <EmptyState title="Could not verify family access" description="Please refresh the page and try again." />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card tone="default">
        <EmptyState title="Checking family access" description="One moment while we verify your family membership." />
      </Card>
    </PageContainer>
  );
}
