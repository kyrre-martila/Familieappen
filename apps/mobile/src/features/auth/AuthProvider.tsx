import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../lib/api/client";
import { authStorage } from "../../lib/auth/authStorage";
import { getCurrentUser, loginWithEmail, logoutSession } from "./api";
import type { AuthUser } from "./types";

export type AuthStatus = "unknown" | "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("unknown");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const becomeUnauthenticated = useCallback(async () => {
    await authStorage.clearSession();
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const restoreSession = useCallback(async () => {
    setStatus("loading");
    const session = await authStorage.getSession();
    if (!session) {
      await becomeUnauthenticated();
      return;
    }
    try {
      const restoredUser = await getCurrentUser(session.accessToken);
      setAccessToken(session.accessToken);
      setUser(restoredUser);
      setStatus("authenticated");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) await queryClient.clear();
      await becomeUnauthenticated();
    }
  }, [becomeUnauthenticated, queryClient]);

  useEffect(() => {
    const timeout = setTimeout(() => { void restoreSession(); }, 0);
    return () => clearTimeout(timeout);
  }, [restoreSession]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    setStatus("loading");
    const auth = await loginWithEmail(input);
    await authStorage.saveSession(auth.tokens);
    setAccessToken(auth.tokens.accessToken);
    setUser(auth.user);
    setStatus("authenticated");
    await queryClient.clear();
    await queryClient.prefetchQuery({ queryKey: ["auth", "me"], queryFn: () => getCurrentUser(auth.tokens.accessToken) });
    router.replace("/(app)/(tabs)");
  }, [queryClient]);

  const logout = useCallback(async () => {
    setStatus("loading");
    const token = accessToken;
    try {
      if (token) await logoutSession(token);
    } catch {
      // Local logout must still complete if the server session is already gone or unreachable.
    } finally {
      await authStorage.clearSession();
      await queryClient.clear();
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
      router.replace("/(auth)/login");
    }
  }, [accessToken, queryClient]);

  const value = useMemo<AuthContextValue>(() => ({ status, user, accessToken, isLoading: status === "unknown" || status === "loading", isAuthenticated: status === "authenticated", login, logout, restoreSession }), [accessToken, login, logout, restoreSession, status, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
