import "reflect-metadata";
import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { HttpStatus, INestApplication, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AuthController } from "../src/auth/auth.controller";
import { AuthService } from "../src/auth/auth.service";
import { AuthGuard } from "../src/auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, HttpExceptionFilter } from "../src/common";
import { ConfigService } from "../src/config";
import { HealthController } from "../src/health/health.controller";
import { PrismaService } from "../src/prisma";
import { ShoppingController } from "../src/shopping/shopping.controller";
import { ShoppingService } from "../src/shopping/shopping.service";
import { PublicWishlistsController } from "../src/wishlists/wishlists.controller";
import { WishlistsService } from "../src/wishlists/wishlists.service";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type HttpResponse<T = Record<string, unknown>> = {
  status: number;
  body: T;
};

const AUTH_SECRET = "familieappen-test-auth-secret-for-contracts";
const NOW = new Date("2026-05-30T00:00:00.000Z");

class TestConfigService {
  readonly authJwtSecret = AUTH_SECRET;
}

class InMemoryPrismaService {
  private users = new Map<string, UserRecord>();
  private nextUserId = 1;
  readonly isConfigured = false;

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
    }
  };

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
      getPublicWishlist: async (token: string) => {
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
    controllers: [AuthController, HealthController, ShoppingController, PublicWishlistsController],
    providers: [
      AuthService,
      AuthGuard,
      { provide: ConfigService, useClass: TestConfigService },
      { provide: PrismaService, useValue: prisma },
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

  return { app, services, request };
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

async function register(request: Awaited<ReturnType<typeof createContractHarness>>["request"]): Promise<{ userId: string; token: string }> {
  const response = await request("POST", "/auth/register", {
    body: { name: "Alpha", email: "alpha-contract@example.com", password: "correct-password" }
  });
  const data = assertSuccessEnvelope(response, 201);
  const user = data.user as Record<string, unknown>;
  const tokens = data.tokens as Record<string, unknown>;

  return { userId: user.id as string, token: tokens.accessToken as string };
}

function createJwt(payload: Record<string, unknown>, secret = AUTH_SECRET): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }), "utf8").toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${encodedPayload}`).digest("base64url");

  return `${header}.${encodedPayload}.${signature}`;
}

async function run(): Promise<void> {
  const { app, services, request } = await createContractHarness();

  try {
    const health = await request("GET", "/health");
    assertSuccessEnvelope(health, 200);

    const alpha = await register(request);
    services.grant(alpha.userId, "family-alpha");

    assertSuccessEnvelope(await request("GET", "/shopping", { token: alpha.token, familyId: "family-alpha" }), 200);
    assertErrorEnvelope(await request("GET", "/shopping"), 401, API_ERROR_CODES.AUTH_REQUIRES_AUTH);
    assertErrorEnvelope(await request("GET", "/shopping", { token: "not-a-jwt", familyId: "family-alpha" }), 401, API_ERROR_CODES.AUTH_INVALID_TOKEN);
    assertErrorEnvelope(await request("GET", "/shopping", {
      token: createJwt({ sub: alpha.userId, email: "alpha-contract@example.com", iat: 1, exp: 2 }),
      familyId: "family-alpha"
    }), 401, API_ERROR_CODES.AUTH_EXPIRED_TOKEN);
    assertErrorEnvelope(await request("GET", "/shopping", { token: alpha.token }), 400, API_ERROR_CODES.FAMILY_MISSING_CONTEXT);
    assertErrorEnvelope(await request("GET", "/shopping", { token: alpha.token, familyId: "family-beta" }), 404, API_ERROR_CODES.FAMILY_NOT_FOUND);
    assertErrorEnvelope(await request("POST", "/auth/login", {
      body: { email: "alpha-contract@example.com", password: "wrong-password" }
    }), 401, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    assertErrorEnvelope(await request("GET", "/public/wishlists/invalid-share-token"), 404, API_ERROR_CODES.WISHLIST_INVALID_SHARE_TOKEN);
  } finally {
    await app.close();
  }

  console.log("api contract tests passed");
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
