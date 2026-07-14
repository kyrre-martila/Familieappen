import { secureStorage } from "../../lib/storage/secureStorage";

const PENDING_FAMILY_REQUEST_KEY = "familieappen.mobile.pendingFamilyRequest";
const ONBOARDING_PROFILE_KEY = "familieappen.mobile.onboardingProfile";

export type OnboardingProfileDraft = {
  birthDate: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phoneNumber: string;
};

export const onboardingStorage = {
  async savePendingFamilyRequest(code: string) {
    await secureStorage.setItem(PENDING_FAMILY_REQUEST_KEY, code);
  },
  async clearPendingFamilyRequest() {
    await secureStorage.deleteItem(PENDING_FAMILY_REQUEST_KEY);
  },
  async getPendingFamilyRequest() {
    return secureStorage.getItem(PENDING_FAMILY_REQUEST_KEY);
  },
  async saveProfileDraft(profile: OnboardingProfileDraft) {
    await secureStorage.setItem(
      ONBOARDING_PROFILE_KEY,
      JSON.stringify(profile),
    );
  },
  async getProfileDraft(): Promise<OnboardingProfileDraft | null> {
    const raw = await secureStorage.getItem(ONBOARDING_PROFILE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as OnboardingProfileDraft;
    } catch {
      await secureStorage.deleteItem(ONBOARDING_PROFILE_KEY);
      return null;
    }
  },
};
