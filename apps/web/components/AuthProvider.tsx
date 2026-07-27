"use client";

import type { AuthLifecycleError, AuthLifecycleState } from "@familieappen/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, getCurrentUserProfile, login as loginRequest, logout as logoutRequest, refreshAuthSession, setUnauthorizedListener, type AuthResponse, type AuthUser } from "../lib/api";
import { clearAuthSession, getAccessToken, saveAuthSession } from "../lib/session";
import { parseAuthSyncEvent, ResumeGate } from "../lib/auth-coordination";

const CHANNEL = "familieappen.auth";
const STORAGE_EVENT_KEY = "familieappen.auth.event";
const RESUME_THROTTLE_MS = 5_000;

type AuthState = AuthLifecycleState<AuthUser>;
interface AuthContextValue {
  state: AuthState;
  user: AuthUser | null;
  restoreSession: () => Promise<void>;
  retry: () => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  establishSession: (auth: AuthResponse) => Promise<AuthUser>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "bootstrapping", user: null, error: null });
  const generation = useRef(0);
  const restoreInFlight = useRef<Promise<void> | null>(null);
  const resumeGate = useRef(new ResumeGate(RESUME_THROTTLE_MS));
  const channel = useRef<BroadcastChannel | null>(null);

  const publish = useCallback((event: "login" | "logout") => {
    channel.current?.postMessage({ event });
    try { localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify({ event, at: Date.now() })); } catch { /* constrained PWA storage */ }
  }, []);

  const becomeUnauthenticated = useCallback((broadcast = false) => {
    generation.current += 1;
    clearAuthSession();
    setState({ status: "unauthenticated", user: null, error: null });
    if (broadcast) publish("logout");
  }, [publish]);

  const restoreSession = useCallback((): Promise<void> => {
    if (restoreInFlight.current) return restoreInFlight.current;
    const requestGeneration = ++generation.current;
    const operation = (async () => {
      setState((current) => current.status === "authenticated" ? current : { status: "bootstrapping", user: null, error: null });
      try {
        if (!getAccessToken()) await refreshAuthSession();
        const user = await getCurrentUserProfile();
        if (generation.current === requestGeneration) setState({ status: "authenticated", user, error: null });
      } catch (error) {
        if (generation.current !== requestGeneration) return;
        if (isUnauthenticatedError(error)) {
          becomeUnauthenticated(false);
        } else if (!(error instanceof ApiError && error.code === "request.aborted")) {
          setState({ status: "transient-error", user: null, error: toLifecycleError(error) });
        }
      }
    })().finally(() => {
      if (restoreInFlight.current === operation) restoreInFlight.current = null;
    });
    restoreInFlight.current = operation;
    return operation;
  }, [becomeUnauthenticated]);

  const establishSession = useCallback(async (auth: AuthResponse) => {
    const requestGeneration = ++generation.current;
    saveAuthSession(auth);
    const user = await getCurrentUserProfile();
    if (generation.current === requestGeneration) setState({ status: "authenticated", user, error: null });
    publish("login");
    return user;
  }, [publish]);

  const login = useCallback(async (input: { email: string; password: string }) => establishSession(await loginRequest(input)), [establishSession]);
  const logout = useCallback(async () => {
    generation.current += 1;
    try { await logoutRequest(); } finally { becomeUnauthenticated(true); }
  }, [becomeUnauthenticated]);

  useEffect(() => { void restoreSession(); }, [restoreSession]);
  useEffect(() => setUnauthorizedListener(() => becomeUnauthenticated(true)), [becomeUnauthenticated]);
  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") channel.current = new BroadcastChannel(CHANNEL);
    const receive = (event: "login" | "logout") => event === "logout" ? becomeUnauthenticated(false) : void restoreSession();
    const onChannel = (event: MessageEvent<unknown>) => { const value = parseAuthSyncEvent(event.data); if (value) receive(value); };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_EVENT_KEY || !event.newValue) return;
      try { const value = parseAuthSyncEvent(JSON.parse(event.newValue)); if (value) receive(value); } catch { /* ignore malformed cross-tab events */ }
    };
    channel.current?.addEventListener("message", onChannel);
    window.addEventListener("storage", onStorage);
    return () => { channel.current?.close(); channel.current = null; window.removeEventListener("storage", onStorage); };
  }, [becomeUnauthenticated, restoreSession]);
  useEffect(() => {
    const resume = (event: Event) => {
      if (event.type === "visibilitychange" && document.visibilityState !== "visible") return;
      if (!resumeGate.current.shouldRun(Date.now())) return;
      void restoreSession();
    };
    window.addEventListener("pageshow", resume); window.addEventListener("focus", resume); window.addEventListener("online", resume); document.addEventListener("visibilitychange", resume);
    return () => { window.removeEventListener("pageshow", resume); window.removeEventListener("focus", resume); window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", resume); };
  }, [restoreSession]);

  const value = useMemo<AuthContextValue>(() => ({ state, user: state.user, restoreSession, retry: restoreSession, login, logout, establishSession, getAccessToken }), [state, restoreSession, login, logout, establishSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
function isUnauthenticatedError(error: unknown) { return error instanceof ApiError && (error.status === 401 || error.code === "auth.expired_token" || error.code === "auth.invalid_token"); }
function toLifecycleError(error: unknown): AuthLifecycleError { const code = error instanceof ApiError && (error.code === "network.unavailable" || error.code === "network.timeout" || error.code === "request.aborted") ? error.code : "unknown"; return { code, message: error instanceof Error ? error.message : "Kunne ikke validere økten.", retryable: true }; }
