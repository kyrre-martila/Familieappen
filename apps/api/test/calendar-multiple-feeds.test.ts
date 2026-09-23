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
      const feed = { id: `feed-${++sequence}`, name: data.name, familyId: data.familyId, token: data.token, enabled: data.enabled ?? false, includeEvents: data.includeEvents ?? true, includeMeals: data.includeMeals ?? true, includeReminders: data.includeReminders ?? true, includeSchoolWeekReminders: data.includeSchoolWeekReminders ?? true, includeWasteCollection: data.includeWasteCollection ?? false, scope: data.scope ?? "family", selectedFamilyMemberId: null, createdByFamilyMemberId: data.createdByFamilyMemberId ?? null, mineFamilyMemberId: data.mineFamilyMemberId ?? null, selectedMembers: (data.selectedMembers?.create ?? []).map(({ familyMemberId }: any) => ({ familyMemberId })), createdAt: now, updatedAt: now };
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
const wasteEvents = [
  { id: "waste-paper", provider: "test-provider", providerFractionId: "paper", collectionDate: "2026-09-23", allDay: true as const, name: "Papir og papp", icon: null, standardFractionId: null, standardFractionIcon: null },
  { id: "waste-food", provider: "test-provider", providerFractionId: "food", collectionDate: "2026-09-23", allDay: true as const, name: "Matavfall", icon: null, standardFractionId: null, standardFractionIcon: null }
];
const wasteCollection: any = { listCachedEvents: async () => wasteEvents };
const service = new CalendarIcsFeedService({ client: db } as any, authorization, wasteCollection);
const tokenFromUrl = (url: string) => url.match(/\/([^/]+)\.ics$/)?.[1] as string;
const create = (userId: string, input: any) => service.createFeed(userId, "family-1", { name: input.name, includeReminders: false, includeSchoolWeekReminders: false, ...input });

