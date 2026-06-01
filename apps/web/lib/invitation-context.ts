export const INVITATION_CONTEXT_STORAGE_KEY = "familieappen:pending-invitation";

export type InvitationAcceptanceOutcome = "auto-approved" | "approval-required";
export type InvitationContextStatus = "landing" | "accepted" | "switch-requested" | "pending-approval" | "declined";

export interface InvitationContext {
  token: string;
  inviterName: string;
  familyName: string;
  acceptedAt?: string;
  declinedAt?: string;
  requiresApproval?: boolean;
  sourcePath: string;
  status: InvitationContextStatus;
  updatedAt: string;
}

export const MOCK_INVITATION_CONTEXT = {
  inviterName: "Elisabeth",
  familyName: "Martila-familien",
} as const;

export const INVITATION_ROUTES = {
  landing: (token: string) => `/invite/${encodeURIComponent(token)}`,
  accepted: (token: string) => `/invite/${encodeURIComponent(token)}/accepted`,
  alreadyInFamily: (token: string) => `/invite/${encodeURIComponent(token)}/already-in-family`,
  decline: (token: string) => `/invite/${encodeURIComponent(token)}/decline`,
  declined: (token: string) => `/invite/${encodeURIComponent(token)}/declined`,
  pendingApproval: (token: string) => `/invite/${encodeURIComponent(token)}/pending-approval`,
} as const;

export const INVITATION_DEEP_LINK_TODO = [
  "Configure iOS Universal Links with an apple-app-site-association file for /invite/* when native bundle IDs are finalized.",
  "Configure Android App Links with assetlinks.json for /invite/* when package names and signing certificate fingerprints are finalized.",
  "Keep /invite/[token] as the canonical web fallback so native and web flows preserve the same token.",
] as const;

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function buildInvitationSourcePath(token: string): string {
  return INVITATION_ROUTES.landing(token);
}

export function saveInvitationContext(input: Omit<InvitationContext, "status" | "updatedAt"> & Partial<Pick<InvitationContext, "status">>): InvitationContext | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const existingContext = getInvitationContext();
  const invitationContext: InvitationContext = {
    ...existingContext,
    ...input,
    requiresApproval: input.requiresApproval ?? existingContext?.requiresApproval,
    status: input.status ?? existingContext?.status ?? "landing",
    updatedAt: new Date().toISOString(),
  };

  storage.setItem(INVITATION_CONTEXT_STORAGE_KEY, JSON.stringify(invitationContext));
  return invitationContext;
}

export function getInvitationContext(): InvitationContext | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const savedContext = storage.getItem(INVITATION_CONTEXT_STORAGE_KEY);

  if (!savedContext) {
    return null;
  }

  try {
    const parsedContext = JSON.parse(savedContext) as Partial<InvitationContext>;

    if (!parsedContext.token || !parsedContext.familyName || !parsedContext.inviterName || !parsedContext.sourcePath) {
      return null;
    }

    return {
      token: parsedContext.token,
      familyName: parsedContext.familyName,
      inviterName: parsedContext.inviterName,
      acceptedAt: parsedContext.acceptedAt,
      declinedAt: parsedContext.declinedAt,
      requiresApproval: parsedContext.requiresApproval,
      sourcePath: parsedContext.sourcePath,
      status: normalizeInvitationStatus(parsedContext.status),
      updatedAt: parsedContext.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function getInvitationResumeRoute(): string | null {
  const context = getInvitationContext();

  if (!context || context.status === "declined") {
    return null;
  }

  if (context.status === "accepted" || context.status === "switch-requested") {
    return INVITATION_ROUTES.accepted(context.token);
  }

  return `${INVITATION_ROUTES.landing(context.token)}?continue=1`;
}

export function markInvitationAccepted(input: Pick<InvitationContext, "familyName" | "inviterName" | "sourcePath" | "token"> & Partial<Pick<InvitationContext, "requiresApproval">>, status: Extract<InvitationContextStatus, "accepted" | "switch-requested"> = "accepted"): InvitationContext | null {
  return saveInvitationContext({
    ...input,
    acceptedAt: new Date().toISOString(),
    status,
  });
}

export function markInvitationDeclined(input: Pick<InvitationContext, "familyName" | "inviterName" | "sourcePath" | "token">): InvitationContext | null {
  return saveInvitationContext({
    ...input,
    acceptedAt: undefined,
    declinedAt: new Date().toISOString(),
    status: "declined",
  });
}

export function completeInvitationContext(): void {
  clearInvitationContext();
}

export function clearInvitationContext(): void {
  getStorage()?.removeItem(INVITATION_CONTEXT_STORAGE_KEY);
}

function normalizeInvitationStatus(value: unknown): InvitationContextStatus {
  if (value === "accepted" || value === "switch-requested" || value === "pending-approval" || value === "declined") {
    return value;
  }

  return "landing";
}
