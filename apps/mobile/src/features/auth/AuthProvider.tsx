import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../lib/api/client";
import { authStorage } from "../../lib/auth/authStorage";
import { getCurrentUser, loginWithEmail, logoutSession } from "./api";
import { isNetworkApiError, isStoredSessionExpired, isUnauthorizedApiError, POST_LOGIN_SESSION_ERROR_MESSAGE, RESTORE_NETWORK_MESSAGE } from "./sessionPolicy";
import type { AuthUser } from "./types";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  isRestoring: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  restoreError: string | null;
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
  const [isRestoring, setIsRestoring] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const setUnauthenticatedState = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const clearLocalSession = useCallback(async () => {
    await authStorage.clearSession();
    await queryClient.clear();
    setUnauthenticatedState();
  }, [queryClient, setUnauthenticatedState]);

  const restoreSession = useCallback(async () => {
    setIsRestoring(true);
    setRestoreError(null);
    try {
      const session = await authStorage.getSession();
      if (!session) {
        setUnauthenticatedState();
        return;
      }
      if (isStoredSessionExpired(session)) {
        await clearLocalSession();
        return;
      }

      try {
        const restoredUser = await getCurrentUser(session.accessToken);
        setAccessToken(session.accessToken);
        setUser(restoredUser);
        setStatus("authenticated");
      } catch (error) {
        if (isUnauthorizedApiError(error)) {
          await clearLocalSession();
          return;
        }
        if (isNetworkApiError(error)) {
          // Run 1A has no refresh/offline session mode. Keep the stored access token so a later app start can retry,
          // but do not present authenticated content until /me has validated the token.
          setRestoreError(RESTORE_NETWORK_MESSAGE);
          setUnauthenticatedState();
          return;
        }
        await clearLocalSession();
      }
    } finally {
      setIsRestoring(false);
    }
  }, [clearLocalSession, setUnauthenticatedState]);

  useEffect(() => {
    const timeout = setTimeout(() => { void restoreSession(); }, 0);
    return () => clearTimeout(timeout);
  }, [restoreSession]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    setIsLoggingIn(true);
    setRestoreError(null);
    try {
      const auth = await loginWithEmail(input);
      try {
        await authStorage.saveSession(auth.tokens);
        const validatedUser = await getCurrentUser(auth.tokens.accessToken);
        await queryClient.clear();
        queryClient.setQueryData(["auth", "me"], validatedUser);
        setAccessToken(auth.tokens.accessToken);
        setUser(validatedUser);
        setStatus("authenticated");
      } catch {
        await authStorage.clearSession();
        await queryClient.clear();
        setUnauthenticatedState();
        throw new ApiError(POST_LOGIN_SESSION_ERROR_MESSAGE, 0, "auth.session_setup_failed");
      }
    } finally {
      setIsLoggingIn(false);
    }
  }, [queryClient, setUnauthenticatedState]);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    const token = accessToken;
    try {
      try {
        if (token) await logoutSession(token);
      } catch {
        // Local logout must still complete if the server session is already gone or unreachable.
      } finally {
        await clearLocalSession();
      }
    } finally {
      setIsLoggingOut(false);
    }
  }, [accessToken, clearLocalSession]);

  const value = useMemo<AuthContextValue>(() => ({ status, user, accessToken, isRestoring, isLoggingIn, isLoggingOut, isLoading: isRestoring, isAuthenticated: status === "authenticated", restoreError, login, logout, restoreSession }), [accessToken, isLoggingIn, isLoggingOut, isRestoring, login, logout, restoreError, restoreSession, status, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