async function run() {
  const normal = await create("user-1", { name: "Familiekalender" });
  assert.equal(normal.mineFamilyMemberId, null, "a family feed has no mine audience despite recording its creator");
  const mealsOnly = await create("user-1", { name: "Middager", includeEvents: false, includeMeals: true });
  assert.equal((await service.listFeeds("user-1", "family-1")).length, 2, "multiple feeds can coexist");
  const mealsIcs = await service.renderFeed(tokenFromUrl(mealsOnly.privateUrl));
  assert.match(mealsIcs, /SUMMARY:Middag: Taco/); assert.doesNotMatch(mealsIcs, /SUMMARY:Barn 1/);

  const wasteDisabled = await create("user-1", { name: "Uten renovasjon", includeWasteCollection: false });
  assert.equal(wasteDisabled.includeWasteCollection, false);
  assert.doesNotMatch(await service.renderFeed(tokenFromUrl(wasteDisabled.privateUrl)), /Renovasjon:/);
  const wasteOnly = await create("user-1", { name: "Renovasjon", includeEvents: false, includeMeals: false, includeWasteCollection: true });
  assert.equal(wasteOnly.includeWasteCollection, true);
  const wasteIcs = await service.renderFeed(tokenFromUrl(wasteOnly.privateUrl));
  assert.match(wasteIcs, /SUMMARY:Renovasjon: Papir og papp/);
  assert.match(wasteIcs, /SUMMARY:Renovasjon: Matavfall/);
  assert.equal((wasteIcs.match(/DTSTART;VALUE=DATE:20260923/g) ?? []).length, 2, "fractions remain separate all-day events");
  assert.equal((wasteIcs.match(/DTEND;VALUE=DATE:20260924/g) ?? []).length, 2, "exclusive end uses local calendar arithmetic");
  assert.doesNotMatch(wasteIcs, /DTSTART[^\r\n]*20260923T|DTSTART[^\r\n]*Z/, "waste dates never become instants");
  const wasteUids = wasteIcs.match(/UID:waste-[^\r\n]+/g);
  assert.deepEqual(wasteUids, (await service.renderFeed(tokenFromUrl(wasteOnly.privateUrl))).match(/UID:waste-[^\r\n]+/g), "waste UIDs are deterministic");
  const disabledAgain = await service.updateFeed("user-1", "family-1", wasteOnly.id, { includeWasteCollection: false, includeMeals: true });
  assert.equal(disabledAgain.includeWasteCollection, false, "the setting survives editing");
  assert.doesNotMatch(await service.renderFeed(tokenFromUrl(disabledAgain.privateUrl)), /Renovasjon:/);

  const selected = await create("user-1", { name: "Barna", scope: "selectedParticipant", selectedMemberIds: ["member-1", "member-2"] });
  const selectedIcs = await service.renderFeed(tokenFromUrl(selected.privateUrl));
  assert.match(selectedIcs, /SUMMARY:Barn 1/); assert.match(selectedIcs, /SUMMARY:Barn 2/); assert.doesNotMatch(selectedIcs, /SUMMARY:Annen/); assert.match(selectedIcs, /SUMMARY:Middag: Taco/);
  await assert.rejects(() => create("user-1", { name: "Tom", scope: "selectedParticipant", selectedMemberIds: [] }), /at least one family member/i);
  await assert.rejects(() => create("user-1", { name: "Ugyldig", scope: "selectedParticipant", selectedMemberIds: ["other-member"] }), /belong to the family/i);

  const mine = await create("user-1", { name: "Mine", scope: "mine", includeMeals: false });
  assert.equal(mine.mineFamilyMemberId, "member-1");
  const mineIcs = await service.renderFeed(tokenFromUrl(mine.privateUrl));
  assert.match(mineIcs, /SUMMARY:Barn 1/); assert.doesNotMatch(mineIcs, /SUMMARY:Barn 2|SUMMARY:Annen/);
  await service.updateFeed("user-2", "family-1", mine.id, { name: "Fortsatt medlem 1" });
  assert.equal((await service.getFeed("user-2", "family-1", mine.id)).mineFamilyMemberId, "member-1", "unrelated edits preserve the existing mine audience");

  const migratedToken = "M".repeat(43);
  feeds.push({ ...feeds[0], id: "migrated", name: "Migrert", token: migratedToken, scope: "family", createdByFamilyMemberId: "member-1", mineFamilyMemberId: null, selectedMembers: [] });
  const claimed = await service.updateFeed("user-2", "family-1", "migrated", { scope: "mine" });
  assert.equal(claimed.mineFamilyMemberId, "member-2", "the editor becomes the audience when changing a family feed to mine");
  assert.equal(feeds.find(feed => feed.id === "migrated").createdByFamilyMemberId, "member-1", "changing audience does not rewrite creator metadata");
  assert.equal(tokenFromUrl(claimed.privateUrl), migratedToken, "changing scope preserves the existing token");
  await service.updateFeed("user-1", "family-1", "migrated", { name: "Fortsatt medlem 2" });
  assert.equal((await service.getFeed("user-1", "family-1", "migrated")).mineFamilyMemberId, "member-2", "later viewers/editors cannot change mine ownership");
  const claimedIcs = await service.renderFeed(migratedToken); assert.match(claimedIcs, /SUMMARY:Barn 2/); assert.doesNotMatch(claimedIcs, /SUMMARY:Barn 1|SUMMARY:Annen/);
  await service.updateFeed("user-1", "family-1", "migrated", { scope: "family" });
  assert.equal((await service.getFeed("user-1", "family-1", "migrated")).mineFamilyMemberId, null, "leaving mine clears its audience");
  const familyIcs = await service.renderFeed(migratedToken); assert.match(familyIcs, /SUMMARY:Barn 1/); assert.match(familyIcs, /SUMMARY:Barn 2/); assert.match(familyIcs, /SUMMARY:Annen/);

  feeds.push({ ...feeds[0], id: "invalid-mine", token: "I".repeat(43), scope: "mine", createdByFamilyMemberId: "member-1", mineFamilyMemberId: null, selectedMembers: [] });
  await assert.rejects(() => service.renderFeed("I".repeat(43)), /not found/i, "invalid mine state must fail closed");
  feeds.push({ ...feeds[0], id: "foreign-mine", token: "F".repeat(43), scope: "mine", mineFamilyMemberId: "other-member", selectedMembers: [] });
  await assert.rejects(() => service.renderFeed("F".repeat(43)), /not found/i, "a mine member outside the family must fail closed");

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
  const wasteSql = readFileSync("prisma/migrations/20260923130000_add_waste_collection_to_calendar_feeds/migration.sql", "utf8");
  assert.match(wasteSql, /DEFAULT false/i, "existing feeds remain opted out of the newly introduced category");
  console.log("multiple calendar feeds: ok");
}
void run();
