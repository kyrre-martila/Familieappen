import { getProfileOnboardingSecondaryActions } from "./onboardingNavigation";

function deepEqual(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

deepEqual(getProfileOnboardingSecondaryActions(false), ["logout"]);
deepEqual(getProfileOnboardingSecondaryActions(true), ["back", "logout"]);

console.log("onboarding navigation tests passed");
