import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../lib/api/client";
import { authStorage } from "../../lib/auth/authStorage";
import {
  getCurrentUser,
  getMyPendingFamilyAccess,
  listFamilies,
  loginWithEmail,
  logoutSession,
  registerAccount,
} from "./api";
import {
  isNetworkApiError,
  isStoredSessionExpired,
  isUnauthorizedApiError,
  POST_LOGIN_SESSION_ERROR_MESSAGE,
  RESTORE_NETWORK_MESSAGE,
} from "./sessionPolicy";
import {
  getPostAuthDestination,
  resolveFamilyStatus,
  type AuthDestination,
  type FamilyBootstrapStatus,
} from "./routes";
import type { AuthResponse, AuthUser } from "./types";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  familyStatus: FamilyBootstrapStatus;
  authDestination: AuthDestination;
  isRestoring: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  restoreError: string | null;
  login: (input: { email: string; password: string }) => Promise<void>;
  completeAuthentication: (auth: AuthResponse) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  refreshFamilyStatus: () => Promise<void>;
  setCurrentUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("unknown");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [familyStatus, setFamilyStatus] =
    useState<FamilyBootstrapStatus>("unknown");
  const [isRestoring, setIsRestoring] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const restorePromiseRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const setUnauthenticatedState = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setFamilyStatus("unknown");
    setStatus("unauthenticated");
  }, []);

  const clearLocalSession = useCallback(async () => {
    await authStorage.clearSession();
    await queryClient.clear();
    setUnauthenticatedState();
  }, [queryClient, setUnauthenticatedState]);

  const restoreSession = useCallback(async () => {
    if (restorePromiseRef.current) return restorePromiseRef.current;
    const restorePromise = (async () => {
      if (!mountedRef.current) return;
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
          const [families, pendingAccess] = await Promise.all([
            listFamilies(session.accessToken),
            getMyPendingFamilyAccess(session.accessToken),
          ]);
          setAccessToken(session.accessToken);
          setUser(restoredUser);
          setFamilyStatus(resolveFamilyStatus(families, pendingAccess, restoredUser));
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
          router.replace("/(auth)/login");
        }
      } finally {
        if (mountedRef.current) setIsRestoring(false);
        restorePromiseRef.current = null;
      }
    })();
    restorePromiseRef.current = restorePromise;
    return restorePromise;
  }, [clearLocalSession, setUnauthenticatedState]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void restoreSession();
    }, 0);
    return () => clearTimeout(timeout);
  }, [restoreSession]);

  const completeAuthentication = useCallback(
    async (auth: AuthResponse) => {
      await authStorage.saveSession(auth.tokens);
      const validatedUser = await getCurrentUser(auth.tokens.accessToken);
      const [families, pendingAccess] = await Promise.all([
        listFamilies(auth.tokens.accessToken),
        getMyPendingFamilyAccess(auth.tokens.accessToken),
      ]);
      await queryClient.clear();
      queryClient.setQueryData(["auth", "me"], validatedUser);
      queryClient.setQueryData(["auth", "families"], families);
      setAccessToken(auth.tokens.accessToken);
      setUser(validatedUser);
      setFamilyStatus(resolveFamilyStatus(families, pendingAccess, validatedUser));
      setStatus("authenticated");
    },
    [queryClient],
  );

  const refreshFamilyStatus = useCallback(async () => {
    const token = accessToken;
    if (!token) return;
    const [families, pendingAccess, currentUser] = await Promise.all([
      listFamilies(token),
      getMyPendingFamilyAccess(token),
      getCurrentUser(token),
    ]);
    queryClient.setQueryData(["auth", "families"], families);
    queryClient.setQueryData(["auth", "me"], currentUser);
    setUser(currentUser);
    setFamilyStatus(resolveFamilyStatus(families, pendingAccess, currentUser));
  }, [accessToken, queryClient]);

  const setCurrentUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    queryClient.setQueryData(["auth", "me"], nextUser);
  }, [queryClient]);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      setIsLoggingIn(true);
      setRestoreError(null);
      try {
        const auth = await loginWithEmail(input);
        try {
          await completeAuthentication(auth);
        } catch {
          await authStorage.clearSession();
          await queryClient.clear();
          setUnauthenticatedState();
          throw new ApiError(
            POST_LOGIN_SESSION_ERROR_MESSAGE,
            0,
            "auth.session_setup_failed",
          );
        }
      } finally {
        setIsLoggingIn(false);
      }
    },
    [completeAuthentication, queryClient, setUnauthenticatedState],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const auth = await registerAccount(input);
      try {
        await completeAuthentication(auth);
      } catch {
        await authStorage.clearSession();
        await queryClient.clear();
        setUnauthenticatedState();
        throw new ApiError(
          POST_LOGIN_SESSION_ERROR_MESSAGE,
          0,
          "auth.session_setup_failed",
        );
      }
    },
    [completeAuthentication, queryClient, setUnauthenticatedState],
  );

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
        router.replace("/(auth)/login");
      }
    } finally {
      setIsLoggingOut(false);
    }
  }, [accessToken, clearLocalSession]);

  const authDestination = getPostAuthDestination(
    status === "authenticated"
      ? { auth: "authenticated", familyStatus }
      : { auth: "unauthenticated" },
  );
  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      familyStatus,
      authDestination,
      isRestoring,
      isLoggingIn,
      isLoggingOut,
      isLoading: isRestoring,
      isAuthenticated: status === "authenticated",
      restoreError,
      login,
      completeAuthentication,
      register,
      refreshFamilyStatus,
      setCurrentUser,
      logout,
      restoreSession,
    }),
    [
      accessToken,
      authDestination,
      completeAuthentication,
      familyStatus,
      isLoggingIn,
      isLoggingOut,
      isRestoring,
      login,
      logout,
      refreshFamilyStatus,
      register,
      restoreError,
      setCurrentUser,
      restoreSession,
      status,
      user,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
