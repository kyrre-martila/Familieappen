import "reflect-metadata";
import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { HttpStatus, INestApplication, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AuthController } from "../src/auth/auth.controller";
import { AuthService } from "../src/auth/auth.service";
import { ProfileController } from "../src/auth/profile.controller";
import { ProfileService } from "../src/auth/profile.service";
import { AuthGuard } from "../src/auth/guards/auth.guard";
import { FeedbackController } from "../src/feedback/feedback.controller";
import { FeedbackService } from "../src/feedback/feedback.service";
import { API_ERROR_CODES, ApiException, HttpExceptionFilter } from "../src/common";
import { ConfigService } from "../src/config";
import { EmailService } from "../src/email";
import { HealthController } from "../src/health/health.controller";
import { PrismaService } from "../src/prisma";
import { ShoppingController } from "../src/shopping/shopping.controller";
import { ShoppingService } from "../src/shopping/shopping.service";
import { WishlistsController } from "../src/wishlists/wishlists.controller";
import { WishlistsService } from "../src/wishlists/wishlists.service";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type FamilyRecord = { id: string; name: string };
type FamilyMemberRecord = { id: string; userId: string | null; familyId: string; role: "OWNER" | "PARENT" | "CHILD" | "GUEST"; displayName: string };
type InvitationRecord = { id: string; createdByUserId: string; familyId: string; status: "pending" | "accepted" | "declined" | "revoked"; revokedAt: Date | null };
type WishlistShareRecord = { id: string; createdByUserId: string; familyId: string; status: "pending" | "accepted" | "declined" | "removed" | "revoked"; revokedAt: Date | null };
type FeedbackRecord = { id: string; type: "feedback" | "bug"; message: string; userId: string; familyId: string | null; userAgent: string | null; appVersion: string | null; createdAt: Date };
type SessionRecord = { id: string; userId: string; refreshTokenHash: string; userAgent: string | null; ipAddress: string | null; revokedAt: Date | null; expiresAt: Date; createdAt: Date; updatedAt: Date };

type HttpResponse<T = Record<string, unknown>> = {
  status: number;
  body: T;
};

const AUTH_SECRET = "familieappen-test-auth-secret-for-contracts";
const NOW = new Date();

class TestConfigService {
  readonly authJwtSecret = AUTH_SECRET;
  readonly nodeEnv = "test";
}

class InMemoryPrismaService {
  private users = new Map<string, UserRecord>();
  private families = new Map<string, FamilyRecord>();
  private familyMembers = new Map<string, FamilyMemberRecord>();
  private familyInvitations = new Map<string, InvitationRecord>();
  private wishlistShareInvitations = new Map<string, WishlistShareRecord>();
  private feedbackSubmissions = new Map<string, FeedbackRecord>();
  private sessions = new Map<string, SessionRecord>();
  private nextUserId = 1;
  private nextFeedbackId = 1;
  private nextMemberId = 1;
  private nextSessionId = 1;
  readonly isConfigured = false;

  readonly client = this.createClient();

  createFamily(familyId: string, members: Array<{ userId: string; role: FamilyMemberRecord["role"]; displayName?: string }>): void {
    this.families.set(familyId, { id: familyId, name: familyId });

    for (const member of members) {
      const id = `member-${this.nextMemberId++}`;
      this.familyMembers.set(id, {
        id,
        userId: member.userId,
        familyId,
        role: member.role,
        displayName: member.displayName ?? member.role
      });
    }
  }

  createPendingInvites(userId: string, familyId: string): void {
    this.familyInvitations.set(`invite-${userId}-${familyId}`, { id: `invite-${userId}-${familyId}`, createdByUserId: userId, familyId, status: "pending", revokedAt: null });
    this.wishlistShareInvitations.set(`share-${userId}-${familyId}`, { id: `share-${userId}-${familyId}`, createdByUserId: userId, familyId, status: "pending", revokedAt: null });
  }

  hasUser(userId: string): boolean {
    return [...this.users.values()].some((user) => user.id === userId);
  }

