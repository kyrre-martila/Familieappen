import "reflect-metadata";
import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { HttpStatus, INestApplication, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AuthController } from "../src/auth/auth.controller";
import { AuthService } from "../src/auth/auth.service";
import { AuthGuard } from "../src/auth/guards/auth.guard";
import { CalendarController } from "../src/calendar/calendar.controller";
import { CalendarService } from "../src/calendar/calendar.service";
import { API_ERROR_CODES, ApiException, HttpExceptionFilter } from "../src/common";
import { ConfigService } from "../src/config";
import { FamiliesController } from "../src/families/families.controller";
import { FamiliesService } from "../src/families/families.service";
import { ShoppingController } from "../src/shopping/shopping.controller";
import { ShoppingService } from "../src/shopping/shopping.service";
import { TasksController } from "../src/tasks/tasks.controller";
import { TasksService } from "../src/tasks/tasks.service";
import { PrismaService } from "../src/prisma";
import { PublicWishlistsController, WishlistsController } from "../src/wishlists/wishlists.controller";
import { WishlistsService } from "../src/wishlists/wishlists.service";

type UserRecord = {
  id: string;
  name: string;
  email: string;
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

type HttpBody = Record<string, unknown> | undefined;

type HttpResponse<T = Record<string, unknown>> = {
  status: number;
  body: T;
};

const AUTH_SECRET = "familieappen-test-auth-secret-for-security-harness";
const NOW = new Date("2026-05-30T00:00:00.000Z");

class TestConfigService {
  readonly authJwtSecret = AUTH_SECRET;
}

class InMemoryPrismaService {
  private users = new Map<string, UserRecord>();
  private sessions = new Map<string, SessionRecord>();
  private nextUserId = 1;
  private nextSessionId = 1;

  readonly client = {
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }): Promise<UserRecord | null> => {
        if (where.email) {
          return this.users.get(where.email) ?? null;
        }

        return [...this.users.values()].find((user) => user.id === where.id) ?? null;
      },
      create: async ({ data }: { data: { name: string; email: string; passwordHash: string } }): Promise<UserRecord> => {
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
          createdAt: NOW,
          updatedAt: NOW
        };

        this.users.set(user.email, user);
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
      updateMany: async ({ where, data }: { where: { id?: string; userId?: string; revokedAt?: null }; data: { revokedAt: Date } }): Promise<{ count: number }> => {
        let count = 0;
        this.sessions.forEach((session) => {
          const matchesId = !where.id || session.id === where.id;
          const matchesUser = !where.userId || session.userId === where.userId;
          const matchesRevoked = where.revokedAt === undefined || session.revokedAt === where.revokedAt;

          if (matchesId && matchesUser && matchesRevoked) {
            session.revokedAt = data.revokedAt;
            session.updatedAt = NOW;
            count += 1;
          }
        });
        return { count };
      }
    }
  };
}

class IsolationFixtures {
  readonly familiesByUser = new Map<string, Set<string>>();
  readonly shoppingItems = new Map([
    ["shopping-alpha-item", { familyId: "family-alpha", name: "Alpha milk" }],
    ["shopping-beta-item", { familyId: "family-beta", name: "Beta bread" }]
  ]);
  readonly wishlistItems = new Map([
    ["wishlist-alpha-item", { familyId: "family-alpha", wishlistId: "wishlist-alpha", title: "Alpha toy" }],
    ["wishlist-beta-item", { familyId: "family-beta", wishlistId: "wishlist-beta", title: "Beta game" }]
  ]);
  readonly calendarEvents = new Map([
    ["calendar-alpha-event", { familyId: "family-alpha", title: "Alpha dinner" }],
    ["calendar-beta-event", { familyId: "family-beta", title: "Beta soccer" }]
  ]);
  readonly wishlistShares = new Map([
    ["share-alpha-token", { wishlistId: "wishlist-alpha", familyId: "family-alpha" }],
    ["share-beta-token", { wishlistId: "wishlist-beta", familyId: "family-beta" }]
  ]);

  grant(userId: string, familyId: string): void {
    const familyIds = this.familiesByUser.get(userId) ?? new Set<string>();
    familyIds.add(familyId);
    this.familiesByUser.set(userId, familyIds);
  }

