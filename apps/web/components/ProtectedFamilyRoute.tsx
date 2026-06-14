"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { LockedFeatureState } from "./PendingAccess";
import { Button, Card, EmptyState, PageContainer } from "./ui";
import {
  redirectIfNeeded,
  resolveProtectedFamilyRoute,
} from "../lib/onboarding-access";
import {
  forceFamilyBootstrapRestart,
  getCachedFamilyBootstrapResult,
  getFamilyBootstrapDebugSnapshot,
  handleMissingOrInvalidAuth,
  type FamilyBootstrapResult,
} from "../lib/auth-family";

const FAMILY_ACCESS_LOADING_TIMEOUT_MS = 20_000;
const FAMILY_ACCESS_DEBUG_AUTO_SHOW_MS = 3_000;
const PWA_RESUME_RETRY_THROTTLE_MS = 5_000;

type FamilyAccessState =
  | { status: "loading"; familyContext: null }
  | {
      status: "approved";
      familyContext: Extract<FamilyBootstrapResult, { status: "ready" }>;
    }
  | {
      status: "pending";
      familyContext: Extract<FamilyBootstrapResult, { status: "pending" }>;
    }
  | { status: "redirecting"; familyContext: FamilyBootstrapResult | null }
  | { status: "error"; familyContext: null };

type FamilyAccessHookState = FamilyAccessState & {
  retry: () => void;
  retryKey: number;
  loadingStartedAt: number | null;
};

