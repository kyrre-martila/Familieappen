export const ONBOARDING_FAMILY_STORAGE_KEY = "familieappen:onboarding-family";

export type OnboardingFamilyRole = "OWNER";
export type OnboardingInviteRole = "Administrator" | "Foresatt" | "Barn";
export type OnboardingInviteStatus = "sent" | "not-sent";

export interface OnboardingFamilyInvite {
  id: string;
  email: string;
  role: OnboardingInviteRole;
  status: OnboardingInviteStatus;
  createdAt: string;
}

export interface OnboardingFamilyState {
  family: {
    id: string | null;
    name: string;
    code: string | null;
  };
  creatorMembership: {
    role: OnboardingFamilyRole;
    displayRole: "Administrator";
  };
  invitedMembers: OnboardingFamilyInvite[];
  createdAt: string;
  updatedAt: string;
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function normalizeFamilyId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeFamilyName(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeInviteRole(value: unknown): OnboardingInviteRole {
  if (value === "Administrator" || value === "Foresatt" || value === "Barn") {
    return value;
  }

  return "Foresatt";
}

function normalizeInviteStatus(value: unknown): OnboardingInviteStatus {
  return value === "not-sent" ? "not-sent" : "sent";
}

function normalizeInvites(value: unknown): OnboardingFamilyInvite[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((invite, index) => {
    if (!invite || typeof invite !== "object") {
      return [];
    }

    const candidate = invite as Partial<OnboardingFamilyInvite>;
    const email = typeof candidate.email === "string" ? candidate.email.trim() : "";

    if (!email) {
      return [];
    }

    return [
      {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : `invite-${index}-${Date.now()}`,
        email,
        role: normalizeInviteRole(candidate.role),
        status: normalizeInviteStatus(candidate.status),
        createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
      },
    ];
  });
}

function normalizeFamilyCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const code = value.trim().toUpperCase();

  return /^FA-[A-Z0-9]{6}$/.test(code) ? code : null;
}

function persistOnboardingFamilyState(state: OnboardingFamilyState): OnboardingFamilyState | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  storage.setItem(ONBOARDING_FAMILY_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function getOnboardingFamilyState(): OnboardingFamilyState | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const savedState = storage.getItem(ONBOARDING_FAMILY_STORAGE_KEY);

  if (!savedState) {
    return null;
  }

  try {
    const parsedState = JSON.parse(savedState) as Partial<OnboardingFamilyState>;
    const familyName = normalizeFamilyName(parsedState.family?.name);

    if (!familyName) {
      return null;
    }

    const timestamp = new Date().toISOString();

    return {
      family: {
        id: normalizeFamilyId(parsedState.family?.id),
        name: familyName,
        code: normalizeFamilyCode(parsedState.family?.code),
      },
      creatorMembership: {
        role: "OWNER",
        displayRole: "Administrator",
      },
      invitedMembers: normalizeInvites(parsedState.invitedMembers),
      createdAt: typeof parsedState.createdAt === "string" ? parsedState.createdAt : timestamp,
      updatedAt: typeof parsedState.updatedAt === "string" ? parsedState.updatedAt : timestamp,
    };
  } catch {
    return null;
  }
}

export function saveOnboardingFamilyState(
  familyName: string,
  familyCode: string | null = null,
  familyId: string | null = null,
): OnboardingFamilyState | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const existingState = getOnboardingFamilyState();
  const timestamp = new Date().toISOString();
  const trimmedFamilyName = familyName.trim();
  const nextState: OnboardingFamilyState = {
    family: {
      id: normalizeFamilyId(familyId) ?? (existingState?.family.name === trimmedFamilyName ? existingState.family.id : null),
      name: trimmedFamilyName,
      code: normalizeFamilyCode(familyCode) ?? (existingState?.family.name === trimmedFamilyName ? existingState.family.code : null),
    },
    creatorMembership: {
      role: "OWNER",
      displayRole: "Administrator",
    },
    invitedMembers: existingState?.invitedMembers ?? [],
    createdAt: existingState?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  storage.setItem(ONBOARDING_FAMILY_STORAGE_KEY, JSON.stringify(nextState));

  return nextState;
}

export function ensureOnboardingFamilyState(fallbackFamilyName = "Familien"): OnboardingFamilyState | null {
  const existingState = getOnboardingFamilyState();

  if (existingState) {
    const normalizedState = {
      ...existingState,
      updatedAt: new Date().toISOString(),
    };
    persistOnboardingFamilyState(normalizedState);
    return normalizedState;
  }

  return saveOnboardingFamilyState(fallbackFamilyName);
}

export function addOnboardingFamilyInvite(input: { email: string; role: OnboardingInviteRole }): OnboardingFamilyState | null {
  const state = ensureOnboardingFamilyState();

  if (!state) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const trimmedEmail = input.email.trim();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const nextState: OnboardingFamilyState = {
    ...state,
    invitedMembers: [
      ...state.invitedMembers,
      {
        id: `invite-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`,
        email: trimmedEmail,
        role: input.role,
        // TODO: Replace this mock invite state with the real invite API when backend invites are available.
        status: isValidEmail ? "sent" : "not-sent",
        createdAt: timestamp,
      },
    ],
    updatedAt: timestamp,
  };

  return persistOnboardingFamilyState(nextState);
}
