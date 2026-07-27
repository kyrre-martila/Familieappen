"use client";

import type { AuthLifecycleError, FamilyLifecycleState } from "@familieappen/shared";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, type FamilyWithMembership } from "../lib/api";
import { forceFamilyBootstrapRestart, loadAvailableFamilies, type FamilyBootstrapResult } from "../lib/auth-family";
import { OperationEpoch } from "../lib/auth-coordination";
import { useAuth } from "./AuthProvider";

type FamilyState = FamilyLifecycleState<FamilyWithMembership>;
interface FamilyContextValue { state: FamilyState; retry: () => void; familyContext: FamilyBootstrapResult | null; }
const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { state: auth } = useAuth();
  const [state, setState] = useState<FamilyState>({ status: "idle", families: [], activeFamilyId: null, error: null });
  const [familyContext, setFamilyContext] = useState<FamilyBootstrapResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const epoch = useRef(new OperationEpoch());
  const activeController = useRef<AbortController | null>(null);
  const retry = useCallback(() => { forceFamilyBootstrapRestart(); setAttempt((value) => value + 1); }, []);

  useEffect(() => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const operation = epoch.current.begin();
    if (auth.status !== "authenticated") {
      setFamilyContext(null);
      setState({ status: "idle", families: [], activeFamilyId: null, error: null });
      controller.abort();
      return () => epoch.current.invalidate();
    }
    setState({ status: "loading", families: [], activeFamilyId: null, error: null });
    void loadAvailableFamilies(undefined, controller.signal).then((result) => {
      if (!epoch.current.isCurrent(operation) || controller.signal.aborted) return;
      setFamilyContext(result);
      if (result.status === "ready") setState({ status: "ready", families: result.families, activeFamilyId: result.activeFamilyId, error: null });
      else if (result.status === "pending") setState({ status: "pending", families: result.families, activeFamilyId: result.activeFamilyId, error: null });
      else setState({ status: "no-family", families: [], activeFamilyId: null, error: null });
    }).catch((error) => {
      if (!epoch.current.isCurrent(operation) || controller.signal.aborted || (error instanceof ApiError && error.code === "request.aborted")) return;
      const lifecycleError: AuthLifecycleError = { code: error instanceof ApiError && (error.code === "network.timeout" || error.code === "network.unavailable") ? error.code : "unknown", message: error instanceof Error ? error.message : "Kunne ikke hente familier.", retryable: true };
      setState({ status: "error", families: [], activeFamilyId: null, error: lifecycleError });
    });
    return () => {
      controller.abort();
      epoch.current.invalidate();
      if (activeController.current === controller) activeController.current = null;
    };
  }, [auth.status, attempt]);

  return <FamilyContext.Provider value={{ state, retry, familyContext }}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue { const value = useContext(FamilyContext); if (!value) throw new Error("useFamily must be used inside FamilyProvider"); return value; }