  hasFamily(familyId: string): boolean {
    return this.families.has(familyId);
  }

  memberCount(familyId: string): number {
    return [...this.familyMembers.values()].filter((member) => member.familyId === familyId).length;
  }

  pendingInvitesBy(userId: string): number {
    return [...this.familyInvitations.values(), ...this.wishlistShareInvitations.values()].filter((invite) => invite.createdByUserId === userId && invite.status === "pending").length;
  }

  feedbackFor(userId: string): FeedbackRecord[] {
    return [...this.feedbackSubmissions.values()].filter((submission) => submission.userId === userId);
  }

  private createClient(): any {
    return {
      $transaction: async <T>(callback: (tx: any) => Promise<T>): Promise<T> => callback(this.client),
      user: {
        findUnique: async ({ where }: { where: { email?: string; id?: string } }): Promise<UserRecord | null> => {
          if (where.email) {
            return this.users.get(where.email) ?? null;
          }

          return [...this.users.values()].find((user) => user.id === where.id) ?? null;
        },
        create: async ({ data }: { data: { name: string; email: string; passwordHash: string; phone?: string | null } }): Promise<UserRecord> => {
          if (this.users.has(data.email)) {
            const error = new Error("Unique constraint failed") as Error & { code: string };
            error.code = "P2002";
            throw error;
          }

          const user: UserRecord = {
            id: `user-${this.nextUserId++}`,
            name: data.name,
            email: data.email,
            passwordHash: data.passwordHash,
            phone: data.phone ?? null,
            createdAt: NOW,
            updatedAt: NOW
          };

          this.users.set(user.email, user);
          return user;
        },
        update: async ({ where, data }: { where: { id: string }; data: { name?: string; email?: string; phone?: string | null; passwordHash?: string } }): Promise<UserRecord> => {
          const user = [...this.users.values()].find((candidate) => candidate.id === where.id);

          if (!user) {
            const error = new Error("Record not found") as Error & { code: string };
            error.code = "P2025";
            throw error;
          }

          if (data.email && data.email !== user.email && this.users.has(data.email)) {
            const error = new Error("Unique constraint failed") as Error & { code: string };
            error.code = "P2002";
            throw error;
          }

          this.users.delete(user.email);
          const updatedUser = {
            ...user,
            ...data,
            updatedAt: new Date(NOW.getTime() + 1000)
          };
          this.users.set(updatedUser.email, updatedUser);

          return updatedUser;
        },
        delete: async ({ where }: { where: { id: string } }): Promise<UserRecord> => {
          const user = [...this.users.values()].find((candidate) => candidate.id === where.id);

          if (!user) {
            throw new Error("Record not found");
          }

          this.users.delete(user.email);
          this.familyMembers.forEach((member) => {
            if (member.userId === user.id) member.userId = null;
          });
          [...this.familyInvitations].forEach(([id, invite]) => {
            if (invite.createdByUserId === user.id) this.familyInvitations.delete(id);
          });
          [...this.wishlistShareInvitations].forEach(([id, invite]) => {
            if (invite.createdByUserId === user.id) this.wishlistShareInvitations.delete(id);
          });
          return user;
        }
      },

      userSession: {
        create: async ({ data }: { data: { userId: string; refreshTokenHash: string; userAgent?: string | null; ipAddress?: string | null; expiresAt: Date } }): Promise<SessionRecord> => {
          const session: SessionRecord = {
            id: `session-${this.nextSessionId++}`,
            userId: data.userId,
            refreshTokenHash: data.refreshTokenHash,
            userAgent: data.userAgent ?? null,
            ipAddress: data.ipAddress ?? null,
            revokedAt: null,
            expiresAt: data.expiresAt,
            createdAt: NOW,
            updatedAt: NOW
          };
          this.sessions.set(session.id, session);
          return session;
        },
        findUnique: async ({ where, include, select }: { where: { id?: string; refreshTokenHash?: string }; include?: { user?: boolean }; select?: Record<string, boolean> }): Promise<unknown | null> => {
          const session = where.id ? this.sessions.get(where.id) : [...this.sessions.values()].find((candidate) => candidate.refreshTokenHash === where.refreshTokenHash);

          if (!session) {
            return null;
          }

          if (include?.user) {
            return { ...session, user: [...this.users.values()].find((user) => user.id === session.userId) };
          }

          if (select) {
            return Object.fromEntries(Object.keys(select).map((key) => [key, session[key as keyof SessionRecord]]));
          }

          return session;
        },
        updateMany: async ({ where, data }: { where: { id?: string; userId?: string; refreshTokenHash?: string; revokedAt?: null }; data: { revokedAt?: Date; refreshTokenHash?: string } }): Promise<{ count: number }> => {
          let count = 0;
          this.sessions.forEach((session) => {
            const matchesId = !where.id || session.id === where.id;
            const matchesUser = !where.userId || session.userId === where.userId;
            const matchesRefreshTokenHash = !where.refreshTokenHash || session.refreshTokenHash === where.refreshTokenHash;
            const matchesRevoked = where.revokedAt === undefined || session.revokedAt === where.revokedAt;

            if (matchesId && matchesUser && matchesRefreshTokenHash && matchesRevoked) {
              if (data.revokedAt !== undefined) session.revokedAt = data.revokedAt;
              if (data.refreshTokenHash !== undefined) session.refreshTokenHash = data.refreshTokenHash;
              session.updatedAt = new Date(NOW.getTime() + 1000);
              count += 1;
            }
          });
          return { count };
        }
      },
      familyMember: {
        findMany: async ({ where }: { where: { userId: string } }): Promise<FamilyMemberRecord[]> => [...this.familyMembers.values()].filter((member) => member.userId === where.userId),
        findFirst: async ({ where, select }: { where: { userId: string; familyId?: string }, orderBy?: unknown, select?: { familyId?: boolean } }): Promise<FamilyMemberRecord | { familyId: string } | null> => {
          const member = [...this.familyMembers.values()].find((candidate) => candidate.userId === where.userId && (!where.familyId || candidate.familyId === where.familyId)) ?? null;
          return member && select?.familyId ? { familyId: member.familyId } : member;
        },
        count: async ({ where }: { where: { familyId: string; id?: { not: string }; role?: { in: readonly string[] } } }): Promise<number> => [...this.familyMembers.values()].filter((member) => member.familyId === where.familyId && (!where.id || member.id !== where.id.not) && (!where.role || where.role.in.includes(member.role))).length,
        updateMany: async ({ where, data }: { where: { userId?: string; role?: FamilyMemberRecord["role"] }; data: { displayName?: string } }): Promise<{ count: number }> => {
          let count = 0;
          this.familyMembers.forEach((member) => {
            if ((!where.userId || member.userId === where.userId) && (!where.role || member.role === where.role)) {
              if (data.displayName !== undefined) member.displayName = data.displayName;
              count += 1;
            }
          });
          return { count };
        },
        delete: async ({ where }: { where: { id: string } }): Promise<FamilyMemberRecord> => {
          const member = this.familyMembers.get(where.id);
          if (!member) throw new Error("Record not found");
          this.familyMembers.delete(where.id);
          return member;
        }
      },
      family: {
        delete: async ({ where }: { where: { id: string } }): Promise<FamilyRecord> => {
          const family = this.families.get(where.id);
          if (!family) throw new Error("Record not found");
          this.families.delete(where.id);
          [...this.familyMembers].forEach(([id, member]) => { if (member.familyId === where.id) this.familyMembers.delete(id); });
          return family;
        }
      },

      feedbackSubmission: {
        create: async ({ data }: { data: Omit<FeedbackRecord, "id" | "createdAt"> }): Promise<FeedbackRecord> => {
          const submission: FeedbackRecord = {
            id: `feedback-${this.nextFeedbackId++}`,
            ...data,
            createdAt: new Date(NOW.getTime() + this.nextFeedbackId * 1000)
          };
          this.feedbackSubmissions.set(submission.id, submission);
          return submission;
        },
        count: async ({ where }: { where: { userId: string; createdAt: { gte: Date } } }): Promise<number> => [...this.feedbackSubmissions.values()].filter((submission) => submission.userId === where.userId && submission.createdAt >= where.createdAt.gte).length
      },
      familyInvitation: {
        updateMany: async ({ where, data }: { where: { createdByUserId: string; status: "pending" }; data: { status: "revoked"; revokedAt: Date } }) => {
          let count = 0;
          this.familyInvitations.forEach((invite) => {
            if (invite.createdByUserId === where.createdByUserId && invite.status === where.status) {
              invite.status = data.status;
              invite.revokedAt = data.revokedAt;
              count += 1;
            }
          });
          return { count };
        }
      },
      wishlistShareInvitation: {
        updateMany: async ({ where, data }: { where: { createdByUserId: string; status: "pending" }; data: { status: "revoked"; revokedAt: Date } }) => {
          let count = 0;
          this.wishlistShareInvitations.forEach((invite) => {
            if (invite.createdByUserId === where.createdByUserId && invite.status === where.status) {
              invite.status = data.status;
              invite.revokedAt = data.revokedAt;
              count += 1;
            }
          });
          return { count };
        }
      }
    };
  }

