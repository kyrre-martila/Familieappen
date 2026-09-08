import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CalendarIcsFeedService } from "../src/calendar/calendar-ics-feed.service";

const now = new Date();
const members = [
  { id: "member-1", familyId: "family-1", userId: "user-1" },
  { id: "member-2", familyId: "family-1", userId: "user-2" },
  { id: "member-3", familyId: "family-1", userId: null },
  { id: "other-member", familyId: "family-2", userId: "other-user" }
];
const events = [
  { id: "event-1", title: "Barn 1", memberIds: ["member-1"] },
  { id: "event-2", title: "Barn 2", memberIds: ["member-2"] },
  { id: "event-3", title: "Annen", memberIds: ["member-3"] }
].map(event => ({ ...event, description: null, location: null, startsAt: now, endsAt: null, allDay: false, updatedAt: now, participants: [] }));
const meals = [{ id: "meal-1", mealName: "Taco", notes: null, date: now, updatedAt: now }];
let sequence = 0;
const feeds: any[] = [];
const includeSelected = (feed: any) => feed ? { ...feed, selectedMembers: [...feed.selectedMembers] } : null;
const db: any = {
  familyMember: {
    findFirst: async ({ where }: any) => members.find(member => member.familyId === where.familyId && (where.userId === undefined || member.userId === where.userId) && (where.id === undefined || member.id === where.id)) ?? null,
    count: async ({ where }: any) => members.filter(member => member.familyId === where.familyId && where.id.in.includes(member.id)).length
  },
  calendarExportFeed: {
    count: async ({ where }: any) => feeds.filter(feed => feed.familyId === where.familyId).length,
    findMany: async ({ where }: any) => feeds.filter(feed => feed.familyId === where.familyId).map(includeSelected),
    findFirst: async ({ where }: any) => includeSelected(feeds.find(feed => (where.id === undefined || feed.id === where.id) && feed.familyId === where.familyId)),
    findUnique: async ({ where }: any) => includeSelected(feeds.find(feed => feed.token === where.token)),
    create: async ({ data }: any) => {
      const feed = { id: `feed-${++sequence}`, name: data.name, familyId: data.familyId, token: data.token, enabled: data.enabled ?? false, includeEvents: data.includeEvents ?? true, includeMeals: data.includeMeals ?? true, includeReminders: data.includeReminders ?? true, includeSchoolWeekReminders: data.includeSchoolWeekReminders ?? true, scope: data.scope ?? "family", selectedFamilyMemberId: null, createdByFamilyMemberId: data.createdByFamilyMemberId ?? null, selectedMembers: (data.selectedMembers?.create ?? []).map(({ familyMemberId }: any) => ({ familyMemberId })), createdAt: now, updatedAt: now };
      feeds.push(feed); return includeSelected(feed);
    },
    update: async ({ where, data }: any) => {
      const feed = feeds.find(item => item.id === where.id); if (!feed) throw new Error("missing feed");
      if (data.selectedMembers) feed.selectedMembers = data.selectedMembers.create.map(({ familyMemberId }: any) => ({ familyMemberId }));
      Object.assign(feed, Object.fromEntries(Object.entries(data).filter(([key]) => key !== "selectedMembers")));
      return includeSelected(feed);
    },
    delete: async ({ where }: any) => { const index = feeds.findIndex(feed => feed.id === where.id); return feeds.splice(index, 1)[0]; }
  },
  calendarEvent: { findMany: async ({ where }: any) => { const ids = where.participants?.some?.familyMemberId?.in; return ids ? events.filter(event => event.memberIds.some(id => ids.includes(id))) : events; } },
  mealPlanDay: { findMany: async () => meals }, reminder: { findMany: async () => [] }, schoolWeekReminder: { findMany: async () => [] }
};
const authorization: any = {
  requireFamilyMember: async (userId: string, familyId: string) => { if (!members.some(member => member.userId === userId && member.familyId === familyId)) throw new Error("forbidden"); },
  requireFamilyRole: async (userId: string, familyId: string) => authorization.requireFamilyMember(userId, familyId)
};
const service = new CalendarIcsFeedService({ client: db } as any, authorization);
const tokenFromUrl = (url: string) => url.match(/\/([^/]+)\.ics$/)?.[1] as string;
const create = (userId: string, input: any) => service.createFeed(userId, "family-1", { name: input.name, includeReminders: false, includeSchoolWeekReminders: false, ...input });

