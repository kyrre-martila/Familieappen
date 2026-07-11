import "reflect-metadata";
import { strict as assert } from "node:assert";
import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "../src/auth/auth.service";
import { AdminAuthController } from "../src/admin/admin-auth.controller";
import { AdminAuthService } from "../src/admin/admin-auth.service";
import { ADMIN_SESSION_COOKIE_NAME } from "../src/admin/admin-cookie";
import { AdminAuthGuard } from "../src/admin/guards/admin-auth.guard";
import { AdminRolesGuard } from "../src/admin/guards/admin-roles.guard";
import { ADMIN_ROLES_KEY } from "../src/admin/decorators/admin-roles.decorator";

const PASSWORD = "correct-password";

type Role = "SUPER_ADMIN" | "SUPPORT" | "ANALYST" | "AD_MANAGER";
type AdminRecord = { id: string; email: string; passwordHash: string; name: string; role: Role; active: boolean; lastLoginAt: Date | null; createdAt: Date; updatedAt: Date };
type AdminSessionRecord = { id: string; adminUserId: string; refreshTokenHash: string; userAgent?: string | null; ipAddress?: string | null; revokedAt?: Date | null; expiresAt: Date; createdAt: Date; updatedAt: Date };
type UserRecord = { id: string; email: string; passwordHash: string; name: string; createdAt: Date; updatedAt: Date };

class TestConfigService { readonly authJwtSecret = "normal-user-secret-that-admin-must-not-accept"; readonly adminSessionTtlSeconds = 60 * 60; readonly adminSessionSecret = "admin-session-secret-for-tests"; nodeEnv = "test"; adminCookieDomain?: string; }

class InMemoryPrismaService {
  readonly admins = new Map<string, AdminRecord>(); readonly adminSessions = new Map<string, AdminSessionRecord>(); readonly users = new Map<string, UserRecord>(); readonly auditLogs: any[] = [];
  private adminId = 1; private sessionId = 1; private userId = 1;
  readonly client = {
    adminUser: {
      findUnique: async ({ where }: any) => where.email ? [...this.admins.values()].find((a) => a.email === where.email) ?? null : this.admins.get(where.id) ?? null,
      update: async ({ where, data }: any) => { const a = this.admins.get(where.id); if (!a) throw new Error("missing admin"); Object.assign(a, data, { updatedAt: new Date() }); return a; }
    },
    adminSession: {
      create: async ({ data }: any) => { const now = new Date(); const s = { id: `admin-session-${this.sessionId++}`, ...data, revokedAt: null, createdAt: now, updatedAt: now }; this.adminSessions.set(s.id, s); return s; },
      findUnique: async ({ where, include }: any) => { const s = [...this.adminSessions.values()].find((candidate) => candidate.refreshTokenHash === where.refreshTokenHash) ?? this.adminSessions.get(where.id); return s && include?.adminUser ? { ...s, adminUser: this.admins.get(s.adminUserId) } : s ?? null; },
      updateMany: async ({ where, data }: any) => { let count = 0; for (const s of this.adminSessions.values()) if ((!where.id || s.id === where.id) && (where.revokedAt === undefined || s.revokedAt === where.revokedAt)) { Object.assign(s, data, { updatedAt: new Date() }); count++; } return { count }; }
    },
    adminAuditLog: { create: async ({ data }: any) => { this.auditLogs.push({ id: `audit-${this.auditLogs.length + 1}`, ...data, createdAt: new Date() }); return this.auditLogs.at(-1); } },
    user: {
      findUnique: async ({ where }: any) => where.email ? [...this.users.values()].find((u) => u.email === where.email) ?? null : this.users.get(where.id) ?? null,
      create: async ({ data }: any) => { const now = new Date(); const u = { id: `user-${this.userId++}`, ...data, createdAt: now, updatedAt: now }; this.users.set(u.id, u); return u; }
    },
    userSession: { create: async () => ({ id: "normal-session", expiresAt: new Date(Date.now() + 100000) }) }
  };
  async addAdmin(auth: AuthService, email: string, active = true, role: Role = "SUPER_ADMIN") { const now = new Date(); const admin = { id: `admin-${this.adminId++}`, email, passwordHash: await auth.hashPassword(PASSWORD), name: "Admin User", role, active, lastLoginAt: null, createdAt: now, updatedAt: now }; this.admins.set(admin.id, admin); return admin; }
}

