"use client";

import type { AuthLifecycleError, AuthLifecycleState } from "@familieappen/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, getCurrentUserProfile, login as loginRequest, logout as logoutRequest, refreshAuthSession, setUnauthorizedListener, type AuthResponse, type AuthUser } from "../lib/api";
import { clearAuthSession, getAccessToken, saveAuthSession } from "../lib/session";
import { createAuthSyncEvent, OperationEpoch, parseAuthSyncMessage, ResumeGate } from "../lib/auth-coordination";

const CHANNEL = "familieappen.auth";
const STORAGE_EVENT_KEY = "familieappen.auth.event";
const RESUME_THROTTLE_MS = 5_000;

type AuthState = AuthLifecycleState<AuthUser>;
interface AuthContextValue { state: AuthState; user: AuthUser | null; restoreSession: (force?: boolean) => Promise<void>; retry: () => Promise<void>; login: (input: { email: string; password: string }) => Promise<AuthUser>; establishSession: (auth: AuthResponse) => Promise<AuthUser>; logout: () => Promise<void>; getAccessToken: () => string | null; }
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "bootstrapping", user: null, error: null });
  const status = useRef<AuthState["status"]>("bootstrapping");
  const epoch = useRef(new OperationEpoch());
  const restoreInFlight = useRef<{ promise: Promise<void>; controller: AbortController } | null>(null);
  const resumeGate = useRef(new ResumeGate(RESUME_THROTTLE_MS));
  const channel = useRef<BroadcastChannel | null>(null);
  const seenEvents = useRef(new Set<string>());

  const transition = useCallback((next: AuthState) => { status.current = next.status; setState(next); }, []);
  const publish = useCallback((event: "login" | "logout") => {
    const message = createAuthSyncEvent(event);
    seenEvents.current.add(message.id);
    channel.current?.postMessage(message);
    try { localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(message)); } catch { /* constrained PWA storage */ }
  }, []);
  const invalidateRestore = useCallback(() => { epoch.current.invalidate(); restoreInFlight.current?.controller.abort(); restoreInFlight.current = null; }, []);
  const becomeUnauthenticated = useCallback((broadcast = false) => {
    const changed = status.current !== "unauthenticated";
    invalidateRestore(); clearAuthSession();
    transition({ status: "unauthenticated", user: null, error: null });
    if (broadcast && changed) publish("logout");
  }, [invalidateRestore, publish, transition]);

  const restoreSession = useCallback((force = false): Promise<void> => {
    if (!force && restoreInFlight.current) return restoreInFlight.current.promise;
    invalidateRestore();
    const controller = new AbortController();
    const operationEpoch = epoch.current.begin();
    if (status.current !== "authenticated") transition({ status: "bootstrapping", user: null, error: null });
    const promise = (async () => {
      try {
        if (!getAccessToken()) await refreshAuthSession(controller.signal);
        const user = await getCurrentUserProfile(controller.signal);
        if (epoch.current.isCurrent(operationEpoch) && !controller.signal.aborted) transition({ status: "authenticated", user, error: null });
      } catch (error) {
        if (!epoch.current.isCurrent(operationEpoch) || controller.signal.aborted) return;
        if (isUnauthenticatedError(error)) becomeUnauthenticated(false);
        else transition({ status: "transient-error", user: null, error: toLifecycleError(error) });
      }
    })().finally(() => { if (restoreInFlight.current?.promise === promise) restoreInFlight.current = null; });
    restoreInFlight.current = { promise, controller };
    return promise;
  }, [becomeUnauthenticated, invalidateRestore, transition]);

  const establishSession = useCallback(async (auth: AuthResponse) => {
    invalidateRestore(); const operationEpoch = epoch.current.begin(); saveAuthSession(auth);
    const controller = new AbortController();
    const user = await getCurrentUserProfile(controller.signal);
    if (epoch.current.isCurrent(operationEpoch)) {
      transition({ status: "authenticated", user, error: null });
      publish("login");
    }
    return user;
  }, [invalidateRestore, publish, transition]);
  const login = useCallback(async (input: { email: string; password: string }) => { invalidateRestore(); return establishSession(await loginRequest(input)); }, [establishSession, invalidateRestore]);
  const logout = useCallback(async () => { invalidateRestore(); try { await logoutRequest(); } finally { becomeUnauthenticated(true); } }, [becomeUnauthenticated, invalidateRestore]);

  useEffect(() => { resumeGate.current.shouldRun(Date.now()); void restoreSession(); return invalidateRestore; }, [invalidateRestore, restoreSession]);
  useEffect(() => setUnauthorizedListener(() => becomeUnauthenticated(true)), [becomeUnauthenticated]);
  useEffect(() => {
    const currentChannel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL); channel.current = currentChannel;
    const receive = (data: unknown) => { const message = parseAuthSyncMessage(data); if (!message || seenEvents.current.has(message.id)) return; seenEvents.current.add(message.id); if (message.event === "logout") becomeUnauthenticated(false); else void restoreSession(true); };
    const onChannel = (event: MessageEvent<unknown>) => receive(event.data);
    const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_EVENT_KEY && event.newValue) try { receive(JSON.parse(event.newValue)); } catch { /* malformed event */ } };
    currentChannel?.addEventListener("message", onChannel); window.addEventListener("storage", onStorage);
    return () => { currentChannel?.removeEventListener("message", onChannel); currentChannel?.close(); if (channel.current === currentChannel) channel.current = null; window.removeEventListener("storage", onStorage); };
  }, [becomeUnauthenticated, restoreSession]);
  useEffect(() => {
    // Ordinary resume events are throttled as one burst. A persisted pageshow is
    // a bfcache restore and deliberately invalidates/thoroughly revalidates.
    const resume = (event: Event) => { if (event.type === "visibilitychange" && document.visibilityState !== "visible") return; const forced = event.type === "pageshow" && (event as PageTransitionEvent).persisted; if (!forced && !resumeGate.current.shouldRun(Date.now())) return; void restoreSession(forced); };
    window.addEventListener("pageshow", resume); window.addEventListener("focus", resume); window.addEventListener("online", resume); document.addEventListener("visibilitychange", resume);
    return () => { window.removeEventListener("pageshow", resume); window.removeEventListener("focus", resume); window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", resume); };
  }, [restoreSession]);

  const value = useMemo<AuthContextValue>(() => ({ state, user: state.user, restoreSession, retry: () => restoreSession(true), login, logout, establishSession, getAccessToken }), [state, restoreSession, login, logout, establishSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
function isUnauthenticatedError(error: unknown) { return error instanceof ApiError && (error.status === 401 || error.code === "auth.expired_token" || error.code === "auth.invalid_token"); }
function toLifecycleError(error: unknown): AuthLifecycleError { const code = error instanceof ApiError && (error.code === "network.unavailable" || error.code === "network.timeout" || error.code === "request.aborted") ? error.code : "unknown"; return { code, message: error instanceof Error ? error.message : "Kunne ikke validere økten.", retryable: true }; }
