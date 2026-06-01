import { getOnboardingCompletionRoute } from "./onboarding-completion";
import {
  completeInvitationContext,
  getInvitationContext,
  INVITATION_ROUTES,
  saveInvitationContext,
  type InvitationAcceptanceOutcome,
  type InvitationContext,
} from "./invitation-context";

export const ONBOARDING_PROFILE_STORAGE_KEY = "familieappen:onboarding-profile";

export interface InvitationCompletionResult {
  outcome: InvitationAcceptanceOutcome;
  redirectTo: string;
}

export function hasCompletedPersonalInformation(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const savedProfile = window.localStorage.getItem(ONBOARDING_PROFILE_STORAGE_KEY);

  if (!savedProfile) {
    return false;
  }

  try {
    const profile = JSON.parse(savedProfile) as Partial<Record<"birthDate" | "firstName" | "lastName" | "phoneNumber", string>>;

    return Boolean(profile.birthDate?.trim() && profile.firstName?.trim() && profile.lastName?.trim() && profile.phoneNumber?.trim());
  } catch {
    window.localStorage.removeItem(ONBOARDING_PROFILE_STORAGE_KEY);
    return false;
  }
}

export function getInvitationPostAuthRoute(): string {
  const context = getInvitationContext();

  if (!context) {
    return "/onboarding/family-start";
  }

  return hasCompletedPersonalInformation() ? INVITATION_ROUTES.accepted(context.token) : "/onboarding/profile";
}

export function resolveInvitationCompletion(context: InvitationContext): InvitationCompletionResult {
  // TODO: Replace this local decision with the backend accept-invitation endpoint response.
  // The API should return whether the invitation is immediately approved or requires administrator approval.
  if (context.requiresApproval) {
    saveInvitationContext({ ...context, status: "pending-approval" });
    return {
      outcome: "approval-required",
      redirectTo: INVITATION_ROUTES.pendingApproval(context.token),
    };
  }

  completeInvitationContext();
  return {
    outcome: "auto-approved",
    redirectTo: getOnboardingCompletionRoute(),
  };
}
