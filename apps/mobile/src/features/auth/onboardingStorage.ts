import { secureStorage } from "../../lib/storage/secureStorage";
import type { InviteMembersTransition } from "./inviteTransition";

const PENDING_FAMILY_REQUEST_KEY = "familieappen.mobile.pendingFamilyRequest";
const ONBOARDING_PROFILE_KEY = "familieappen.mobile.onboardingProfile";
const INVITE_MEMBERS_TRANSITION_KEY = "familieappen.mobile.onboardingInviteMembers.v1";

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
  async saveInviteMembersTransition(transition: InviteMembersTransition) {
    await secureStorage.setItem(INVITE_MEMBERS_TRANSITION_KEY, JSON.stringify(transition));
  },
  async getInviteMembersTransitionRaw() {
    return secureStorage.getItem(INVITE_MEMBERS_TRANSITION_KEY);
  },
  async clearInviteMembersTransition() {
    await secureStorage.deleteItem(INVITE_MEMBERS_TRANSITION_KEY);
  },
  async saveProfileDraft(profile: OnboardingProfileDraft) {
    await secureStorage.setItem(
      ONBOARDING_PROFILE_KEY,
      JSON.stringify(profile),
    );
  },
  async clearProfileDraft() {
    await secureStorage.deleteItem(ONBOARDING_PROFILE_KEY);
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