  async checkConnection(): Promise<boolean> {
    return false;
  }
}

function createContractServices() {
  const memberships = new Map<string, Set<string>>();
  const shares = new Set(["valid-share-token"]);

  function requireMembership(userId: string, familyId: string | undefined): void {
    if (!familyId) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        API_ERROR_CODES.FAMILY_MISSING_CONTEXT,
        "X-Family-Id header is required"
      );
    }

    if (!memberships.get(userId)?.has(familyId)) {
      throw new NotFoundException("Family was not found");
    }
  }

  return {
    grant(userId: string, familyId: string): void {
      const familyIds = memberships.get(userId) ?? new Set<string>();
      familyIds.add(familyId);
      memberships.set(userId, familyIds);
    },
    shoppingService: {
      getShoppingList: async (userId: string, familyId: string | undefined) => {
        requireMembership(userId, familyId);
        return { id: `${familyId}-shopping-list`, familyId, items: [] };
      }
    },
    wishlistsService: {
      getInvitePreview: async (token: string) => {
        if (!shares.has(token)) {
          throw new NotFoundException("Shared wishlist was not found");
        }

        return { id: "wishlist-alpha", token, items: [] };
      }
    }
  };
}

async function createContractHarness() {
  const services = createContractServices();
  const prisma = new InMemoryPrismaService();
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController, ProfileController, HealthController, ShoppingController, WishlistsController, FeedbackController],
    providers: [
      AuthService,
      ProfileService,
      AuthGuard,
      FeedbackService,
      { provide: ConfigService, useClass: TestConfigService },
      { provide: PrismaService, useValue: prisma },
      { provide: EmailService, useValue: { sendEmail: async () => undefined } },
      { provide: ShoppingService, useValue: services.shoppingService },
      { provide: WishlistsService, useValue: services.wishlistsService }
    ]
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0);
  const address = app.getHttpServer().address();
  assert.equal(typeof address, "object");
  assert(address);
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function request(method: string, path: string, options: { token?: string; familyId?: string; body?: unknown } = {}): Promise<HttpResponse> {
    const headers: Record<string, string> = { accept: "application/json" };

    if (options.token) {
      headers.authorization = `Bearer ${options.token}`;
    }

    if (options.familyId) {
      headers["x-family-id"] = options.familyId;
    }

    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    return {
      status: response.status,
      body: await response.json() as Record<string, unknown>
    };
  }

  return { app, services, prisma, request };
}

