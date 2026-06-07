import "reflect-metadata";
import { strict as assert } from "node:assert";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthController } from "../src/auth/auth.controller";
import { AuthService } from "../src/auth/auth.service";
import { AuthGuard } from "../src/auth/guards/auth.guard";
import { ProfileService } from "../src/auth/profile.service";

const AUTH_SECRET = "familieappen-test-auth-secret-for-session-tests";
const PASSWORD = "correct-password";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type SessionRecord = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  revokedAt?: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

class TestConfigService {
  readonly authJwtSecret = AUTH_SECRET;
}

class InMemoryPrismaService {
  readonly users = new Map<string, UserRecord>();
  readonly sessions = new Map<string, SessionRecord>();
  private nextUserId = 1;
  private nextSessionId = 1;

  readonly client = this.createClient();

  private createClient() {
    const tx: Record<string, any> = {
      user: {
        findUnique: async ({ where }: { where: { email?: string; id?: string } }): Promise<UserRecord | null> => {
          if (where.email) {
            return [...this.users.values()].find((user) => user.email === where.email) ?? null;
          }

          return this.users.get(where.id ?? "") ?? null;
        },
        create: async ({ data }: { data: { name: string; email: string; passwordHash: string } }): Promise<UserRecord> => {
          if ([...this.users.values()].some((user) => user.email === data.email)) {
            const error = new Error("Unique constraint failed") as Error & { code: string };
            error.code = "P2002";
            throw error;
          }

          const now = new Date();
          const user: UserRecord = {
            id: `user-${this.nextUserId++}`,
            name: data.name,
            email: data.email,
            phone: null,
            passwordHash: data.passwordHash,
            createdAt: now,
            updatedAt: now
          };

          this.users.set(user.id, user);
          return user;
        },
        delete: async ({ where }: { where: { id: string } }): Promise<UserRecord> => {
          const user = this.users.get(where.id);
          if (!user) throw new Error("Record not found");
          this.users.delete(where.id);
          return user;
        },
        update: async ({ where, data }: { where: { id: string }; data: Partial<UserRecord> }): Promise<UserRecord> => {
          const user = this.users.get(where.id);
          if (!user) throw new Error("Record not found");
          Object.assign(user, data, { updatedAt: new Date() });
          return user;
        }
      },
      userSession: {
        create: async ({ data }: { data: { userId: string; refreshTokenHash: string; userAgent?: string | null; ipAddress?: string | null; expiresAt: Date } }): Promise<SessionRecord> => {
          const now = new Date();
          const session: SessionRecord = {
            id: `session-${this.nextSessionId++}`,
            userId: data.userId,
            refreshTokenHash: data.refreshTokenHash,
            userAgent: data.userAgent ?? null,
            ipAddress: data.ipAddress ?? null,
            revokedAt: null,
            expiresAt: data.expiresAt,
            createdAt: now,
            updatedAt: now
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
            return { ...session, user: this.users.get(session.userId) };
          }

          if (select) {
            return Object.fromEntries(Object.keys(select).map((key) => [key, session[key as keyof SessionRecord]]));
          }

          return session;
        },
        updateMany: async ({ where, data }: { where: { id?: string; userId?: string; revokedAt?: null }; data: { revokedAt: Date } }): Promise<{ count: number }> => {
          let count = 0;
          this.sessions.forEach((session) => {
            const matchesId = !where.id || session.id === where.id;
            const matchesUser = !where.userId || session.userId === where.userId;
            const matchesRevoked = where.revokedAt === undefined || session.revokedAt === where.revokedAt;

            if (matchesId && matchesUser && matchesRevoked) {
              session.revokedAt = data.revokedAt;
              session.updatedAt = new Date();
              count += 1;
            }
          });
          return { count };
        }
      },
      familyMember: {
        findMany: async () => [],
        count: async () => 0,
        delete: async () => ({})
      },
      family: {
        delete: async () => ({})
      },
      familyInvitation: {
        updateMany: async () => ({ count: 0 })
      },
      wishlistShareInvitation: {
        updateMany: async () => ({ count: 0 })
      },
      $transaction: async <T>(callback: (transactionClient: typeof tx) => Promise<T>): Promise<T> => callback(tx)
    };

    return tx;
  }
}

