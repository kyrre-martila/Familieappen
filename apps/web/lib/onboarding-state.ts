export const ONBOARDING_FAMILY_STORAGE_KEY = "familieappen:onboarding-family";

type OnboardingFamilyRole = "OWNER";

export interface OnboardingFamilyState {
  family: {
    name: string;
  };
  creatorMembership: {
    role: OnboardingFamilyRole;
    displayRole: "Administrator";
  };
  createdAt: string;
  updatedAt: string;
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
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
    const familyName = parsedState.family?.name;

    if (typeof familyName !== "string") {
      return null;
    }

    return {
      family: {
        name: familyName,
      },
      creatorMembership: {
        role: "OWNER",
        displayRole: "Administrator",
      },
      createdAt: typeof parsedState.createdAt === "string" ? parsedState.createdAt : new Date().toISOString(),
      updatedAt: typeof parsedState.updatedAt === "string" ? parsedState.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveOnboardingFamilyState(familyName: string): OnboardingFamilyState | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const existingState = getOnboardingFamilyState();
  const timestamp = new Date().toISOString();
  const nextState: OnboardingFamilyState = {
    family: {
      name: familyName,
    },
    creatorMembership: {
      role: "OWNER",
      displayRole: "Administrator",
    },
    createdAt: existingState?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  // Temporary onboarding state until family creation is persisted by the backend.
  storage.setItem(ONBOARDING_FAMILY_STORAGE_KEY, JSON.stringify(nextState));

  return nextState;
}
