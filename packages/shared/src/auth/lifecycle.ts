/** Platform-neutral states shared by the web and native auth implementations. */
export type AuthLifecycleState<TUser> =
  | { status: "bootstrapping"; user: null; error: null }
  | { status: "unauthenticated"; user: null; error: null }
  | { status: "authenticated"; user: TUser; error: null }
  | { status: "transient-error"; user: null; error: AuthLifecycleError };

export interface AuthLifecycleError {
  code: "network.unavailable" | "network.timeout" | "request.aborted" | "unknown";
  message: string;
  retryable: true;
}

export type FamilyLifecycleState<TFamily> =
  | { status: "idle" | "loading"; families: []; activeFamilyId: null; error: null }
  | { status: "no-family"; families: []; activeFamilyId: null; error: null }
  | { status: "pending"; families: TFamily[]; activeFamilyId: string | null; error: null }
  | { status: "ready"; families: TFamily[]; activeFamilyId: string; error: null }
  | { status: "error"; families: []; activeFamilyId: null; error: AuthLifecycleError };
