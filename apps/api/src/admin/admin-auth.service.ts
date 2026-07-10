import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { AuthService, SessionMetadata } from "../auth/auth.service";
import { ConfigService } from "../config";
import { PrismaService } from "../prisma";
import { AdminAuditAction } from "./admin-audit-actions";
import { AdminAuthResponseDto, AdminLoginRequestDto, SafeAdminUserDto } from "./dto/admin-auth.dto";

const ADMIN_SESSION_TOKEN_BYTES = 48;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX = 10;
const GENERIC_LOGIN_ERROR = "Invalid email or password";

type AdminUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "SUPER_ADMIN" | "SUPPORT" | "ANALYST" | "AD_MANAGER";
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AdminSessionRecord = {
  id: string;
  adminUserId: string;
  refreshTokenHash: string;
  revokedAt?: Date | null;
  expiresAt: Date;
  adminUser?: AdminUserRecord;
};

export type AdminRequestUser = SafeAdminUserDto & { sessionId: string };

@Injectable()
export class AdminAuthService {
  private readonly loginAttempts = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly authService: AuthService
  ) {}

  async login(input: AdminLoginRequestDto = {}, metadata: SessionMetadata = {}): Promise<AdminAuthResponseDto & { sessionToken: string; sessionTokenExpiresAt: Date }> {
    const email = this.validateEmail(input.email);
    const password = this.validatePassword(input.password);
    this.enforceLoginRateLimit(email, metadata.ipAddress);

    const admin = await (this.prisma.client as any).adminUser.findUnique({ where: { email } }) as AdminUserRecord | null;

    if (!admin || !admin.active || !(await this.authService.verifyPassword(password, admin.passwordHash))) {
      this.recordLoginAttempt(email, metadata.ipAddress);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const sessionToken = this.createSessionToken();
    const expiresAt = new Date(Date.now() + this.config.adminSessionTtlSeconds * 1000);
    const session = await (this.prisma.client as any).adminSession.create({
      data: {
        adminUserId: admin.id,
        refreshTokenHash: this.hashSessionToken(sessionToken),
        userAgent: metadata.userAgent ?? null,
        ipAddress: metadata.ipAddress ?? null,
        expiresAt
      }
    }) as AdminSessionRecord;
    const updatedAdmin = await (this.prisma.client as any).adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }) as AdminUserRecord;

    await this.createAuditLog(updatedAdmin.id, AdminAuditAction.ADMIN_LOGIN, "AdminSession", session.id, metadata);

    return {
      admin: this.toSafeAdmin(updatedAdmin),
      session: { expiresAt: session.expiresAt.toISOString() },
      sessionToken,
      sessionTokenExpiresAt: session.expiresAt
    };
  }

  async logout(sessionToken: unknown, metadata: SessionMetadata = {}): Promise<{ message: string }> {
    const session = await this.getSessionByToken(sessionToken);
    if (!session || !this.isSessionActive(session)) {
      throw new UnauthorizedException("Admin session is no longer active");
    }

    await (this.prisma.client as any).adminSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.createAuditLog(session.adminUserId, AdminAuditAction.ADMIN_LOGOUT, "AdminSession", session.id, metadata);
    return { message: "Logged out" };
  }

  async getCurrentAdmin(sessionToken: unknown): Promise<AdminRequestUser> {
    const session = await this.getSessionByToken(sessionToken);
    if (!session || !this.isSessionActive(session) || !session.adminUser?.active) {
      throw new UnauthorizedException("Admin session is no longer active");
    }

    return { ...this.toSafeAdmin(session.adminUser), sessionId: session.id };
  }

  async getSessionByToken(sessionTokenValue: unknown): Promise<AdminSessionRecord | null> {
    const sessionToken = this.validateSessionToken(sessionTokenValue);
    return (this.prisma.client as any).adminSession.findUnique({
      where: { refreshTokenHash: this.hashSessionToken(sessionToken) },
      include: { adminUser: true }
    }) as Promise<AdminSessionRecord | null>;
  }

  private async createAuditLog(adminUserId: string, action: AdminAuditAction, targetType: string, targetId: string | null, metadata: SessionMetadata): Promise<void> {
    await (this.prisma.client as any).adminAuditLog.create({
      data: { adminUserId, action, targetType, targetId, metadata: null, ipAddress: metadata.ipAddress ?? null }
    });
  }

  private validateEmail(value: unknown): string {
    if (typeof value !== "string") throw new BadRequestException("Email is required");
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException("Email must be a valid email address");
    return email;
  }

  private validatePassword(value: unknown): string {
    if (typeof value !== "string" || value.length < 8 || value.length > 1024) throw new BadRequestException("Password is required");
    return value;
  }

  private validateSessionToken(value: unknown): string {
    if (typeof value !== "string" || value.trim().length < 32) throw new UnauthorizedException("Admin session is required");
    return value.trim();
  }

  private enforceLoginRateLimit(email: string, ipAddress?: string | null): void {
    const key = `${ipAddress ?? "unknown"}:${email}`;
    const now = Date.now();
    const attempts = (this.loginAttempts.get(key) ?? []).filter((attempt) => attempt > now - LOGIN_RATE_LIMIT_WINDOW_MS);
    if (attempts.length >= LOGIN_RATE_LIMIT_MAX) throw new HttpException("Too many login attempts. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    this.loginAttempts.set(key, attempts);
  }

  private recordLoginAttempt(email: string, ipAddress?: string | null): void {
    const key = `${ipAddress ?? "unknown"}:${email}`;
    this.loginAttempts.set(key, [...(this.loginAttempts.get(key) ?? []), Date.now()]);
  }

  private createSessionToken(): string {
    return randomBytes(ADMIN_SESSION_TOKEN_BYTES).toString("base64url");
  }

  private hashSessionToken(sessionToken: string): string {
    return createHash("sha256").update(sessionToken, "utf8").digest("base64url");
  }

  private isSessionActive(session: { revokedAt?: Date | null; expiresAt: Date }): boolean {
    return !session.revokedAt && session.expiresAt > new Date();
  }

  private toSafeAdmin(admin: AdminUserRecord): SafeAdminUserDto {
    return { id: admin.id, email: admin.email, name: admin.name, role: admin.role, active: admin.active, lastLoginAt: admin.lastLoginAt?.toISOString() ?? null, createdAt: admin.createdAt.toISOString(), updatedAt: admin.updatedAt.toISOString() };
  }
}