  requireMembership(userId: string, familyId: string | undefined): void {
    if (!familyId) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        API_ERROR_CODES.FAMILY_MISSING_CONTEXT,
        "X-Family-Id header is required"
      );
    }

    if (!this.familiesByUser.get(userId)?.has(familyId)) {
      throw new NotFoundException("Family was not found");
    }
  }

  requireOwnedItem<T extends { familyId: string }>(items: Map<string, T>, userId: string, familyId: string | undefined, itemId: string): T {
    this.requireMembership(userId, familyId);
    const item = items.get(itemId);

    if (!item || item.familyId !== familyId) {
      throw new NotFoundException("Item was not found");
    }

    return item;
  }

  requireWishlist(userId: string, familyId: string | undefined, wishlistId: string): void {
    this.requireMembership(userId, familyId);

    if (![...this.wishlistItems.values()].some((item) => item.familyId === familyId && item.wishlistId === wishlistId)) {
      throw new NotFoundException("Wishlist was not found");
    }
  }
}

function createIsolationServices(fixtures: IsolationFixtures) {
  return {
    familiesService: {
      getFamilyDashboard: async (userId: string, familyId: string) => {
        fixtures.requireMembership(userId, familyId);
        return { family: { id: familyId, name: `${familyId} dashboard` }, members: [], shopping: { totalItems: 0 } };
      }
    },
    shoppingService: {
      getShoppingList: async (userId: string, familyId: string) => {
        fixtures.requireMembership(userId, familyId);
        return { id: `${familyId}-shopping-list`, familyId, items: [] };
      },
      toggleItem: async (userId: string, familyId: string, itemId: string) => {
        const item = fixtures.requireOwnedItem(fixtures.shoppingItems, userId, familyId, itemId);
        return { id: itemId, name: item.name, completed: true };
      },
      deleteItem: async (userId: string, familyId: string, itemId: string) => {
        const item = fixtures.requireOwnedItem(fixtures.shoppingItems, userId, familyId, itemId);
        return { id: itemId, name: item.name, completed: false };
      }
    },
    tasksService: {
      listTasks: async (userId: string, familyId: string) => {
        fixtures.requireMembership(userId, familyId);
        return [{ id: `${familyId}-task`, title: "Task", completed: false }];
      }
    },
    wishlistsService: {
      listWishlists: async (userId: string, familyId: string) => {
        fixtures.requireMembership(userId, familyId);
        return [{ id: `${familyId}-wishlist`, title: "Wishlist", itemCount: 1 }];
      },
      getWishlist: async (userId: string, familyId: string, wishlistId: string) => {
        fixtures.requireWishlist(userId, familyId, wishlistId);
        return { id: wishlistId, title: "Wishlist", items: [] };
      },
      updateItem: async (userId: string, familyId: string, itemId: string) => {
        const item = fixtures.requireOwnedItem(fixtures.wishlistItems, userId, familyId, itemId);
        return { id: itemId, title: item.title };
      },
      deleteItem: async (userId: string, familyId: string, itemId: string) => {
        const item = fixtures.requireOwnedItem(fixtures.wishlistItems, userId, familyId, itemId);
        return { id: itemId, title: item.title };
      },
      getPublicWishlist: async (token: string) => {
        const share = fixtures.wishlistShares.get(token);
        if (!share) {
          throw new NotFoundException("Shared wishlist was not found");
        }

        return { id: share.wishlistId, token, items: [] };
      },
      reservePublicItem: async (token: string, itemId: string) => requirePublicWishlistItem(fixtures, token, itemId),
      markPublicItemPurchased: async (token: string, itemId: string) => requirePublicWishlistItem(fixtures, token, itemId)
    },
    calendarService: {
      updateEvent: async (userId: string, familyId: string, eventId: string) => {
        const event = fixtures.requireOwnedItem(fixtures.calendarEvents, userId, familyId, eventId);
        return { id: eventId, title: event.title };
      },
      deleteEvent: async (userId: string, familyId: string, eventId: string) => {
        const event = fixtures.requireOwnedItem(fixtures.calendarEvents, userId, familyId, eventId);
        return { id: eventId, title: event.title };
      }
    }
  };
}

