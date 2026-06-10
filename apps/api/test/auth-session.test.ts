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
  readonly nodeEnv = "test";
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
        updateMany: async ({ where, data }: { where: { id?: string; userId?: string; refreshTokenHash?: string; revokedAt?: null }; data: { revokedAt?: Date; refreshTokenHash?: string } }): Promise<{ count: number }> => {
          let count = 0;
          this.sessions.forEach((session) => {
            const matchesId = !where.id || session.id === where.id;
            const matchesUser = !where.userId || session.userId === where.userId;
            const matchesRefreshTokenHash = !where.refreshTokenHash || session.refreshTokenHash === where.refreshTokenHash;
            const matchesRevoked = where.revokedAt === undefined || session.revokedAt === where.revokedAt;

            if (matchesId && matchesUser && matchesRefreshTokenHash && matchesRevoked) {
              if (data.revokedAt !== undefined) {
                session.revokedAt = data.revokedAt;
              }
              if (data.refreshTokenHash !== undefined) {
                session.refreshTokenHash = data.refreshTokenHash;
              }
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
        updateMany: async () => ({ count: 0 }),
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
  const authController = new AuthController(authService, new TestConfigService() as never);
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

function createCookieResponse(): CookieResponseRecorder {
  const headers = new Map<string, number | string | string[]>();

  return {
    headers,
    getHeader: (name: string) => headers.get(name),
    setHeader: (name: string, value: number | string | string[]) => {
      headers.set(name, value);
    }
  };
}

type CookieResponseRecorder = {
  headers: Map<string, number | string | string[]>;
  getHeader: (name: string) => number | string | string[] | undefined;
  setHeader: (name: string, value: number | string | string[]) => void;
};

function getSetCookie(response: CookieResponseRecorder): string {
  const header = response.headers.get("Set-Cookie");
  const cookie = Array.isArray(header) ? header[0] : header;

  assert.equal(typeof cookie, "string", "response includes Set-Cookie header");
  return cookie as string;
}

function getRefreshCookieToken(response: CookieResponseRecorder): string {
  const cookie = getSetCookie(response);
  const match = cookie.match(/^familieappen_refresh_token=([^;]+)/);

  assert.ok(match?.[1], "Set-Cookie contains refresh token cookie");
  assert.match(cookie, /HttpOnly/, "refresh cookie is HttpOnly");
  assert.match(cookie, /SameSite=Lax/, "refresh cookie uses lax sameSite");
  assert.match(cookie, /Path=\//, "refresh cookie is scoped to app path");
  assert.doesNotMatch(cookie, /Secure/, "refresh cookie is not secure in local test environment");

  return decodeURIComponent(match[1]);
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
    assert.ok(auth.refreshToken, "register creates a refresh token for the HttpOnly cookie");
    assert.equal("refreshToken" in auth.tokens, false, "register does not expose refresh token in JSON tokens");
    assert.notEqual([...prisma.sessions.values()][0].refreshTokenHash, auth.refreshToken, "refresh token is not stored as plaintext");
  }

  {
    const { authController } = createServices();
    const response = createCookieResponse();
    const auth = await authController.register({ name: "Cookie User", email: "register-cookie@example.com", password: PASSWORD }, { headers: {} }, response);

    assert.ok(auth.data.tokens.accessToken, "controller register returns access token");
    assert.equal("refreshToken" in auth.data.tokens, false, "controller register JSON does not include refresh token");
    assert.ok(getRefreshCookieToken(response), "controller register sets refresh cookie");
  }

  {
    const { prisma, authService } = createServices();
    await registerUser(authService, "login@example.com");
    const auth = await authService.login({ email: "login@example.com", password: PASSWORD });

    assert.equal(prisma.sessions.size, 2, "login creates a new session");
    assert.ok(auth.refreshToken, "login creates a refresh token for the HttpOnly cookie");
    assert.equal("refreshToken" in auth.tokens, false, "login does not expose refresh token in JSON tokens");
  }

  {
    const { authController, authService } = createServices();
    await registerUser(authService, "login-cookie@example.com");
    const response = createCookieResponse();
    const auth = await authController.login({ email: "login-cookie@example.com", password: PASSWORD }, { headers: {} }, response);

    assert.ok(auth.data.tokens.accessToken, "controller login returns access token");
    assert.equal("refreshToken" in auth.data.tokens, false, "controller login JSON does not include refresh token");
    assert.ok(getRefreshCookieToken(response), "controller login sets refresh cookie");
  }

  {
    const { prisma, authService } = createServices();
    const auth = await registerUser(authService, "refresh@example.com");
    const originalSessionId = [...prisma.sessions.values()][0].id;
    const originalHash = [...prisma.sessions.values()][0].refreshTokenHash;
    const refreshed = await authService.refresh(auth.refreshToken);

    assert.ok(refreshed.tokens.accessToken, "refresh returns a new access token");
    assert.ok(refreshed.refreshToken, "refresh rotates a new refresh token for the HttpOnly cookie");
    assert.notEqual(refreshed.refreshToken, auth.refreshToken, "refresh token changes on refresh");
    assert.equal([...prisma.sessions.values()][0].id, originalSessionId, "refresh keeps the same session id");
    assert.notEqual([...prisma.sessions.values()][0].refreshTokenHash, originalHash, "refresh stores the rotated token hash");
    assert.equal("refreshToken" in refreshed.tokens, false, "refresh does not expose refresh token in JSON tokens");
    await assertRejectsUnauthorized(() => authService.refresh(auth.refreshToken));
    assert.ok((await authService.refresh(refreshed.refreshToken)).tokens.accessToken, "rotated refresh token is accepted");
  }

  {
    const { authController } = createServices();
    const registerResponse = createCookieResponse();
    const registered = await authController.register({ name: "Cookie Refresh", email: "refresh-cookie@example.com", password: PASSWORD }, { headers: {} }, registerResponse);
    const firstRefreshToken = getRefreshCookieToken(registerResponse);
    const refreshResponse = createCookieResponse();
    const refreshed = await authController.refresh({ headers: { cookie: `familieappen_refresh_token=${encodeURIComponent(firstRefreshToken)}` } }, refreshResponse);
    const secondRefreshToken = getRefreshCookieToken(refreshResponse);

    assert.ok(refreshed.data.tokens.accessToken, "controller refresh returns access token");
    assert.equal("refreshToken" in refreshed.data.tokens, false, "controller refresh JSON does not include refresh token");
    assert.notEqual(secondRefreshToken, firstRefreshToken, "controller refresh rotates refresh cookie");
    await assertRejectsUnauthorized(() => authController.refresh({ headers: { cookie: `familieappen_refresh_token=${encodeURIComponent(firstRefreshToken)}` } }, createCookieResponse()));

    const logoutResponse = createCookieResponse();
    await authController.logout(`Bearer ${registered.data.tokens.accessToken}`, logoutResponse);
    assert.match(getSetCookie(logoutResponse), /Max-Age=0/, "logout clears refresh cookie");
    await assertRejectsUnauthorized(() => authController.refresh({ headers: { cookie: `familieappen_refresh_token=${encodeURIComponent(secondRefreshToken)}` } }, createCookieResponse()));
  }

  {
    const { authService } = createServices();
    const auth = await registerUser(authService, "revoked-refresh@example.com");

    await authService.logout(auth.tokens.accessToken);
    await assertRejectsUnauthorized(() => authService.refresh(auth.refreshToken));
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
    await assertRejectsUnauthorized(() => authController.logout(undefined, createCookieResponse()));
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
