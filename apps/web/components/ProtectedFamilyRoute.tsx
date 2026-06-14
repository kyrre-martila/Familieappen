"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LockedFeatureState } from "./PendingAccess";
import { Button, Card, EmptyState, PageContainer } from "./ui";
import { redirectIfNeeded, resolveProtectedFamilyRoute } from "../lib/onboarding-access";
import { getCachedFamilyBootstrapResult, handleMissingOrInvalidAuth, type FamilyBootstrapResult } from "../lib/auth-family";

type FamilyAccessState =
  | { status: "loading"; familyContext: null }
  | { status: "approved"; familyContext: Extract<FamilyBootstrapResult, { status: "ready" }> }
  | { status: "pending"; familyContext: Extract<FamilyBootstrapResult, { status: "pending" }> }
  | { status: "redirecting"; familyContext: FamilyBootstrapResult | null }
  | { status: "error"; familyContext: null };

type FamilyAccessHookState = FamilyAccessState & { retry: () => void };

export function useFamilyAccess(): FamilyAccessHookState {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<FamilyAccessState>(() => getFamilyAccessStateFromCache());
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function resolveAccess() {
      setState((currentState) => currentState.status === "approved" || currentState.status === "pending" ? currentState : getFamilyAccessStateFromCache());

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
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (handleMissingOrInvalidAuth(error, router)) {
          setState({ status: "redirecting", familyContext: null });
          return;
        }

        setState({ status: "error", familyContext: null });
      }
    }

    void resolveAccess();

    return () => {
      isActive = false;
    };
  }, [pathname, retryKey, router]);

  return { ...state, retry: () => setRetryKey((current) => current + 1) };
}

function getFamilyAccessStateFromCache(): FamilyAccessState {
  const cachedFamilyContext = getCachedFamilyBootstrapResult();

  if (cachedFamilyContext?.status === "ready") {
    return { status: "approved", familyContext: cachedFamilyContext };
  }

  if (cachedFamilyContext?.status === "pending") {
    return { status: "pending", familyContext: cachedFamilyContext };
  }

  return { status: "loading", familyContext: null };
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
          <EmptyState title="Kunne ikke sjekke familietilgang" description="Sjekken tok for lang tid eller feilet. Prøv igjen, eller logg inn på nytt hvis problemet fortsetter." />
          <Button variant="primary" onClick={access.retry}>Prøv igjen</Button>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card tone="default">
        <EmptyState title="Sjekker familietilgang" description="Vent litt mens vi bekrefter familietilknytningen din." />
        <Button onClick={access.retry}>Prøv igjen</Button>
      </Card>
    </PageContainer>
  );
}
