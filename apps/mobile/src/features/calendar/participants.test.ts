import type { FamilyMember } from "@familieappen/shared";
import { getCalendarEventParticipantIds, getSelectableCalendarParticipantIds, omitEmptyParticipantIds, toggleAllCalendarParticipantIds, toggleCalendarParticipantId } from "./participants";

function assertEqual<T>(actual: T, expected: T, description: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
const members = [{ id: "even" }, { id: "fiona" }, { id: "ada" }] as FamilyMember[];
assertEqual(getCalendarEventParticipantIds({ participantIds: ["even"], participants: [] }), ["even"], "DTO to form prefers participantIds when present");
assertEqual(getCalendarEventParticipantIds({ participants: [{ familyMemberId: "fiona", familyMember: { id: "fiona" } }] }), ["fiona"], "DTO to form hydrates participant ids from participants relation");
assertEqual(toggleCalendarParticipantId(["even"], "fiona"), ["even", "fiona"], "toggle member adds unselected member");
assertEqual(toggleCalendarParticipantId(["even", "fiona"], "even"), ["fiona"], "toggle member removes selected member");
assertEqual(toggleAllCalendarParticipantIds([], members), ["even", "fiona", "ada"], "toggle all selects every family member from none");
assertEqual(toggleAllCalendarParticipantIds(["even", "fiona", "ada"], members), [], "toggle all clears when every member is selected");
assertEqual(toggleAllCalendarParticipantIds(["even"], members), ["even", "fiona", "ada"], "toggle all selects every member from partial selection");
assertEqual(toggleAllCalendarParticipantIds([], []), [], "empty family member list remains empty");
assertEqual(omitEmptyParticipantIds([]), undefined, "form to payload omits empty participant array for create");
assertEqual(omitEmptyParticipantIds(["even"]), ["even"], "form to payload keeps selected participant ids");

assertEqual(getSelectableCalendarParticipantIds([{ id: "even", displayName: "Even" }, { id: "pending", displayName: "" }, { id: "even", displayName: "Even duplicate" }, { id: "ada", displayName: "Ada" }] as FamilyMember[]), ["even", "ada"], "default participant selection keeps valid active-looking members and removes blank/duplicate ids");
