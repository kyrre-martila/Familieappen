import "reflect-metadata";
import assert from "node:assert/strict";
import { HEALTH_PLAN_NOTIFICATION_BODY, HEALTH_PLAN_NOTIFICATION_CATCH_UP_MINUTES, HEALTH_PLAN_NOTIFICATION_TITLE, HealthPlanNotificationService } from "../src/health-plans/health-plan-notification.service";
import { NotificationsService } from "../src/notifications/notifications.service";
import { PushNotificationService } from "../src/notifications/push-notification.service";

type Status = "PENDING" | "SNOOZED" | "COMPLETED" | "SKIPPED";
type PlanStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
type Recipient = { familyMember: { userId: string | null; user: { deactivatedAt: Date | null; notificationPreferences: { healthPlansEnabled: boolean } | null } | null } };
type Occurrence = { id: string; familyId: string; healthPlanId: string; scheduledAt: Date; status: Status; healthPlan: { status: PlanStatus; notificationRecipients: Recipient[] } };
const instant = (hhmm: string) => new Date(`2026-09-12T${hhmm}:00.000Z`);
const recipient = (userId: string | null, enabled = true, deactivated = false): Recipient => ({ familyMember: { userId, user: userId ? { deactivatedAt: deactivated ? instant("19:00") : null, notificationPreferences: enabled ? { healthPlansEnabled: true } : { healthPlansEnabled: false } } : null } });
const occurrence = (scheduledAt: Date, status: Status = "PENDING", planStatus: PlanStatus = "ACTIVE", recipients = [recipient("user-a")], id = "occ-sensitive"): Occurrence => ({ id, familyId: "family-a", healthPlanId: "plan-adhd", scheduledAt, status, healthPlan: { status: planStatus, notificationRecipients: recipients } });

class SchedulerFake {
  rows: Occurrence[] = [];
  ledger = new Map<string, Record<string, unknown>>();
  pushes: Record<string, unknown>[] = [];
  healthPlanOccurrence = {
    findMany: async ({ where, take }: any) => this.rows.filter(row => where.status.in.includes(row.status) && row.scheduledAt >= where.scheduledAt.gte && row.scheduledAt <= where.scheduledAt.lte && row.healthPlan.status === where.healthPlan.status).slice(0, take),
    findFirst: async ({ where }: any) => this.rows.find(row => row.id === where.id && row.familyId === where.familyId && row.scheduledAt.getTime() === where.scheduledAt.getTime() && where.status.in.includes(row.status) && row.healthPlan.status === where.healthPlan.status) ? { id: where.id } : null,
  };
  notifications = {
    createNotificationAndDeliver: async (input: any) => {
      if (this.ledger.has(input.dedupeKey)) return null;
      this.ledger.set(input.dedupeKey, input); this.pushes.push(input); return { id: `n-${this.ledger.size}`, ...input };
    },
  };
  async run(now: Date) { return new HealthPlanNotificationService({ client: this } as never, this.notifications as never).processDue(now); }
}

const notificationDto = { id: "notification-1", familyId: "family-a", recipientUserId: "user-a", actorUserId: null, type: "health_plan_occurrence", title: HEALTH_PLAN_NOTIFICATION_TITLE, body: HEALTH_PLAN_NOTIFICATION_BODY, entityType: "healthPlanOccurrence", entityId: "occ-sensitive", deepLink: "/health-plans", readAt: null, createdAt: instant("20:00").toISOString(), updatedAt: instant("20:00").toISOString() };

async function schedulerTests() {
  assert.equal(HEALTH_PLAN_NOTIFICATION_CATCH_UP_MINUTES, 30);
  const cases: Array<[string, Occurrence, boolean]> = [
    ["due", occurrence(instant("20:00")), true], ["future", occurrence(instant("20:05")), false],
    ["catch-up", occurrence(instant("19:40")), true], ["too old", occurrence(instant("19:31")), false],
    ["inclusive boundary", occurrence(instant("19:32")), true],
    ["snoozed", occurrence(instant("20:00"), "SNOOZED"), true],
    ["completed occurrence", occurrence(instant("20:00"), "COMPLETED"), false], ["skipped occurrence", occurrence(instant("20:00"), "SKIPPED"), false],
    ...(["DRAFT", "PAUSED", "COMPLETED", "ARCHIVED"] as PlanStatus[]).map(status => [`${status} plan`, occurrence(instant("20:00"), "PENDING", status), false] as [string, Occurrence, boolean]),
  ];
  for (const [label, row, expected] of cases) { const db = new SchedulerFake(); db.rows = [row]; await db.run(instant("20:02")); assert.equal(db.ledger.size > 0, expected, label); }

  const db = new SchedulerFake(); db.rows = [occurrence(instant("20:00"), "PENDING", "ACTIVE", [recipient("user-a"), recipient("user-b")])];
  await db.run(instant("20:00")); assert.equal(db.ledger.size, 2); assert.equal(db.pushes.length, 2);
  await db.run(instant("20:01")); assert.equal(db.ledger.size, 2); assert.equal(db.pushes.length, 2, "rerun does not deliver again");
  db.rows[0].scheduledAt = instant("21:00"); db.rows[0].status = "SNOOZED";
  await db.run(instant("20:30")); assert.equal(db.ledger.size, 2, "future snooze is not due");
  await db.run(instant("21:00")); assert.equal(db.ledger.size, 4, "new snooze instant has a new identity");
  await db.run(instant("21:01")); assert.equal(db.ledger.size, 4, "snooze instant is delivered once");

  for (const recipients of [[recipient("user-a", false), recipient("user-b")], [recipient("user-a", true, true), recipient("user-b")]]) {
    const eligibility = new SchedulerFake(); eligibility.rows = [occurrence(instant("20:00"), "PENDING", "ACTIVE", recipients)]; await eligibility.run(instant("20:00")); assert.deepEqual([...eligibility.ledger.values()].map(x => x.recipientUserId), ["user-b"]);
  }
  for (const pushed of db.pushes) {
    const serialized = JSON.stringify({ title: pushed.title, body: pushed.body, data: { deepLink: pushed.deepLink } });
    for (const sensitive of ["ADHD-medisin", "Alma", "Ta Ritalin 20 mg", "Ta én tablett med vann"]) assert.ok(!serialized.includes(sensitive));
  }
}

