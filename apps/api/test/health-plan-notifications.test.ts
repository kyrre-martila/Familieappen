import assert from "node:assert/strict";
import { HEALTH_PLAN_NOTIFICATION_BODY, HEALTH_PLAN_NOTIFICATION_CATCH_UP_MINUTES, HEALTH_PLAN_NOTIFICATION_TITLE, HealthPlanNotificationService } from "../src/health-plans/health-plan-notification.service";

const scheduledAt = new Date("2026-09-12T20:00:00.000Z");
const occurrence = (at = scheduledAt, preference = true) => ({ id: "occ-sensitive", familyId: "family-a", healthPlanId: "plan-adhd", scheduledAt: at, healthPlan: { notificationRecipients: [{ familyMember: { userId: "user-a", user: { deactivatedAt: null, notificationPreference: { healthPlansEnabled: preference } } } }, { familyMember: { userId: "user-b", user: { deactivatedAt: null, notificationPreference: null } } }] } });

async function runProcess(rows: ReturnType<typeof occurrence>[], existing = new Set<string>()) {
  const created: any[] = []; let query: any;
  const prisma = { client: { healthPlanOccurrence: { findMany: async (input: any) => { query = input; return rows; }, findFirst: async () => ({ id: "still-due" }) } } } as any;
  const notifications = { createNotification: async (input: any) => { if (existing.has(input.dedupeKey)) return null; existing.add(input.dedupeKey); created.push(input); return input; } } as any;
  const result = await new HealthPlanNotificationService(prisma, notifications).processDue(new Date("2026-09-12T20:02:00.000Z"));
  return { created, result, query, existing };
}

(async () => {
  const first = await runProcess([occurrence()]);
  assert.equal(first.result.created, 2, "one occurrence creates one row per enabled recipient");
  assert.deepEqual(first.query.where.status.in, ["PENDING", "SNOOZED"]);
  assert.equal(first.query.where.healthPlan.status, "ACTIVE");
  assert.equal(first.query.where.scheduledAt.gte.toISOString(), "2026-09-12T19:32:00.000Z");
  assert.equal(HEALTH_PLAN_NOTIFICATION_CATCH_UP_MINUTES, 30);
  for (const notification of first.created) {
    assert.equal(notification.title, HEALTH_PLAN_NOTIFICATION_TITLE); assert.equal(notification.body, HEALTH_PLAN_NOTIFICATION_BODY); assert.equal(notification.deepLink, "/health-plans");
    for (const sensitive of ["ADHD-medisin", "Alma", "Ta Ritalin 20 mg"]) assert.ok(!`${notification.title} ${notification.body}`.includes(sensitive));
  }
  const rerun = await runProcess([occurrence()], first.existing); assert.equal(rerun.result.created, 0, "same instant is idempotent");
  const snoozed = await runProcess([occurrence(new Date("2026-09-12T21:00:00.000Z"))], first.existing); assert.equal(snoozed.result.created, 2, "new snooze instant has a new identity");
  const preference = await runProcess([occurrence(scheduledAt, false)]); assert.equal(preference.result.created, 1, "disabled recipient does not suppress another recipient");
  console.log("health-plan notification tests passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
