export type ProfileOnboardingSecondaryAction = "back" | "logout";

export function getProfileOnboardingSecondaryActions(canGoBack: boolean): ProfileOnboardingSecondaryAction[] {
  return canGoBack ? ["back", "logout"] : ["logout"];
}