export function useFamilyAccess(): FamilyAccessHookState {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<FamilyAccessState>(() =>
    getFamilyAccessStateFromCache(),
  );
  const [retryKey, setRetryKey] = useState(0);
  const loadingStartedAtRef = useRef<number | null>(
    state.status === "loading" ? Date.now() : null,
  );

  const retry = useCallback(() => {
    forceFamilyBootstrapRestart();
    setState(getFamilyAccessStateFromCache());
    setRetryKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function resolveAccess() {
      loadingStartedAtRef.current = Date.now();
      setState((currentState) =>
        currentState.status === "approved" || currentState.status === "pending"
          ? currentState
          : getFamilyAccessStateFromCache(),
      );

      try {
        const decision = await resolveProtectedFamilyRoute(pathname);

        if (!isActive) {
          return;
        }

        loadingStartedAtRef.current = null;

        if (decision.action === "redirect") {
          redirectIfNeeded(router, decision);
          setState({
            status: "redirecting",
            familyContext: decision.familyContext ?? null,
          });
          return;
        }

        if (decision.familyContext.status === "pending") {
          setState({
            status: "pending",
            familyContext: decision.familyContext,
          });
          return;
        }

        if (decision.familyContext.status === "ready") {
          setState({
            status: "approved",
            familyContext: decision.familyContext,
          });
          return;
        }

        setState({
          status: "redirecting",
          familyContext: decision.familyContext,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        loadingStartedAtRef.current = null;

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

  useEffect(() => {
    if (state.status !== "loading") {
      loadingStartedAtRef.current = null;
      return;
    }

    if (loadingStartedAtRef.current === null) {
      loadingStartedAtRef.current = Date.now();
    }

    const timeout = window.setTimeout(() => {
      console.info(
        "[family-bootstrap:temporary-diagnostics]",
        "bootstrap:timeout",
        { timeoutMs: FAMILY_ACCESS_LOADING_TIMEOUT_MS, pathname, retryKey },
      );
      setState((currentState) =>
        currentState.status === "loading"
          ? { status: "error", familyContext: null }
          : currentState,
      );
    }, FAMILY_ACCESS_LOADING_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [state.status, retryKey]);

  useEffect(() => {
    let lastResumeRetryAt = 0;

    function recoverFromResume(event?: PageTransitionEvent | Event) {
      const isPageShow = event?.type === "pageshow";
      const isBfcacheRestore =
        isPageShow && "persisted" in event && event.persisted;
      const isVisibleResume =
        event?.type === "visibilitychange" &&
        document.visibilityState !== "visible";

      if (isVisibleResume) {
        return;
      }

      const loadingStartedAt = loadingStartedAtRef.current;
      const hasStaleLoading =
        loadingStartedAt !== null &&
        Date.now() - loadingStartedAt > PWA_RESUME_RETRY_THROTTLE_MS;

      if (!isBfcacheRestore && !hasStaleLoading) {
        return;
      }

      const now = Date.now();
      if (now - lastResumeRetryAt < PWA_RESUME_RETRY_THROTTLE_MS) {
        return;
      }

      lastResumeRetryAt = now;
      console.info(
        "[family-bootstrap:temporary-diagnostics]",
        "bootstrap:retry",
        { reason: "resume-recovery", pathname },
      );
      retry();
      router.refresh();
    }

    window.addEventListener("pageshow", recoverFromResume);
    document.addEventListener("visibilitychange", recoverFromResume);
    window.addEventListener("focus", recoverFromResume);

    return () => {
      window.removeEventListener("pageshow", recoverFromResume);
      document.removeEventListener("visibilitychange", recoverFromResume);
      window.removeEventListener("focus", recoverFromResume);
    };
  }, [retry, router]);

  return {
    ...state,
    retry,
    retryKey,
    loadingStartedAt: loadingStartedAtRef.current,
  };
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

function hasFamilyAccessDebugQueryParam(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    new URLSearchParams(window.location.search).get("debugFamilyAccess") === "1"
  );
}

function useShowTemporaryFamilyAccessDebugPanel(
  access: FamilyAccessHookState,
): boolean {
  const [queryEnabled, setQueryEnabled] = useState(() =>
    hasFamilyAccessDebugQueryParam(),
  );
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    setQueryEnabled(hasFamilyAccessDebugQueryParam());
  }, []);

  useEffect(() => {
    if (access.status !== "loading") {
      setLoadingTimedOut(false);
      return;
    }

    if (queryEnabled) {
      return;
    }

    const timeout = window.setTimeout(
      () => setLoadingTimedOut(true),
      FAMILY_ACCESS_DEBUG_AUTO_SHOW_MS,
    );

    return () => window.clearTimeout(timeout);
  }, [access.status, queryEnabled, access.retryKey]);

  return access.status === "error" || queryEnabled || loadingTimedOut;
}

export function ProtectedFamilyRoute({ children }: { children: ReactNode }) {
  const access = useFamilyAccess();
  const pathname = usePathname();
  const showDebugPanel = useShowTemporaryFamilyAccessDebugPanel(access);

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
          <EmptyState
            title="Kunne ikke sjekke familietilgang"
            description="Sjekken tok for lang tid eller feilet. Prøv igjen, eller logg inn på nytt hvis problemet fortsetter."
          />
          <Button variant="primary" onClick={access.retry}>
            Prøv igjen
          </Button>
          {showDebugPanel ? (
            <TemporaryFamilyAccessDebugPanel
              pathname={pathname}
              access={access}
            />
          ) : null}
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card tone="default">
        <EmptyState
          title="Sjekker familietilgang"
          description="Vent litt mens vi bekrefter familietilknytningen din."
        />
        <Button onClick={access.retry}>Prøv igjen</Button>
        {showDebugPanel ? (
          <TemporaryFamilyAccessDebugPanel
            pathname={pathname}
            access={access}
          />
        ) : null}
      </Card>
    </PageContainer>
  );
}

function TemporaryFamilyAccessDebugPanel({
  pathname,
  access,
}: {
  pathname: string;
  access: FamilyAccessHookState;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);

    return () => window.clearInterval(interval);
  }, []);

  const bootstrapDebug = getFamilyBootstrapDebugSnapshot();
  const loadingDurationMs =
    access.loadingStartedAt === null ? null : now - access.loadingStartedAt;
  const rows = [
    ["pathname", pathname],
    ["familyAccessStatus", access.status],
    [
      "familyContextStatus",
      access.familyContext === null ? "none" : access.familyContext.status,
    ],
    ["standalonePwa", String(isStandalonePwa())],
    [
      "document.visibilityState",
      typeof document === "undefined" ? "unknown" : document.visibilityState,
    ],
    [
      "navigator.onLine",
      typeof navigator === "undefined" ? "unknown" : String(navigator.onLine),
    ],
    ["accessTokenExists", String(bootstrapDebug.accessTokenExists)],
    ["activeFamilyIdExists", String(bootstrapDebug.activeFamilyIdExists)],
    ["lastBootstrapStartedAt", bootstrapDebug.lastBootstrapStartedAt ?? "none"],
    [
      "lastBootstrapFinishedAt",
      bootstrapDebug.lastBootstrapFinishedAt ?? "none",
    ],
    ["lastBootstrapErrorCode", bootstrapDebug.lastBootstrapErrorCode ?? "none"],
    [
      "lastBootstrapErrorMessage",
      bootstrapDebug.lastBootstrapErrorMessage ?? "none",
    ],
    ["bootstrapInFlight", String(bootstrapDebug.bootstrapInFlight)],
    ["retryKey / attempt count", String(access.retryKey)],
    [
      "seconds in loading state",
      loadingDurationMs === null
        ? "not loading"
        : String(Math.floor(loadingDurationMs / 1_000)),
    ],
  ];

  return (
    <div
      aria-label="Temporary family access diagnostics"
      style={{
        marginTop: "1rem",
        border: "1px dashed #94a3b8",
        borderRadius: "0.75rem",
        padding: "0.75rem",
        textAlign: "left",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: "0.75rem",
        overflowWrap: "anywhere",
      }}
    >
      <strong>Midlertidig feilsøking</strong>
      <dl style={{ margin: "0.5rem 0 0", display: "grid", gap: "0.25rem" }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: "grid", gap: "0.125rem" }}>
            <dt style={{ color: "#475569" }}>{label}</dt>
            <dd style={{ margin: 0 }}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true)
  );
}
