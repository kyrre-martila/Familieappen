export const INVITATION_CONTEXT_STORAGE_KEY = "familieappen:pending-invitation";

export interface InvitationContext {
  token: string;
  inviterName: string;
  familyName: string;
  acceptedAt?: string;
  sourcePath: string;
  updatedAt: string;
}

export const MOCK_INVITATION_CONTEXT = {
  inviterName: "Elisabeth",
  familyName: "Martila-familien",
} as const;

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function saveInvitationContext(input: Omit<InvitationContext, "updatedAt">): InvitationContext | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const invitationContext: InvitationContext = {
    ...input,
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
      sourcePath: parsedContext.sourcePath,
      updatedAt: parsedContext.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearInvitationContext(): void {
  getStorage()?.removeItem(INVITATION_CONTEXT_STORAGE_KEY);
}