function assertSuccessEnvelope(response: HttpResponse, expectedStatus: number): Record<string, unknown> {
  assert.equal(response.status, expectedStatus, JSON.stringify(response.body));
  assert("data" in response.body, JSON.stringify(response.body));
  assert(!("error" in response.body), JSON.stringify(response.body));
  assert(response.body.data && typeof response.body.data === "object", JSON.stringify(response.body));
  return response.body.data as Record<string, unknown>;
}

function assertErrorEnvelope(response: HttpResponse, expectedStatus: number, expectedCode: string): void {
  assert.equal(response.status, expectedStatus, JSON.stringify(response.body));
  assert("error" in response.body, JSON.stringify(response.body));
  assert(!("data" in response.body), JSON.stringify(response.body));
  const error = response.body.error as Record<string, unknown>;
  assert.equal(error.code, expectedCode, JSON.stringify(response.body));
  assert.equal(typeof error.message, "string", JSON.stringify(response.body));
  assert(!("stack" in response.body), JSON.stringify(response.body));
  assert(!("statusCode" in response.body), JSON.stringify(response.body));
}

async function register(
  request: Awaited<ReturnType<typeof createContractHarness>>["request"],
  input: { name?: string; email?: string; password?: string } = {}
): Promise<{ userId: string; token: string; email: string; password: string }> {
  const name = input.name ?? "Alpha";
  const email = input.email ?? "alpha-contract@example.com";
  const password = input.password ?? "correct-password";
  const response = await request("POST", "/auth/register", {
    body: { name, email, password }
  });
  const data = assertSuccessEnvelope(response, 201);
  const user = data.user as Record<string, unknown>;
  const tokens = data.tokens as Record<string, unknown>;

  return { userId: user.id as string, token: tokens.accessToken as string, email, password };
}

