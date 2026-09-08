import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CalendarIcsFeedService } from "../src/calendar/calendar-ics-feed.service";

const date = new Date("2026-09-08T12:00:00Z");
const tokenA = "A".repeat(43);
const members = [{ id: "member-a", familyId: "family-1", userId: "user-a" }, { id: "member-b", familyId: "family-1", userId: "user-b" }];
const base = { familyId: "family-1", enabled: true, includeReminders: false, includeSchoolWeekReminders: false, scope: "family", selectedFamilyMemberId: null, createdByFamilyMemberId: null, mineFamilyMemberId: null, createdAt: date, updatedAt: date, selectedMembers: [] as Array<{ familyMemberId: string }> };
const feeds: any[] = [{ id: "legacy", name: "Familiekalender", token: tokenA, includeEvents: true, includeMeals: true, ...base }];
const events = [
  { id: "event-a", title: "User A event", description: null, location: null, startsAt: date, endsAt: null, allDay: false, updatedAt: date, memberIds: ["member-a"], participants: [] },
  { id: "event-b", title: "User B event", description: null, location: null, startsAt: date, endsAt: null, allDay: false, updatedAt: date, memberIds: ["member-b"], participants: [] }
];
const meals = [{ id: "meal-1", mealName: "Taco", notes: null, date, updatedAt: date }];
function materialize(data: any) {
  const selectedMembers = data.selectedMembers?.create ?? [];
  const copy = { ...data, selectedMembers };
  delete copy.selectedMembers;
  return { ...copy, selectedMembers };
}
const db: any = {
  calendarExportFeed: {
    count: async ({ where }: any) => feeds.filter(feed => feed.familyId === where.familyId).length,
    findUnique: async ({ where }: any) => feeds.find(feed => feed.token === where.token) ?? null,
    findFirst: async ({ where }: any) => feeds.find(feed => (!where.id || feed.id === where.id) && feed.familyId === where.familyId) ?? null,
    findMany: async ({ where }: any) => feeds.filter(feed => feed.familyId === where.familyId),
    create: async ({ data }: any) => { const feed = { id: `feed-${feeds.length}`, createdAt: date, updatedAt: date, ...materialize(data) }; feeds.push(feed); return feed; },
    update: async ({ where, data }: any) => { const feed = feeds.find(row => row.id === where.id); const selectedMembers = data.selectedMembers ? data.selectedMembers.create : feed.selectedMembers; Object.assign(feed, data, { selectedMembers, updatedAt: date }); delete feed.selectedMembers.deleteMany; return feed; }
  },
  familyMember: {
    findFirst: async ({ where }: any) => members.find(member => member.familyId === where.familyId && member.userId === where.userId) ?? null,
    count: async ({ where }: any) => members.filter(member => member.familyId === where.familyId && where.id.in.includes(member.id)).length
  },
  calendarEvent: { findMany: async ({ where }: any) => { const ids = where.participants?.some?.familyMemberId?.in; return ids ? events.filter(event => event.memberIds.some(id => ids.includes(id))) : events; } },
  mealPlanDay: { findMany: async () => meals }, reminder: { findMany: async () => [] }, schoolWeekReminder: { findMany: async () => [] }
};
const authorization = { requireFamilyMember: async () => undefined, requireFamilyRole: async () => undefined };
const service = new CalendarIcsFeedService({ client: db } as any, authorization as any);

async function run() {
  const familyFeed = await service.createFeed("user-a", "family-1", { name: "Family", scope: "family" });
  assert.equal(familyFeed.mineFamilyMemberId, null, "family feed must not acquire a mine member on creation");
  const unchangedToken = feeds.find(feed => feed.id === familyFeed.id).token;
  const changedToMine = await service.updateFeed("user-b", "family-1", familyFeed.id, { scope: "mine" });
  assert.equal(changedToMine.mineFamilyMemberId, "member-b");
  assert.equal(feeds.find(feed => feed.id === familyFeed.id).token, unchangedToken, "scope changes preserve tokens");
  const mineIcs = await service.renderFeed(feeds.find(feed => feed.id === familyFeed.id).token);
  assert.match(mineIcs, /User B event/); assert.doesNotMatch(mineIcs, /User A event/);

  const newMine = await service.createFeed("user-a", "family-1", { name: "Mine", scope: "mine" });
  assert.equal(newMine.mineFamilyMemberId, "member-a", "new mine feed belongs to its creator");
  await service.updateFeed("user-b", "family-1", newMine.id, { name: "Renamed" });
  assert.equal(feeds.find(feed => feed.id === newMine.id).mineFamilyMemberId, "member-a", "unrelated edits preserve mine member");

  feeds.push({ id: "unresolved", name: "Legacy mine", token: "U".repeat(43), includeEvents: true, includeMeals: false, ...base, scope: "mine" });
  const unresolved = await service.renderFeed("U".repeat(43));
  assert.doesNotMatch(unresolved, /User [AB] event/, "unresolved mine feed must fail closed");

  feeds.push({ id: "meals", name: "Middager", token: "M".repeat(43), includeEvents: false, includeMeals: true, ...base });
  const mealOnly = await service.renderFeed("M".repeat(43));
  assert.match(mealOnly, /SUMMARY:Middag: Taco/); assert.doesNotMatch(mealOnly, /User [AB] event/);

  const legacyBefore = await service.getOrCreateFeed("user-a", "family-1");
  await service.updateLegacyFeed("user-b", "family-1", { name: "Legacy renamed" });
  const legacyAfter = await service.getOrCreateFeed("user-a", "family-1");
  assert.equal(legacyBefore.privateUrl, legacyAfter.privateUrl, "legacy endpoint keeps the original token");

  const sql = readFileSync("prisma/migrations/20260908120000_multiple_calendar_export_feeds/migration.sql", "utf8");
  assert.match(sql, /ADD COLUMN "mineFamilyMemberId" TEXT/);
  assert.doesNotMatch(sql, /SET "mineFamilyMemberId"/i, "legacy mine ownership must not be invented");
  assert.doesNotMatch(sql, /UPDATE "calendar_export_feeds" SET "token"/i, "migration must preserve existing tokens");
  console.log("multiple calendar feeds: ok");
}
void run();