function services(configOverrides: Partial<TestConfigService> = {}) { const prisma = new InMemoryPrismaService(); const config = Object.assign(new TestConfigService(), configOverrides); const auth = new AuthService(prisma as any, config as any, { sendEmail: async () => undefined } as any); const adminAuth = new AdminAuthService(prisma as any, config as any, auth); const controller = new AdminAuthController(adminAuth, config as any); return { prisma, auth, adminAuth, controller, config }; }
function response() { const headers = new Map<string, any>(); return { getHeader: (n: string) => headers.get(n), setHeader: (n: string, v: any) => headers.set(n, v), headers }; }
function setCookie(res: any) { return res.headers.get("Set-Cookie")[0] as string; }
function cookieToken(res: any) { const h = setCookie(res); const m = h.match(new RegExp(`${ADMIN_SESSION_COOKIE_NAME}=([^;]+)`)); assert.ok(m); return decodeURIComponent(m[1]); }
function cookieAttributes(cookie: string): Record<string, string | true> { return Object.fromEntries(cookie.split("; ").slice(1).map((part) => { const [name, ...value] = part.split("="); return [name, value.length ? value.join("=") : true]; })); }
async function rejectsUnauthorized(fn: () => Promise<unknown>) { await assert.rejects(fn, (e) => e instanceof UnauthorizedException); }
function context(req: any): ExecutionContext { return { switchToHttp: () => ({ getRequest: () => req }), getHandler: () => ({}), getClass: () => ({}) } as any; }

