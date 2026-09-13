type SubjectRemovalClient = {
  healthPlan: {
    findMany(args: unknown): Promise<Array<{ id: string; status: string }>>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  healthPlanOccurrence: { updateMany(args: unknown): Promise<{ count: number }> };
  healthPlanHistory: { create(args: unknown): Promise<unknown> };
};

export type SubjectRemovalActor = { userId: string; displayName: string };

/**
 * Makes every plan for a departing subject historical. The caller owns the
 * transaction and must delete the FamilyMember in that same transaction.
 */
export async function prepareHealthPlansForSubjectRemoval(
  tx: SubjectRemovalClient,
  familyId: string,
  familyMemberId: string,
  actor: SubjectRemovalActor,
  removalInstant = new Date()
): Promise<void> {
  const plans = await tx.healthPlan.findMany({
    where: { familyId, familyMemberId },
    select: { id: true, status: true },
  });

  for (const plan of plans) {
    const toStatus = plan.status === "DRAFT" ? "ARCHIVED"
      : plan.status === "ACTIVE" || plan.status === "PAUSED" ? "COMPLETED"
        : plan.status;

    if (toStatus !== plan.status) {
      await tx.healthPlanOccurrence.updateMany({
        where: {
          healthPlanId: plan.id,
          familyId,
          scheduledAt: { gte: removalInstant },
          status: { in: ["PENDING", "SNOOZED"] },
        },
        data: { status: "SKIPPED", completedAt: null, completedByUserId: null },
      });
      const changed = await tx.healthPlan.updateMany({
        where: { id: plan.id, familyId, familyMemberId, status: plan.status },
        data: { status: toStatus, pausedAt: null },
      });
      if (changed.count !== 1) throw new Error("Health plan changed concurrently during subject removal");
      await tx.healthPlanHistory.create({
        data: {
          healthPlanId: plan.id,
          type: "STATUS_CHANGED",
          actorUserId: actor.userId,
          actorDisplayName: actor.displayName,
          metadata: { fromStatus: plan.status, toStatus, reason: "SUBJECT_REMOVED" },
          occurredAt: removalInstant,
        },
      });
    }
  }

  // Detach terminal and already-terminal plans alike. The snapshot is immutable.
  await tx.healthPlan.updateMany({
    where: { familyId, familyMemberId },
    data: { familyMemberId: null },
  });
}
