import { selectCanonicalActiveFamilyId, sortFamilies } from "./familySelection";
import type { FamilyWithMembership } from "../auth/types";

function assertEqual<T>(actual: T, expected: T, message: string) { if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`); }
function assertDeepEqual(actual: unknown, expected: unknown, message: string) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }

function family(id: string, createdAt: string, status = "approved"): FamilyWithMembership {
  return { family: { id, name: id, code: id, createdAt, updatedAt: createdAt }, membership: { id: `member-${id}`, familyId: id, userId: "user", role: "PARENT", displayName: "User", color: null, avatarUrl: null, createdAt, updatedAt: createdAt, familyMembershipStatus: status } as never } as FamilyWithMembership;
}

const newer = family("newer", "2026-01-02T00:00:00.000Z");
const older = family("older", "2026-01-01T00:00:00.000Z");
assertEqual(selectCanonicalActiveFamilyId([newer, older]), "older", "canonical family selection sorts deterministically instead of trusting array order");
assertEqual(selectCanonicalActiveFamilyId([family("pending", "2026-01-01T00:00:00.000Z", "pending"), newer]), "newer", "canonical family selection requires an approved membership");
assertEqual(selectCanonicalActiveFamilyId([newer, older], "newer"), "newer", "canonical family selection honors an approved preferred family");
assertDeepEqual(sortFamilies([newer, older]).map((item) => item.family.id), ["older", "newer"], "family sorting is stable by creation time and id");
console.log("Family selection tests passed");