async function run() {

  {
    const { prisma, auth, controller } = services(); await prisma.addAdmin(auth, "admin@example.com"); const res = response(); await controller.login({ email: "admin@example.com", password: PASSWORD }, { headers: {} }, res as any); const attrs = cookieAttributes(setCookie(res)); assert.equal(attrs.Domain, undefined); assert.equal(attrs.Path, "/"); assert.equal(attrs.HttpOnly, true); assert.equal(attrs.SameSite, "Lax"); assert.equal(attrs.Secure, undefined);
  }
  {
    const { prisma, auth, controller } = services({ nodeEnv: "production", adminCookieDomain: ".familieappen.martila.no" }); await prisma.addAdmin(auth, "admin@example.com"); const res = response(); await controller.login({ email: "admin@example.com", password: PASSWORD }, { headers: {} }, res as any); const attrs = cookieAttributes(setCookie(res)); assert.equal(attrs.Domain, ".familieappen.martila.no"); assert.equal(attrs.Path, "/"); assert.equal(attrs.HttpOnly, true); assert.equal(attrs.SameSite, "Lax"); assert.equal(attrs.Secure, true);
  }
  {
    const { prisma, auth, controller } = services({ nodeEnv: "production", adminCookieDomain: ".familieappen.martila.no" }); await prisma.addAdmin(auth, "admin@example.com"); const loginRes = response(); await controller.login({ email: "admin@example.com", password: PASSWORD }, { headers: {} }, loginRes as any); const token = cookieToken(loginRes); const logoutRes = response(); await controller.logout({ headers: { cookie: `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` } }, logoutRes as any); const loginAttrs = cookieAttributes(setCookie(loginRes)); const logoutAttrs = cookieAttributes(setCookie(logoutRes)); assert.equal(logoutAttrs.Domain, loginAttrs.Domain); assert.equal(logoutAttrs.Path, loginAttrs.Path); assert.equal(logoutAttrs["Max-Age"], "0"); assert.equal(logoutAttrs.Secure, true);
  }
  {
    const { prisma, auth, controller } = services({ nodeEnv: "production", adminCookieDomain: ".familieappen.martila.no" }); await prisma.addAdmin(auth, "admin@example.com"); const res = response(); await controller.login({ email: "admin@example.com", password: PASSWORD }, { headers: {} }, res as any); const cookie = setCookie(res); assert.ok(cookie.includes("Domain=.familieappen.martila.no")); assert.ok(cookie.includes("Path=/")); assert.ok(cookie.includes("SameSite=Lax"));
  }
  {
    const { prisma, auth, controller } = services(); await prisma.addAdmin(auth, "admin@example.com"); const res = response(); const out = await controller.login({ email: "ADMIN@example.com", password: PASSWORD }, { headers: { "user-agent": "test" } }, res as any);
    assert.equal(out.data.admin.email, "admin@example.com"); assert.equal("passwordHash" in out.data.admin, false); assert.ok(cookieToken(res)); assert.equal("sessionToken" in out.data.session, false); assert.equal(prisma.auditLogs[0].action, "ADMIN_LOGIN"); assert.ok([...prisma.admins.values()][0].lastLoginAt);
  }
  {
    const { prisma, auth, controller } = services(); await prisma.addAdmin(auth, "admin@example.com"); await rejectsUnauthorized(() => controller.login({ email: "admin@example.com", password: "wrong-password" }, { headers: {} }, response() as any) as any); assert.equal(prisma.adminSessions.size, 0);
  }
  {
    const { controller } = services(); await rejectsUnauthorized(() => controller.login({ email: "missing@example.com", password: PASSWORD }, { headers: {} }, response() as any) as any);
  }
  {
    const { prisma, auth, controller } = services(); await prisma.addAdmin(auth, "inactive@example.com", false); await rejectsUnauthorized(() => controller.login({ email: "inactive@example.com", password: PASSWORD }, { headers: {} }, response() as any) as any);
  }
  {
    const { prisma, auth, controller } = services(); const hash = await auth.hashPassword(PASSWORD); await prisma.client.user.create({ data: { email: "user@example.com", passwordHash: hash, name: "User" } }); await rejectsUnauthorized(() => controller.login({ email: "user@example.com", password: PASSWORD }, { headers: {} }, response() as any) as any);
  }
  {
    const { prisma, auth, adminAuth, controller } = services(); await prisma.addAdmin(auth, "admin@example.com"); const res = response(); await controller.login({ email: "admin@example.com", password: PASSWORD }, { headers: {} }, res as any); const token = cookieToken(res); const guard = new AdminAuthGuard(adminAuth); const req: any = { headers: { cookie: `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` } }; assert.equal(await guard.canActivate(context(req)), true); assert.equal(req.admin.email, "admin@example.com"); await rejectsUnauthorized(() => guard.canActivate(context({ headers: { authorization: "Bearer normal-user-token" } })));
  }
  {
    const { prisma, auth, adminAuth, controller } = services(); await prisma.addAdmin(auth, "admin@example.com"); const res = response(); await controller.login({ email: "admin@example.com", password: PASSWORD }, { headers: {} }, res as any); const token = cookieToken(res); [...prisma.adminSessions.values()][0].expiresAt = new Date(Date.now() - 1000); await rejectsUnauthorized(() => adminAuth.getCurrentAdmin(token));
  }
  {
    const { prisma, auth, adminAuth, controller } = services(); await prisma.addAdmin(auth, "admin@example.com"); const res = response(); await controller.login({ email: "admin@example.com", password: PASSWORD }, { headers: {} }, res as any); const token = cookieToken(res); (adminAuth as any).config.adminSessionSecret = "rotated-admin-session-secret"; await rejectsUnauthorized(() => adminAuth.getCurrentAdmin(token));
  }
  {
    const { prisma, auth, adminAuth, controller } = services(); const admin = await prisma.addAdmin(auth, "admin@example.com"); const res = response(); await controller.login({ email: "admin@example.com", password: PASSWORD }, { headers: {} }, res as any); const token = cookieToken(res); admin.active = false; await rejectsUnauthorized(() => adminAuth.getCurrentAdmin(token));
  }
  {
    const { prisma, auth, adminAuth, controller } = services(); await prisma.addAdmin(auth, "admin@example.com"); const res = response(); await controller.login({ email: "admin@example.com", password: PASSWORD }, { headers: {} }, res as any); const token = cookieToken(res); await controller.logout({ headers: { cookie: `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` } }, response() as any); await rejectsUnauthorized(() => adminAuth.getCurrentAdmin(token)); assert.equal(prisma.auditLogs.at(-1).action, "ADMIN_LOGOUT");
  }
  {
    class TestReflector extends Reflector { getAllAndOverride() { return ["AD_MANAGER"]; } }
    const guard = new AdminRolesGuard(new TestReflector()); assert.equal(guard.canActivate(context({ admin: { role: "SUPER_ADMIN" } })), true); assert.equal(guard.canActivate(context({ admin: { role: "AD_MANAGER" } })), true); assert.throws(() => guard.canActivate(context({ admin: { role: "SUPPORT" } })), ForbiddenException); assert.equal(ADMIN_ROLES_KEY, "admin:roles");
  }
  console.log("admin auth tests passed");
}

void run();