function createServices() {
  const prisma = new InMemoryPrismaService();
  const authService = new AuthService(prisma as never, new TestConfigService() as never);
  const authController = new AuthController(authService);
  const authGuard = new AuthGuard(authService, prisma as never);
  const profileService = new ProfileService(prisma as never, authService);

  return { prisma, authService, authController, authGuard, profileService };
}

function createExecutionContext(authorization?: string): { context: ExecutionContext; request: { headers: { authorization?: string }; user?: { id: string; email: string; sessionId: string } } } {
  const request = { headers: { authorization } };

  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request })
    } as ExecutionContext
  };
}

async function assertRejectsUnauthorized(action: () => Promise<unknown> | unknown): Promise<void> {
  await assert.rejects(async () => action(), (error: unknown) => error instanceof UnauthorizedException);
}

async function registerUser(authService: AuthService, email: string) {
  return authService.register({ name: "Session User", email, password: PASSWORD }, { userAgent: "test-agent", ipAddress: "127.0.0.1" });
}

async function main() {
  {
    const { prisma, authService } = createServices();
    const auth = await registerUser(authService, "register@example.com");

    assert.equal(prisma.sessions.size, 1, "register creates one session");
    assert.ok(auth.tokens.accessToken, "register returns an access token");
    assert.ok(auth.tokens.refreshToken, "register returns a refresh token");
    assert.notEqual([...prisma.sessions.values()][0].refreshTokenHash, auth.tokens.refreshToken, "refresh token is not stored as plaintext");
  }

  {
    const { prisma, authService } = createServices();
    await registerUser(authService, "login@example.com");
    const auth = await authService.login({ email: "login@example.com", password: PASSWORD });

    assert.equal(prisma.sessions.size, 2, "login creates a new session");
    assert.ok(auth.tokens.refreshToken, "login returns a refresh token");
  }

  {
    const { authService } = createServices();
    const auth = await registerUser(authService, "refresh@example.com");
    const refreshed = await authService.refresh({ refreshToken: auth.tokens.refreshToken });

    assert.ok(refreshed.tokens.accessToken, "refresh returns a new access token");
    assert.equal(refreshed.tokens.refreshToken, auth.tokens.refreshToken, "refresh keeps the active refresh token when rotation is not enabled");
  }

  {
    const { authService } = createServices();
    const auth = await registerUser(authService, "revoked-refresh@example.com");

    await authService.logout(auth.tokens.accessToken);
    await assertRejectsUnauthorized(() => authService.refresh({ refreshToken: auth.tokens.refreshToken }));
  }

  {
    const { prisma, authService } = createServices();
    const auth = await registerUser(authService, "logout@example.com");
    await authService.logout(auth.tokens.accessToken);

    assert.ok([...prisma.sessions.values()][0].revokedAt, "logout revokes current session");
    await authService.logout(auth.tokens.accessToken);
    assert.ok([...prisma.sessions.values()][0].revokedAt, "repeated logout remains safe");
  }

  {
    const { authGuard, authService } = createServices();
    const auth = await registerUser(authService, "guard@example.com");
    const { context } = createExecutionContext(`Bearer ${auth.tokens.accessToken}`);

    assert.equal(await authGuard.canActivate(context), true, "active session token is accepted");
    await authService.logout(auth.tokens.accessToken);
    await assertRejectsUnauthorized(() => authGuard.canActivate(context));
  }

  {
    const { prisma, authService, profileService } = createServices();
    const auth = await registerUser(authService, "delete@example.com");
    await authService.login({ email: "delete@example.com", password: PASSWORD });

    await profileService.deleteCurrentUserAccount(auth.user.id, { password: PASSWORD, confirmationText: "SLETT" });
    assert.equal([...prisma.sessions.values()].filter((session) => !session.revokedAt).length, 0, "delete account revokes all sessions");
  }

  {
    const { authController } = createServices();
    await assertRejectsUnauthorized(() => authController.logout(undefined));
  }
}

main()
  .then(() => {
    console.log("auth session lifecycle tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
