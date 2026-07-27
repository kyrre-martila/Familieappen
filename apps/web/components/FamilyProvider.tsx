"use client";

import type { AuthLifecycleError, FamilyLifecycleState } from "@familieappen/shared";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, type FamilyWithMembership } from "../lib/api";
import { forceFamilyBootstrapRestart, loadAvailableFamilies, type FamilyBootstrapResult } from "../lib/auth-family";
import { useAuth } from "./AuthProvider";

type FamilyState = FamilyLifecycleState<FamilyWithMembership>;
interface FamilyContextValue { state: FamilyState; retry: () => void; familyContext: FamilyBootstrapResult | null; }
const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { state: auth } = useAuth();
  const [state, setState] = useState<FamilyState>({ status: "idle", families: [], activeFamilyId: null, error: null });
  const [familyContext, setFamilyContext] = useState<FamilyBootstrapResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const retry = useCallback(() => { forceFamilyBootstrapRestart(); setAttempt((value) => value + 1); }, []);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    if (auth.status !== "authenticated") {
      setFamilyContext(null);
      setState({ status: "idle", families: [], activeFamilyId: null, error: null });
      return;
    }
    setState({ status: "loading", families: [], activeFamilyId: null, error: null });
    void loadAvailableFamilies().then((result) => {
      if (generation.current !== currentGeneration) return;
      setFamilyContext(result);
      if (result.status === "ready") setState({ status: "ready", families: result.families, activeFamilyId: result.activeFamilyId, error: null });
      else if (result.status === "pending") setState({ status: "pending", families: result.families, activeFamilyId: result.activeFamilyId, error: null });
      else setState({ status: "no-family", families: [], activeFamilyId: null, error: null });
    }).catch((error) => {
      if (generation.current !== currentGeneration) return;
      const lifecycleError: AuthLifecycleError = { code: error instanceof ApiError && (error.code === "network.timeout" || error.code === "network.unavailable") ? error.code : "unknown", message: error instanceof Error ? error.message : "Kunne ikke hente familier.", retryable: true };
      setState({ status: "error", families: [], activeFamilyId: null, error: lifecycleError });
    });
  }, [auth.status, attempt]);

  return <FamilyContext.Provider value={{ state, retry, familyContext }}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue { const value = useContext(FamilyContext); if (!value) throw new Error("useFamily must be used inside FamilyProvider"); return value; }