async function run() {
  const normal = await create("user-1", { name: "Familiekalender" });
  const mealsOnly = await create("user-1", { name: "Middager", includeEvents: false, includeMeals: true });
  assert.equal((await service.listFeeds("user-1", "family-1")).length, 2, "multiple feeds can coexist");
  const mealsIcs = await service.renderFeed(tokenFromUrl(mealsOnly.privateUrl));
  assert.match(mealsIcs, /SUMMARY:Middag: Taco/); assert.doesNotMatch(mealsIcs, /SUMMARY:Barn 1/);

  const selected = await create("user-1", { name: "Barna", scope: "selectedParticipant", selectedMemberIds: ["member-1", "member-2"] });
  const selectedIcs = await service.renderFeed(tokenFromUrl(selected.privateUrl));
  assert.match(selectedIcs, /SUMMARY:Barn 1/); assert.match(selectedIcs, /SUMMARY:Barn 2/); assert.doesNotMatch(selectedIcs, /SUMMARY:Annen/); assert.match(selectedIcs, /SUMMARY:Middag: Taco/);
  await assert.rejects(() => create("user-1", { name: "Tom", scope: "selectedParticipant", selectedMemberIds: [] }), /at least one family member/i);
  await assert.rejects(() => create("user-1", { name: "Ugyldig", scope: "selectedParticipant", selectedMemberIds: ["other-member"] }), /belong to the family/i);

  const mine = await create("user-1", { name: "Mine", scope: "mine", includeMeals: false });
  assert.equal(mine.mineFamilyMemberId, "member-1");
  const mineIcs = await service.renderFeed(tokenFromUrl(mine.privateUrl));
  assert.match(mineIcs, /SUMMARY:Barn 1/); assert.doesNotMatch(mineIcs, /SUMMARY:Barn 2|SUMMARY:Annen/);

  const migratedToken = "M".repeat(43);
  feeds.push({ ...feeds[0], id: "migrated", name: "Migrert", token: migratedToken, scope: "family", createdByFamilyMemberId: null, selectedMembers: [] });
  const claimed = await service.updateFeed("user-2", "family-1", "migrated", { scope: "mine" });
  assert.equal(claimed.mineFamilyMemberId, "member-2", "editor claims an unowned feed only when changing it to mine");
  assert.equal(tokenFromUrl(claimed.privateUrl), migratedToken, "claiming a migrated mine feed preserves its existing token");
  await service.updateFeed("user-1", "family-1", "migrated", { name: "Fortsatt medlem 2" });
  assert.equal((await service.getFeed("user-1", "family-1", "migrated")).mineFamilyMemberId, "member-2", "later viewers/editors cannot change mine ownership");
  const claimedIcs = await service.renderFeed(migratedToken); assert.match(claimedIcs, /SUMMARY:Barn 2/); assert.doesNotMatch(claimedIcs, /SUMMARY:Barn 1|SUMMARY:Annen/);
  feeds.push({ ...feeds[0], id: "invalid-mine", token: "I".repeat(43), scope: "mine", createdByFamilyMemberId: null, selectedMembers: [] });
  await assert.rejects(() => service.renderFeed("I".repeat(43)), /not found/i, "invalid mine state must fail closed");

  const normalToken = tokenFromUrl(normal.privateUrl), mealsToken = tokenFromUrl(mealsOnly.privateUrl);
  const regenerated = await service.regenerateFeedToken("user-1", "family-1", normal.id);
  assert.notEqual(tokenFromUrl(regenerated.privateUrl), normalToken); assert.equal(tokenFromUrl((await service.getFeed("user-1", "family-1", mealsOnly.id)).privateUrl), mealsToken);
  await assert.rejects(() => service.renderFeed(normalToken), /not found/i); assert.match(await service.renderFeed(mealsToken), /Middag: Taco/);
  await service.deleteFeed("user-1", "family-1", selected.id); await assert.rejects(() => service.getFeed("user-1", "family-1", selected.id), /not found/i); assert.equal((await service.getFeed("user-1", "family-1", mealsOnly.id)).id, mealsOnly.id);
  await assert.rejects(() => service.listFeeds("other-user", "family-1"), /forbidden/i);
  await assert.rejects(() => service.getFeed("user-1", "family-2", mealsOnly.id), /forbidden/i);

  const legacyBefore = await service.getOrCreateFeed("user-1", "family-1");
  assert.ok("selectedFamilyMemberId" in legacyBefore); assert.equal(tokenFromUrl(legacyBefore.privateUrl), tokenFromUrl((await service.getFeed("user-1", "family-1", legacyBefore.id)).privateUrl));
  const legacyPatched = await service.updateLegacyFeed("user-1", "family-1", { scope: "selectedParticipant", selectedFamilyMemberId: "member-2" });
  assert.equal(legacyPatched.selectedFamilyMemberId, "member-2"); assert.equal(tokenFromUrl(legacyPatched.privateUrl), tokenFromUrl(legacyBefore.privateUrl), "legacy PATCH preserves token");
  const legacyRegenerated = await service.regenerateLegacyFeed("user-1", "family-1");
  assert.notEqual(tokenFromUrl(legacyRegenerated.privateUrl), tokenFromUrl(legacyBefore.privateUrl)); assert.equal(legacyRegenerated.selectedFamilyMemberId, "member-2");

  while (feeds.filter(feed => feed.familyId === "family-1").length < 20) await create("user-1", { name: `Feed ${feeds.length}` });
  await assert.rejects(() => create("user-1", { name: "For mange" }), /at most 20/i);

  const sql = readFileSync("prisma/migrations/20260908120000_multiple_calendar_export_feeds/migration.sql", "utf8");
  assert.doesNotMatch(sql, /UPDATE "calendar_export_feeds" SET "token"/i, "migration must preserve existing tokens");
  console.log("multiple calendar feeds: ok");
}
void run();
