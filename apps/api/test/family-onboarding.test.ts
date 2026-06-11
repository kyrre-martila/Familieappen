import "reflect-metadata";
import { strict as assert } from "node:assert";
import { FamiliesService } from "../src/families/families.service";

type FamilyMemberRole = "OWNER" | "PARENT" | "CHILD" | "GUEST";

type UserRecord = {
  id: string;
  name: string;
  email: string;
};

type FamilyRecord = {
  id: string;
  name: string;
  code: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type FamilyMemberRecord = {
  id: string;
  userId: string | null;
  familyId: string;
  displayName: string;
  role: FamilyMemberRole;
  createdAt: Date;
  updatedAt: Date;
};

type FamilyInvitationRecord = {
  id: string;
  familyId: string;
  invitedEmail: string;
  invitedUserId: string | null;
  role: FamilyMemberRole;
  tokenHash: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  source: "admin_invite" | "join_request";
  createdByUserId: string;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const NOW = new Date("2026-06-10T00:00:00.000Z");

class InMemoryFamilyPrismaService {
  private readonly users = new Map<string, UserRecord>();
  private readonly families = new Map<string, FamilyRecord>();
  private readonly members = new Map<string, FamilyMemberRecord>();
  private readonly familyInvitations = new Map<string, FamilyInvitationRecord>();
  private readonly shoppingLists = new Map<string, { id: string; familyId: string; name: string }>();
  private nextFamilyId = 1;
  private nextMemberId = 1;
  private nextInvitationId = 1;

  readonly client = this.createClient();

  addUser(user: UserRecord): void {
    this.users.set(user.id, user);
  }

  familyCount(): number {
    return this.families.size;
  }

  invitationCount(): number {
    return this.familyInvitations.size;
  }

  hasMember(userId: string, familyId: string): boolean {
    return [...this.members.values()].some((member) => member.userId === userId && member.familyId === familyId);
  }

  ownerDisplayName(userId: string): string | undefined {
    return [...this.members.values()].find(
      (member) => member.userId === userId && member.role === "OWNER",
    )?.displayName;
  }

  private createClient(): any {
    return {
      $transaction: async <T>(callback: (tx: any) => Promise<T>): Promise<T> =>
        callback(this.client),
      user: {
        findUnique: async ({
          where,
        }: {
          where: { id?: string; email?: string };
        }): Promise<UserRecord | null> => {
          if (where.id) return this.users.get(where.id) ?? null;
          if (where.email) return [...this.users.values()].find((user) => user.email.toLowerCase() === where.email?.toLowerCase()) ?? null;
          return null;
        },
      },
      family: {
        findUnique: async ({ where, include }: { where: { id?: string; code?: string }; include?: unknown }): Promise<unknown | null> => {
          const family = where.id ? this.families.get(where.id) : [...this.families.values()].find((candidate) => candidate.code === where.code);

          if (!family) {
            return null;
          }

          if (include) {
            return {
              ...family,
              members: [...this.members.values()].filter((member) => member.familyId === family.id),
            };
          }

          return family;
        },
        create: async ({
          data,
          include,
        }: {
          data: {
            name: string;
            code: string;
            members: {
              create: {
                userId: string;
                displayName: string;
                role: FamilyMemberRole;
              };
            };
          };
          include?: unknown;
        }) => {
          if ([...this.families.values()].some((family) => family.code === data.code)) {
            const error = new Error("Unique constraint failed") as Error & { code: string };
            error.code = "P2002";
            throw error;
          }

          const family: FamilyRecord = {
            id: `family-${this.nextFamilyId++}`,
            name: data.name,
            code: data.code,
            createdAt: new Date(NOW.getTime() + this.nextFamilyId),
            updatedAt: new Date(NOW.getTime() + this.nextFamilyId),
          };
          const member: FamilyMemberRecord = {
            id: `member-${this.nextMemberId++}`,
            userId: data.members.create.userId,
            familyId: family.id,
            displayName: data.members.create.displayName,
            role: data.members.create.role,
            createdAt: family.createdAt,
            updatedAt: family.updatedAt,
          };

          this.families.set(family.id, family);
          this.members.set(member.id, member);

          return include ? { ...family, members: [member] } : family;
        },
      },
      familyMember: {
        findMany: async ({ where, include }: { where: { userId: string }; include?: { family?: boolean } }): Promise<unknown[]> => {
          const memberships = [...this.members.values()].filter((member) => member.userId === where.userId);

          if (include?.family) {
            return memberships.map((member) => ({ ...member, family: this.families.get(member.familyId) }));
          }

          return memberships;
        },
        findFirst: async ({
          where,
        }: {
          where: { userId?: string; familyId?: string; role?: FamilyMemberRole; user?: { email?: { equals: string } } };
        }) => {
          const member = [...this.members.values()].find(
            (candidate) =>
              (!where.userId || candidate.userId === where.userId) &&
              (!where.familyId || candidate.familyId === where.familyId) &&
              (!where.user?.email?.equals || this.users.get(candidate.userId ?? "")?.email.toLowerCase() === where.user.email.equals.toLowerCase()) &&
              (!where.role || candidate.role === where.role),
          );

          if (!member) {
            return null;
          }

          const family = this.families.get(member.familyId);
          const familyMembers = [...this.members.values()].filter(
            (candidate) => candidate.familyId === member.familyId,
          );

          return family
            ? { ...member, family: { ...family, members: familyMembers } }
            : null;
        },
        create: async ({ data }: { data: { userId: string; familyId: string; displayName: string; role: FamilyMemberRole } }) => {
          const member: FamilyMemberRecord = {
            id: `member-${this.nextMemberId++}`,
            userId: data.userId,
            familyId: data.familyId,
            displayName: data.displayName,
            role: data.role,
            createdAt: NOW,
            updatedAt: NOW,
          };
          this.members.set(member.id, member);
          return member;
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { displayName: string };
        }) => {
          const member = this.members.get(where.id);

          if (!member) {
            throw new Error("Member not found");
          }

          const updated = {
            ...member,
            displayName: data.displayName,
            updatedAt: new Date(NOW.getTime() + 1000),
          };
          this.members.set(where.id, updated);
          return updated;
        },
      },
      shoppingList: {
        findUnique: async ({ where }: { where: { familyId: string } }) => [...this.shoppingLists.values()].find((list) => list.familyId === where.familyId) ?? null,
        create: async ({ data }: { data: { familyId: string; name: string } }) => {
          const shoppingList = { id: `shopping-${data.familyId}`, ...data };
          this.shoppingLists.set(shoppingList.id, shoppingList);
          return shoppingList;
        },
      },
      shoppingListItem: {
        count: async () => 0,
      },
      wishlistItem: {
        findMany: async () => [],
      },
      calendarEvent: {
        findMany: async () => [],
      },
      mealPlan: {
        findUnique: async () => null,
      },
      mealPlanDay: {
        findFirst: async () => null,
      },
      task: {
        findMany: async () => [],
      },
      familyInvitation: {
        findFirst: async ({ where }: { where: { id?: string; familyId: string; invitedUserId?: string; invitedEmail?: { equals: string }; status?: FamilyInvitationRecord["status"]; source?: FamilyInvitationRecord["source"]; OR?: Array<{ invitedUserId?: string; invitedEmail?: { equals: string } }> } }): Promise<FamilyInvitationRecord | null> => {
          return [...this.familyInvitations.values()].find((invitation) => {
            const matchesOr = !where.OR || where.OR.some((condition) =>
              (condition.invitedUserId && invitation.invitedUserId === condition.invitedUserId) ||
              (condition.invitedEmail && invitation.invitedEmail.toLowerCase() === condition.invitedEmail.equals.toLowerCase()),
            );

            return (!where.id || invitation.id === where.id) &&
              invitation.familyId === where.familyId &&
              (!where.invitedUserId || invitation.invitedUserId === where.invitedUserId) &&
              (!where.invitedEmail || invitation.invitedEmail.toLowerCase() === where.invitedEmail.equals.toLowerCase()) &&
              (!where.status || invitation.status === where.status) &&
              (!where.source || invitation.source === where.source) &&
              matchesOr;
          }) ?? null;
        },
        create: async ({ data }: { data: Omit<FamilyInvitationRecord, "id" | "status" | "acceptedAt" | "declinedAt" | "revokedAt" | "createdAt" | "updatedAt"> }): Promise<FamilyInvitationRecord> => {
          const invitation: FamilyInvitationRecord = {
            id: `invitation-${this.nextInvitationId++}`,
            ...data,
            status: "pending",
            source: data.source ?? "admin_invite",
            acceptedAt: null,
            declinedAt: null,
            revokedAt: null,
            createdAt: NOW,
            updatedAt: NOW,
          };
          this.familyInvitations.set(invitation.id, invitation);
          return invitation;
        },
        update: async ({ where, data }: { where: { id: string }; data: Partial<FamilyInvitationRecord> }): Promise<FamilyInvitationRecord> => {
          const invitation = this.familyInvitations.get(where.id);
          if (!invitation) {
            throw new Error("Invitation not found");
          }
          const updated = { ...invitation, ...data, updatedAt: new Date(NOW.getTime() + 1000) };
          this.familyInvitations.set(where.id, updated);
          return updated;
        },
      },
    };
  }
}

async function run(): Promise<void> {
  const prisma = new InMemoryFamilyPrismaService();
  prisma.addUser({ id: "user-1", name: "Kyrre Nordmann", email: "kyrre@example.com" });
  prisma.addUser({ id: "user-2", name: "Anne Nordmann", email: "anne@example.com" });
  prisma.addUser({ id: "user-3", name: "Per Hansen", email: "per@example.com" });
  const familyAuthorization = {
    requireFamilyMember: async (userId: string, familyId: string) => ({ id: `member-${userId}-${familyId}`, userId, familyId, role: "OWNER", displayName: userId }),
    requireFamilyRole: async (userId: string, familyId: string) => ({ id: `member-${userId}-${familyId}`, userId, familyId, role: "OWNER", displayName: userId }),
  };
  const service = new FamiliesService(
    prisma as never,
    familyAuthorization as never,
    {} as never,
  );

  const first = await service.createFamily("user-1", {
    name: "Familien Nordmann",
  });
  const second = await service.createFamily("user-1", {
    name: "Skal ikke lage ny",
  });

  assert.match(first.family.code ?? "", /^FA-[A-Z0-9]{6}$/, "create-family returns a generated backend family code");
  assert.equal(
    first.family.id,
    second.family.id,
    "repeated create-family returns the existing owned family",
  );
  assert.equal(second.family.code, first.family.code, "idempotent create-family returns the persisted code");
  assert.equal(
    prisma.familyCount(),
    1,
    "repeated create-family does not create duplicates",
  );
  assert.equal(
    first.members[0].displayName,
    "Kyrre Nordmann",
    "owner member uses the persisted full user name",
  );
  assert.equal(
    prisma.ownerDisplayName("user-1"),
    "Kyrre Nordmann",
    "owner member displayName remains persisted full name",
  );

  const listedFamilies = await service.listUserFamilies("user-1");
  assert.equal(listedFamilies[0]?.family.code, first.family.code, "list-family data returns the persisted family code");

  const familyDetails = await service.getFamilyDetails("user-1", first.family.id);
  assert.equal(familyDetails.family.code, first.family.code, "family details/settings data returns the persisted family code");

  const familyDashboard = await service.getFamilyDashboard("user-1", first.family.id);
  assert.equal(familyDashboard.family.code, first.family.code, "family dashboard data returns the persisted family code");

  const third = await service.createFamily("user-3", { name: "Familien Hansen" });
  assert.notEqual(third.family.code, first.family.code, "family codes are unique across families");

  const codeWithoutPrefix = first.family.code?.replace(/^FA-/, "") ?? "";
  const joinRequest = await service.joinFamilyByCode("user-2", { code: codeWithoutPrefix.toLowerCase() });
  assert.equal(joinRequest.familyId, first.family.id, "join-by-code normalizes codes without prefix");
  assert.equal(joinRequest.status, "pending", "join-by-code creates a pending approval request");
  assert.equal(joinRequest.source, "join_request", "join-by-code marks the record as an inbound join request");
  assert.equal(joinRequest.invitedEmail, "anne@example.com", "join-by-code records the requesting user email");

  const duplicateJoinRequest = await service.joinFamilyByCode("user-2", { code: first.family.code });
  assert.equal(duplicateJoinRequest.id, joinRequest.id, "duplicate join-by-code returns the existing pending request");
  assert.equal(prisma.invitationCount(), 1, "duplicate join-by-code does not create duplicate pending requests");

  await assert.rejects(
    () => service.joinFamilyByCode("user-2", { code: "FA-NOT999" }),
    /Family code was not found/,
    "invalid family code returns a not-found error",
  );

  const approvedRequest = await service.approveFamilyJoinRequest("user-1", first.family.id, joinRequest.id);
  assert.equal(approvedRequest.status, "accepted", "approving a join request marks it accepted");
  assert.equal(prisma.hasMember("user-2", first.family.id), true, "approving a join request creates a family member");

  await assert.rejects(
    () => service.approveFamilyJoinRequest("user-1", first.family.id, joinRequest.id),
    /Bare ventende forespørsler/,
    "approval rejects already-accepted join requests",
  );

  await assert.rejects(
    () => service.joinFamilyByCode("user-2", { code: first.family.code }),
    /already a member/,
    "join-by-code rejects users who are already family members after approval",
  );

  await assert.rejects(
    () => service.joinFamilyByCode("user-1", { code: first.family.code }),
    /already a member/,
    "join-by-code rejects users who are already family members",
  );

  const rejectableRequest = await service.joinFamilyByCode("user-3", { code: first.family.code });
  const rejectedRequest = await service.rejectFamilyJoinRequest("user-1", first.family.id, rejectableRequest.id);
  assert.equal(rejectedRequest.status, "declined", "rejecting a join request marks it declined");
  assert.equal(prisma.hasMember("user-3", first.family.id), false, "rejecting a join request does not create a family member");

  console.log("family onboarding idempotency and code tests passed");
}

void run();
