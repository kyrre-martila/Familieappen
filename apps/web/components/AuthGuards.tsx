"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LockedFeatureState } from "./PendingAccess";
import { Button, Card, EmptyState, PageContainer } from "./ui";
import { useAuth } from "./AuthProvider";
import { useFamily } from "./FamilyProvider";
import { getLoginRoute } from "../lib/onboarding-access";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { state, retry } = useAuth(); const router = useRouter(); const pathname = usePathname();
  useEffect(() => { if (state.status === "unauthenticated") router.replace(getLoginRoute(pathname)); }, [state.status, router, pathname]);
  if (state.status === "authenticated") return <>{children}</>;
  if (state.status === "transient-error") return <RetryState title="Kunne ikke validere økten" message={state.error.message} retry={retry} />;
  return <LoadingState title={state.status === "unauthenticated" ? "Sender deg til innlogging" : "Validerer økten"} />;
}

export function RequireFamily({ children }: { children: ReactNode }) {
  const { state, retry } = useFamily();
  const router = useRouter();
  useEffect(() => { if (state.status === "no-family") router.replace("/onboarding/family-start"); }, [router, state.status]);
  if (state.status === "ready") return <>{children}</>;
  if (state.status === "pending") return <LockedFeatureState />;
  if (state.status === "error") return <RetryState title="Kunne ikke sjekke familietilgang" message={state.error.message} retry={async () => retry()} />;
  if (state.status === "no-family") return <LoadingState title="Sender deg til familieoppsett" />;
  if (state.status === "idle") return <LoadingState title="Venter på innlogging" />;
  return <LoadingState title="Sjekker familietilgang" />;
}

export function RequireNoFamily({ children }: { children: ReactNode }) { const { state } = useFamily(); return state.status === "no-family" ? <>{children}</> : null; }
export function RequirePendingFamily({ children }: { children: ReactNode }) { const { state } = useFamily(); return state.status === "pending" ? <>{children}</> : null; }
function LoadingState({ title }: { title: string }) { return <PageContainer><Card tone="default"><EmptyState title={title} description="Vent litt …" /></Card></PageContainer>; }
function RetryState({ title, message, retry }: { title: string; message: string; retry: () => Promise<void> }) { return <PageContainer><Card tone="default"><EmptyState title={title} description={message} /><Button variant="primary" onClick={() => void retry()}>Prøv igjen</Button></Card></PageContainer>; }