function createJwt(payload: Record<string, unknown>, secret = AUTH_SECRET): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }), "utf8").toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${encodedPayload}`).digest("base64url");

  return `${header}.${encodedPayload}.${signature}`;
}

async function run(): Promise<void> {
  const { app, services, prisma, request } = await createContractHarness();

  try {
    const health = await request("GET", "/health");
    assertSuccessEnvelope(health, 200);

    const alpha = await register(request);
    services.grant(alpha.userId, "family-alpha");
    prisma.createFamily("family-alpha", [{ userId: alpha.userId, role: "OWNER", displayName: "Alpha" }]);

    const profile = assertSuccessEnvelope(await request("GET", "/me", { token: alpha.token }), 200);
    assert.equal(profile.id, alpha.userId);
    assert.equal(profile.name, "Alpha");
    assert.equal(profile.email, "alpha-contract@example.com");
    assert.equal(profile.phone, null);
    assert.equal(profile.birthDate, null);

    assertErrorEnvelope(await request("GET", "/me"), 401, API_ERROR_CODES.AUTH_REQUIRES_AUTH);

    const beta = await request("POST", "/auth/register", {
      body: { name: "Beta", email: "beta-contract@example.com", password: "correct-password" }
    });
    assertSuccessEnvelope(beta, 201);

    const updatedProfile = assertSuccessEnvelope(await request("PATCH", "/me", {
      token: alpha.token,
      body: { name: "Alpha Oppdatert", email: "alpha-new@example.com", phone: "+47 123 45 678", birthDate: "1985-01-05" }
    }), 200);
    assert.equal(updatedProfile.name, "Alpha Oppdatert");
    assert.equal(updatedProfile.email, "alpha-new@example.com");
    assert.equal(updatedProfile.phone, "+47 123 45 678");
    assert.equal(updatedProfile.birthDate, "1985-01-05");
    assertErrorEnvelope(await request("PATCH", "/me", { token: alpha.token, body: { birthDate: "1985-02-30" } }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assertErrorEnvelope(await request("PATCH", "/me", { token: alpha.token, body: { birthDate: "2999-01-01" } }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assertSuccessEnvelope(await request("POST", "/auth/login", {
      body: { email: "alpha-new@example.com", password: "correct-password" }
    }), 201);
    assertErrorEnvelope(await request("POST", "/auth/login", {
      body: { email: "alpha-contract@example.com", password: "correct-password" }
    }), 401, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS);

    assertErrorEnvelope(await request("PATCH", "/me", { token: alpha.token, body: { email: "not-an-email" } }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assertErrorEnvelope(await request("PATCH", "/me", { token: alpha.token, body: { email: "beta-contract@example.com" } }), 409, API_ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS);
    const displayNameProfile = assertSuccessEnvelope(await request("PATCH", "/me", { token: alpha.token, body: { firstName: "Alpha", middleName: "Beta", lastName: "Kontrakt" } }), 200);
    assert.equal(displayNameProfile.name, "Alpha Beta Kontrakt");
    assert.equal(displayNameProfile.displayName, "Alpha Beta Kontrakt");
    assert.equal(displayNameProfile.firstName, "Alpha");
    assert.equal(displayNameProfile.middleName, "Beta");
    assert.equal(displayNameProfile.lastName, "Kontrakt");


    assertErrorEnvelope(await request("POST", "/me/change-password"), 401, API_ERROR_CODES.AUTH_REQUIRES_AUTH);
    assertErrorEnvelope(await request("POST", "/me/change-password", {
      token: alpha.token,
      body: { newPassword: "new-password", confirmPassword: "new-password" }
    }), 400, API_ERROR_CODES.VALIDATION_MISSING_FIELD);
    assertErrorEnvelope(await request("POST", "/me/change-password", {
      token: alpha.token,
      body: { currentPassword: "correct-password", confirmPassword: "new-password" }
    }), 400, API_ERROR_CODES.VALIDATION_MISSING_FIELD);
    assertErrorEnvelope(await request("POST", "/me/change-password", {
      token: alpha.token,
      body: { currentPassword: "correct-password", newPassword: "new-password" }
    }), 400, API_ERROR_CODES.VALIDATION_MISSING_FIELD);
    assertErrorEnvelope(await request("POST", "/me/change-password", {
      token: alpha.token,
      body: { currentPassword: "wrong-password", newPassword: "new-password", confirmPassword: "new-password" }
    }), 401, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    assertErrorEnvelope(await request("POST", "/me/change-password", {
      token: alpha.token,
      body: { currentPassword: "correct-password", newPassword: "new-password", confirmPassword: "other-password" }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assertErrorEnvelope(await request("POST", "/me/change-password", {
      token: alpha.token,
      body: { currentPassword: "correct-password", newPassword: "short", confirmPassword: "short" }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assertErrorEnvelope(await request("POST", "/me/change-password", {
      token: alpha.token,
      body: { currentPassword: "correct-password", newPassword: "correct-password", confirmPassword: "correct-password" }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assertErrorEnvelope(await request("POST", "/me/change-password", {
      token: alpha.token,
      body: { currentPassword: "correct-password", newPassword: "new-password", confirmPassword: "new-password", unexpected: true }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);

    const changedPassword = assertSuccessEnvelope(await request("POST", "/me/change-password", {
      token: alpha.token,
      body: { currentPassword: "correct-password", newPassword: "new-password", confirmPassword: "new-password" }
    }), 201);
    assert.equal(changedPassword.message, "Passordet ble oppdatert");
    assertErrorEnvelope(await request("POST", "/auth/login", {
      body: { email: "alpha-new@example.com", password: "correct-password" }
    }), 401, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    assertSuccessEnvelope(await request("POST", "/auth/login", {
      body: { email: "alpha-new@example.com", password: "new-password" }
    }), 201);

    assertErrorEnvelope(await request("DELETE", "/me"), 401, API_ERROR_CODES.AUTH_REQUIRES_AUTH);
    assertErrorEnvelope(await request("DELETE", "/me", {
      token: alpha.token,
      body: { confirmationText: "SLETT" }
    }), 400, API_ERROR_CODES.VALIDATION_MISSING_FIELD);
    assertErrorEnvelope(await request("DELETE", "/me", {
      token: alpha.token,
      body: { password: "wrong-password", confirmationText: "SLETT" }
    }), 401, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    assertErrorEnvelope(await request("DELETE", "/me", {
      token: alpha.token,
      body: { password: "new-password", confirmationText: "slett" }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assertErrorEnvelope(await request("DELETE", "/me", {
      token: alpha.token,
      body: { password: "new-password", confirmationText: "SLETT", keepData: true }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);

    assertErrorEnvelope(await request("POST", "/feedback", {
      body: { type: "feedback", message: "Hei fra test" }
    }), 401, API_ERROR_CODES.AUTH_REQUIRES_AUTH);

    const acceptedFeedback = assertSuccessEnvelope(await request("POST", "/feedback", {
      token: alpha.token,
      body: { type: "feedback", message: "  Veldig fin app  ", appVersion: "0.1.0" }
    }), 201);
    assert.equal(acceptedFeedback.type, "feedback");
    assert.equal(acceptedFeedback.message, "Veldig fin app");
    assert.equal(acceptedFeedback.userId, alpha.userId);
    assert.equal(acceptedFeedback.familyId, "family-alpha");
    assert.equal(acceptedFeedback.appVersion, "0.1.0");
    assert.equal(prisma.feedbackFor(alpha.userId).at(-1)?.userId, alpha.userId);
    assert.equal(prisma.feedbackFor(alpha.userId).at(-1)?.familyId, "family-alpha");

    const acceptedBug = assertSuccessEnvelope(await request("POST", "/feedback", {
      token: alpha.token,
      familyId: "family-alpha",
      body: { type: "bug", message: "Buggen skjer ved lagring" }
    }), 201);
    assert.equal(acceptedBug.type, "bug");
    assert.equal(acceptedBug.familyId, "family-alpha");

    assertErrorEnvelope(await request("POST", "/feedback", {
      token: alpha.token,
      body: { type: "question", message: "Dette er ukjent" }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assertErrorEnvelope(await request("POST", "/feedback", {
      token: alpha.token,
      body: { type: "feedback", message: "   " }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assertErrorEnvelope(await request("POST", "/feedback", {
      token: alpha.token,
      body: { type: "feedback", message: "abcd" }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assertErrorEnvelope(await request("POST", "/feedback", {
      token: alpha.token,
      body: { type: "feedback", message: "x".repeat(2001) }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assertErrorEnvelope(await request("POST", "/feedback", {
      token: alpha.token,
      body: { type: "feedback", message: "Denne har et ukjent felt", unexpected: true }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);

    const limited = await register(request, { name: "Limited", email: "limited-feedback@example.com", password: "limited-password" });
    for (let index = 0; index < 5; index += 1) {
      assertSuccessEnvelope(await request("POST", "/feedback", {
        token: limited.token,
        body: { type: "feedback", message: `Melding nummer ${index}` }
      }), 201);
    }
    const rateLimited = await request("POST", "/feedback", {
      token: limited.token,
      body: { type: "feedback", message: "En melding for mye" }
    });
    assertErrorEnvelope(rateLimited, 429, API_ERROR_CODES.RATE_LIMITED);
    assert.equal((rateLimited.body.error as Record<string, unknown>).message, "Du har sendt flere meldinger på kort tid. Prøv igjen litt senere.");

    const memberUser = await register(request, { name: "Member", email: "member-delete@example.com", password: "member-password" });
    const memberAdmin = await register(request, { name: "Member Admin", email: "member-admin@example.com", password: "member-admin-password" });
    prisma.createFamily("family-member-delete", [
      { userId: memberAdmin.userId, role: "OWNER" },
      { userId: memberUser.userId, role: "CHILD" }
    ]);
    prisma.createPendingInvites(memberUser.userId, "family-member-delete");
    assertSuccessEnvelope(await request("DELETE", "/me", {
      token: memberUser.token,
      body: { password: memberUser.password, confirmationText: "SLETT" }
    }), 200);
    assert.equal(prisma.hasUser(memberUser.userId), false);
    assert.equal(prisma.memberCount("family-member-delete"), 1);
    assert.equal(prisma.pendingInvitesBy(memberUser.userId), 0);

    const coAdmin = await register(request, { name: "Co Admin", email: "co-admin-delete@example.com", password: "co-admin-password" });
    const otherAdmin = await register(request, { name: "Other Admin", email: "other-admin-delete@example.com", password: "other-admin-password" });
    prisma.createFamily("family-admin-delete", [
      { userId: coAdmin.userId, role: "OWNER" },
      { userId: otherAdmin.userId, role: "PARENT" }
    ]);
    assertSuccessEnvelope(await request("DELETE", "/me", {
      token: coAdmin.token,
      body: { password: coAdmin.password, confirmationText: "SLETT" }
    }), 200);
    assert.equal(prisma.hasUser(coAdmin.userId), false);
    assert.equal(prisma.hasFamily("family-admin-delete"), true);
    assert.equal(prisma.memberCount("family-admin-delete"), 1);

    const lastAdmin = await register(request, { name: "Last Admin", email: "last-admin-delete@example.com", password: "last-admin-password" });
    const child = await register(request, { name: "Child", email: "child-delete@example.com", password: "child-password" });
    prisma.createFamily("family-last-admin", [
      { userId: lastAdmin.userId, role: "OWNER" },
      { userId: child.userId, role: "CHILD" }
    ]);
    assertErrorEnvelope(await request("DELETE", "/me", {
      token: lastAdmin.token,
      body: { password: lastAdmin.password, confirmationText: "SLETT" }
    }), 400, API_ERROR_CODES.VALIDATION_INVALID_INPUT);
    assert.equal(prisma.hasUser(lastAdmin.userId), true);
    assert.equal(prisma.memberCount("family-last-admin"), 2);

    const solo = await register(request, { name: "Solo", email: "solo-delete@example.com", password: "solo-password" });
    prisma.createFamily("family-solo-delete", [{ userId: solo.userId, role: "OWNER" }]);
    assertSuccessEnvelope(await request("DELETE", "/me", {
      token: solo.token,
      body: { password: solo.password, confirmationText: "SLETT" }
    }), 200);
    assert.equal(prisma.hasUser(solo.userId), false);
    assert.equal(prisma.hasFamily("family-solo-delete"), false);
    assertErrorEnvelope(await request("POST", "/auth/login", {
      body: { email: solo.email, password: solo.password }
    }), 401, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    assertErrorEnvelope(await request("GET", "/me", { token: solo.token }), 401, API_ERROR_CODES.AUTH_INVALID_TOKEN);

    assertSuccessEnvelope(await request("GET", "/shopping", { token: alpha.token, familyId: "family-alpha" }), 200);
    assertErrorEnvelope(await request("GET", "/shopping"), 401, API_ERROR_CODES.AUTH_REQUIRES_AUTH);
    assertErrorEnvelope(await request("GET", "/shopping", { token: "not-a-jwt", familyId: "family-alpha" }), 401, API_ERROR_CODES.AUTH_INVALID_TOKEN);
    assertErrorEnvelope(await request("GET", "/shopping", {
      token: createJwt({ sub: alpha.userId, userId: alpha.userId, email: "alpha-contract@example.com", sessionId: "expired-session", iat: 1, exp: 2 }),
      familyId: "family-alpha"
    }), 401, API_ERROR_CODES.AUTH_EXPIRED_TOKEN);
    assertErrorEnvelope(await request("GET", "/shopping", { token: alpha.token }), 400, API_ERROR_CODES.FAMILY_MISSING_CONTEXT);
    assertErrorEnvelope(await request("GET", "/shopping", { token: alpha.token, familyId: "family-beta" }), 404, API_ERROR_CODES.FAMILY_NOT_FOUND);
    assertErrorEnvelope(await request("POST", "/auth/login", {
      body: { email: "alpha-contract@example.com", password: "wrong-password" }
    }), 401, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    assertErrorEnvelope(await request("GET", "/wishlist/invites/invalid-share-token"), 404, API_ERROR_CODES.WISHLIST_INVALID_SHARE_TOKEN);
  } finally {
    await app.close();
  }

  console.log("api contract tests passed");
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
