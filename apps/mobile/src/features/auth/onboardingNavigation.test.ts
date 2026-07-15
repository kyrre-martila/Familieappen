import { getProfileOnboardingSecondaryActions } from "./onboardingNavigation";

declare const require: (moduleName: string) => any;
declare const process: { cwd: () => string };

const { readFileSync } = require("fs");
const { join } = require("path");

function deepEqual(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function ok(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

deepEqual(getProfileOnboardingSecondaryActions(false), ["logout"]);
deepEqual(getProfileOnboardingSecondaryActions(true), ["back", "logout"]);

const familyStartSource = readFileSync(join(process.cwd(), "app/(onboarding)/family-start.tsx"), "utf8");
const createFamilySource = readFileSync(join(process.cwd(), "app/(onboarding)/create-family.tsx"), "utf8");
const joinFamilySource = readFileSync(join(process.cwd(), "app/(onboarding)/join-family.tsx"), "utf8");

ok(!familyStartSource.includes('router.push("/(onboarding)/profile")'), "Family-start secondary action must not navigate back to rejected profile route");
ok(familyStartSource.includes("void logout()"), "Family-start secondary action logs out instead of navigating to login directly");
ok(createFamilySource.includes('router.replace("/(onboarding)/family-start")'), "Create-family back replaces to family-start without stacking history");
ok(joinFamilySource.includes('router.replace("/(onboarding)/family-start")'), "Join-family back replaces to family-start without stacking history");

ok(!createFamilySource.includes('/(onboarding)/invite-members'), "Create-family submit lets central auth routing open invite-members");
ok(!createFamilySource.includes('router.push'), "Create-family does not push after successful submit");
const createFamilyReplaceCount = (createFamilySource.match(/router\.replace/g) ?? []).length;
ok(createFamilyReplaceCount === 1, "Create-family has only the back-button replace routing decision");
ok(createFamilySource.includes('startInviteMembersTransition(familyId)'), "Create-family stores invite transition before refreshing central auth routing");
ok(createFamilySource.includes('await refreshFamilyStatus()'), "Create-family refreshes family status for one central routing decision");
ok(createFamilySource.includes('setCreatedFamilyId(familyId)'), "Create-family keeps created family id so retry does not create a second family");

console.log("onboarding navigation tests passed");