async function pushTests() {
  const originalFetch = globalThis.fetch;
  try {
    const devices = [{ id: "active-1", userId: "user-a", expoPushToken: "ExponentPushToken[a]", disabledAt: null }, { id: "active-2", userId: "user-a", expoPushToken: "ExponentPushToken[b]", disabledAt: null }, { id: "disabled", userId: "user-a", expoPushToken: "ExponentPushToken[c]", disabledAt: instant("19:00") }];
    const updates: any[] = []; let sent: any[] = [];
    const prisma = { client: { pushDevice: {
      findMany: async ({ where }: any) => devices.filter(d => d.userId === where.userId && d.disabledAt === where.disabledAt),
      updateMany: async (args: any) => { updates.push(args); return { count: 1 }; },
    } } };
    globalThis.fetch = (async (_url, init) => { sent = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ data: [{ status: "error", details: { error: "DeviceNotRegistered" } }, { status: "ok" }] }), { status: 200 }); }) as typeof fetch;
    await new PushNotificationService(prisma as never).sendToUser("user-a", notificationDto);
    assert.equal(sent.length, 2, "two active devices receive two messages"); assert.equal(updates.length, 1, "invalid token is disabled");
    for (const message of sent) { assert.deepEqual(message.data, { deepLink: "/health-plans", notificationId: "notification-1" }); for (const sensitive of ["ADHD-medisin", "Alma", "Ta Ritalin 20 mg", "Ta én tablett med vann"]) assert.ok(!JSON.stringify(message).includes(sensitive)); }
    devices[0].disabledAt = instant("20:00"); devices[1].disabledAt = instant("20:00"); sent = []; await new PushNotificationService(prisma as never).sendToUser("user-a", notificationDto); assert.equal(sent.length, 0, "no active device performs no transport");
    devices[0].disabledAt = null; globalThis.fetch = (async () => { throw new Error("temporary network failure"); }) as typeof fetch; await new PushNotificationService(prisma as never).sendToUser("user-a", notificationDto); assert.equal(updates.length, 1, "temporary failure does not disable device");
  } finally { globalThis.fetch = originalFetch; }
}

async function p2002Tests() {
  const base = { familyId: "family-a", recipientUserId: "user-a", type: "health_plan_occurrence", title: "Helseplan", body: HEALTH_PLAN_NOTIFICATION_BODY, dedupeKey: "same", allowSelfNotification: true };
  const make = (error: unknown) => new NotificationsService({ client: { notification: { create: async () => { throw error; } }, familyMember: { findFirst: async () => ({ id: "m" }) } } } as never, { getOrCreatePreferences: async () => ({ healthPlansEnabled: true }) } as never, { sendToUser: async () => undefined } as never);
  assert.equal(await make({ code: "P2002", meta: { target: ["dedupeKey"] } }).createNotification(base), null);
  await assert.rejects(() => make({ code: "P2002", meta: { target: ["otherKey"] } }).createNotification(base));
  await assert.rejects(() => make({ code: "P2025" }).createNotification(base));

  let committed = false; let pushAttempts = 0;
  const racing = new NotificationsService({ client: {
    notification: { create: async ({ data }: any) => { await new Promise(resolve => setImmediate(resolve)); if (committed) throw { code: "P2002", meta: { target: ["dedupeKey"] } }; committed = true; return { id: "winner", ...data, readAt: null, createdAt: instant("20:00"), updatedAt: instant("20:00") }; } },
    familyMember: { findFirst: async () => ({ id: "m" }) },
  } } as never, { getOrCreatePreferences: async () => ({ healthPlansEnabled: true }) } as never, { sendToUser: async () => { pushAttempts += 1; } } as never);
  const results = await Promise.all([racing.createNotificationAndDeliver(base), racing.createNotificationAndDeliver(base)]);
  assert.equal(results.filter(Boolean).length, 1, "one concurrent ledger create wins"); assert.equal(pushAttempts, 1, "only the ledger winner delivers push");
}

(async () => { await schedulerTests(); await pushTests(); await p2002Tests(); console.log("health-plan notification tests passed"); })().catch(error => { console.error(error); process.exitCode = 1; });
