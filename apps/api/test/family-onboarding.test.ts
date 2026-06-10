import "reflect-metadata";
import { strict as assert } from "node:assert";
import { FamiliesService } from "../src/families/families.service";

type FamilyMemberRole = "OWNER" | "PARENT" | "CHILD" | "GUEST";

type UserRecord = {
  id: string;
  name: string;
};

type FamilyRecord = {
  id: string;
  name: string;
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

const NOW = new Date("2026-06-10T00:00:00.000Z");

class InMemoryFamilyPrismaService {
  private readonly users = new Map<string, UserRecord>();
  private readonly families = new Map<string, FamilyRecord>();
  private readonly members = new Map<string, FamilyMemberRecord>();
  private nextFamilyId = 1;
  private nextMemberId = 1;

  readonly client = this.createClient();

  addUser(user: UserRecord): void {
    this.users.set(user.id, user);
  }

  familyCount(): number {
    return this.families.size;
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
          where: { id: string };
        }): Promise<UserRecord | null> => this.users.get(where.id) ?? null,
      },
      family: {
        create: async ({
          data,
          include,
        }: {
          data: {
            name: string;
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
          const family: FamilyRecord = {
            id: `family-${this.nextFamilyId++}`,
            name: data.name,
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
        findFirst: async ({
          where,
        }: {
          where: { userId?: string; role?: FamilyMemberRole };
        }) => {
          const member = [...this.members.values()].find(
            (candidate) =>
              (!where.userId || candidate.userId === where.userId) &&
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
    };
  }
}

async function run(): Promise<void> {
  const prisma = new InMemoryFamilyPrismaService();
  prisma.addUser({ id: "user-1", name: "Kyrre Nordmann" });
  const service = new FamiliesService(
    prisma as never,
    {} as never,
    {} as never,
  );

  const first = await service.createFamily("user-1", {
    name: "Familien Nordmann",
  });
  const second = await service.createFamily("user-1", {
    name: "Skal ikke lage ny",
  });

  assert.equal(
    first.family.id,
    second.family.id,
    "repeated create-family returns the existing owned family",
  );
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

  console.log("family onboarding idempotency tests passed");
}

void run();
