import { getPostAuthDestination, resolveFamilyStatus } from "./routes";
import type { FamilyWithMembership } from "./types";
function equal(actual: unknown, expected: unknown) { if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`); }

function family(status?: "pending" | "approved"): FamilyWithMembership {
  return {
    family: { id: "family-1", name: "Test", code: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    membership: { id: "member-1", userId: "user-1", familyId: "family-1", displayName: "Test", avatarUrl: null, role: "PARENT", includeInSchoolWeek: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...(status ? { status } : {}) } as FamilyWithMembership["membership"],
  };
}

equal(getPostAuthDestination({ auth: "unauthenticated" }), "/(auth)/login");
equal(getPostAuthDestination({ auth: "authenticated", familyStatus: "no-family" }), "/(onboarding)/family-start");
equal(getPostAuthDestination({ auth: "authenticated", familyStatus: "pending" }), "/(onboarding)/pending-approval");
equal(getPostAuthDestination({ auth: "authenticated", familyStatus: "ready" }), "/(app)/(tabs)");
equal(resolveFamilyStatus([]), "no-family");
equal(resolveFamilyStatus([family("pending")]), "pending");
equal(resolveFamilyStatus([family("pending"), family("approved")]), "ready");
const restoredDestination = getPostAuthDestination({ auth: "authenticated", familyStatus: resolveFamilyStatus([family("approved")]) });
const loginDestination = getPostAuthDestination({ auth: "authenticated", familyStatus: resolveFamilyStatus([family("approved")]) });
equal(restoredDestination, loginDestination);
console.log("auth routes tests passed");