function requirePublicWishlistItem(fixtures: IsolationFixtures, token: string, itemId: string) {
  const share = fixtures.wishlistShares.get(token);
  const item = fixtures.wishlistItems.get(itemId);

  if (!share || !item || item.wishlistId !== share.wishlistId) {
    throw new NotFoundException("Shared wishlist item was not found");
  }

  return { id: itemId, title: item.title };
}

async function createSecurityHarness() {
  const fixtures = new IsolationFixtures();
  const services = createIsolationServices(fixtures);
  const prisma = new InMemoryPrismaService();
  const moduleRef = await Test.createTestingModule({
    controllers: [
      AuthController,
      FamiliesController,
      ShoppingController,
      TasksController,
      WishlistsController,
      PublicWishlistsController,
      CalendarController
    ],
    providers: [
      AuthService,
      AuthGuard,
      { provide: ConfigService, useClass: TestConfigService },
      { provide: PrismaService, useValue: prisma },
      { provide: FamiliesService, useValue: services.familiesService },
      { provide: ShoppingService, useValue: services.shoppingService },
      { provide: TasksService, useValue: services.tasksService },
      { provide: WishlistsService, useValue: services.wishlistsService },
      { provide: CalendarService, useValue: services.calendarService }
    ]
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0);
  const address = app.getHttpServer().address();
  assert.equal(typeof address, "object");
  assert(address);
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function request(method: string, path: string, options: { token?: string; familyId?: string; body?: HttpBody } = {}): Promise<HttpResponse> {
    const headers: Record<string, string> = {};

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

  return { app, fixtures, request };
}

function assertStatus(response: HttpResponse, expectedStatus: number, label: string): void {
  assert.equal(response.status, expectedStatus, `${label}: ${JSON.stringify(response.body)}`);
}

function assertErrorCode(response: HttpResponse, expectedStatus: number, expectedCode: string, label: string): void {
  assertStatus(response, expectedStatus, label);
  const error = response.body.error as Record<string, unknown> | undefined;
  assert(error && typeof error === "object", `${label}: ${JSON.stringify(response.body)}`);
  assert.equal(error.code, expectedCode, `${label}: ${JSON.stringify(response.body)}`);
  assert.equal(typeof error.message, "string", `${label}: ${JSON.stringify(response.body)}`);
  assert(!("data" in response.body), `${label}: ${JSON.stringify(response.body)}`);
}

function getData(body: Record<string, unknown>): Record<string, unknown> {
  assert(body.data && typeof body.data === "object");
  return body.data as Record<string, unknown>;
}

async function register(request: Awaited<ReturnType<typeof createSecurityHarness>>["request"], email: string) {
  const response = await request("POST", "/auth/register", {
    body: { name: email.split("@")[0], email, password: "correct-password" }
  });

  assertStatus(response, 201, `register ${email}`);
  const data = getData(response.body);
  const user = data.user as Record<string, unknown>;
  const tokens = data.tokens as Record<string, unknown>;
  assert.equal(typeof user.id, "string");
  assert.equal(typeof tokens.accessToken, "string");

  return { userId: user.id as string, token: tokens.accessToken as string };
}

function createJwt(payload: Record<string, unknown>, secret = AUTH_SECRET): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }), "utf8").toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${encodedPayload}`).digest("base64url");

  return `${header}.${encodedPayload}.${signature}`;
}

async function run(): Promise<void> {
  const { app, fixtures, request } = await createSecurityHarness();

  try {
    const alpha = await register(request, "alpha@example.com");
    const beta = await register(request, "beta@example.com");
    fixtures.grant(alpha.userId, "family-alpha");
    fixtures.grant(beta.userId, "family-beta");

    const duplicateRegister = await request("POST", "/auth/register", {
      body: { name: "Alpha Again", email: "alpha@example.com", password: "correct-password" }
    });
    assertStatus(duplicateRegister, 409, "duplicate email is rejected");

    const login = await request("POST", "/auth/login", {
      body: { email: "alpha@example.com", password: "correct-password" }
    });
    assertStatus(login, 201, "login succeeds");

    const invalidPassword = await request("POST", "/auth/login", {
      body: { email: "alpha@example.com", password: "incorrect-password" }
    });
    assertStatus(invalidPassword, 401, "invalid password is rejected");

    assertErrorCode(await request("GET", "/shopping", { familyId: "family-alpha" }), 401, API_ERROR_CODES.AUTH_REQUIRES_AUTH, "missing bearer token is rejected");
    assertErrorCode(await request("GET", "/shopping", { token: "not-a-jwt", familyId: "family-alpha" }), 401, API_ERROR_CODES.AUTH_INVALID_TOKEN, "malformed token is rejected");
    assertStatus(await request("GET", "/shopping", {
      token: createJwt({ sub: alpha.userId, email: "alpha@example.com", iat: 1, exp: 4_102_444_800 }, "wrong-secret"),
      familyId: "family-alpha"
    }), 401, "invalid signature is rejected");
    assertErrorCode(await request("GET", "/shopping", {
      token: createJwt({ sub: alpha.userId, email: "alpha@example.com", iat: 1, exp: 2 }),
      familyId: "family-alpha"
    }), 401, API_ERROR_CODES.AUTH_EXPIRED_TOKEN, "expired token is rejected");
    assertStatus(await request("GET", "/families/family-alpha/dashboard"), 401, "protected dashboard denies unauthenticated access");

    assertStatus(await request("GET", "/families/family-beta/dashboard", { token: alpha.token }), 404, "user cannot read another family's dashboard");
    assertStatus(await request("GET", "/shopping", { token: alpha.token, familyId: "family-beta" }), 404, "wrong X-Family-Id cannot read another family's shopping list");
    assertStatus(await request("PATCH", "/shopping/items/shopping-beta-item", { token: alpha.token, familyId: "family-alpha" }), 404, "foreign shopping item cannot be mutated with own family header");
    assertStatus(await request("PATCH", "/shopping/items/shopping-alpha-item", { token: beta.token, familyId: "family-beta" }), 404, "mixed user family and foreign shopping item is rejected");
    assertErrorCode(await request("GET", "/shopping", { token: alpha.token }), 400, API_ERROR_CODES.FAMILY_MISSING_CONTEXT, "missing family context is rejected");

    assertStatus(await request("GET", "/wishlists", { token: alpha.token, familyId: "family-beta" }), 404, "user cannot access another family's wishlist list");
    assertStatus(await request("GET", "/wishlists/wishlist-beta", { token: alpha.token, familyId: "family-alpha" }), 404, "foreign wishlist id cannot be read with own family header");
    assertStatus(await request("PATCH", "/wishlists/items/wishlist-beta-item", { token: alpha.token, familyId: "family-alpha", body: { title: "Nope" } }), 404, "foreign wishlist item cannot be mutated");
    assertStatus(await request("GET", "/tasks", { token: alpha.token, familyId: "family-beta" }), 404, "user cannot read another family's tasks");
    assertStatus(await request("PATCH", "/calendar/events/calendar-beta-event", { token: alpha.token, familyId: "family-alpha", body: { title: "Nope" } }), 404, "foreign calendar event cannot be mutated");

    assertStatus(await request("GET", "/public/wishlists/share-alpha-token"), 200, "valid public wishlist token returns shared wishlist");
    assertErrorCode(await request("GET", "/public/wishlists/invalid-share-token"), 404, API_ERROR_CODES.WISHLIST_INVALID_SHARE_TOKEN, "invalid public wishlist token is rejected");
    assertStatus(await request("POST", "/public/wishlists/share-alpha-token/items/wishlist-beta-item/reserve", { body: { reservedByName: "Guest" } }), 404, "public token cannot reserve another wishlist's item");
    assertStatus(await request("POST", "/public/wishlists/share-alpha-token/items/wishlist-alpha-item/reserve", { body: { reservedByName: "Guest" } }), 201, "public reserve works for matching shared item");
    assertStatus(await request("POST", "/public/wishlists/share-alpha-token/items/wishlist-beta-item/mark-purchased", { body: { reservedByName: "Guest" } }), 404, "public token cannot mark another wishlist's item purchased");
    assertStatus(await request("POST", "/public/wishlists/share-alpha-token/items/wishlist-alpha-item/mark-purchased", { body: { reservedByName: "Guest" } }), 201, "public mark-purchased works for matching shared item");
  } finally {
    await app.close();
  }

  console.log("security harness tests passed");
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
