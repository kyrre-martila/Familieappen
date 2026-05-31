export const ONBOARDING_APP_PROMPT_ROUTE = "/onboarding/app-recommendation";
export const ONBOARDING_DASHBOARD_ROUTE = "/dashboard";

const ONBOARDING_APP_PROMPT_COMPLETED_KEY = "familieappen:onboarding-app-prompt-completed";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function hasCompletedOnboardingAppPrompt(): boolean {
  return getStorage()?.getItem(ONBOARDING_APP_PROMPT_COMPLETED_KEY) === "true";
}

export function completeOnboardingAppPrompt(): void {
  getStorage()?.setItem(ONBOARDING_APP_PROMPT_COMPLETED_KEY, "true");
}

export function getOnboardingCompletionRoute(): string {
  return hasCompletedOnboardingAppPrompt() ? ONBOARDING_DASHBOARD_ROUTE : ONBOARDING_APP_PROMPT_ROUTE;
}
