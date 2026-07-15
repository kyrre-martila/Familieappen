import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ConfigService } from "../config";
import { EmailService, getAppBaseUrl } from "../email";
import { PrismaService } from "../prisma";
import { AuthResponseDto, ForgotPasswordRequestDto, LoginRequestDto, PasswordResetMessageDto, RefreshResponseDto, RegisterRequestDto, ResetPasswordRequestDto, SafeUserDto } from "./dto/auth.dto";

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_KEY_LENGTH = 64;
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 15;
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;
const REFRESH_TOKEN_BYTE_LENGTH = 48;
const PASSWORD_RESET_TOKEN_BYTE_LENGTH = 32;
const PASSWORD_RESET_EXPIRES_IN_MINUTES = 30;
const PASSWORD_RESET_EXPIRES_IN_MS = PASSWORD_RESET_EXPIRES_IN_MINUTES * 60 * 1000;
const PASSWORD_RESET_RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const PASSWORD_RESET_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_EMAIL_LIMIT = 3;
const PASSWORD_RESET_IP_LIMIT = 10;
const PASSWORD_RESET_SUCCESS_MESSAGE = "Hvis e-postadressen finnes hos oss, sender vi en lenke for å tilbakestille passordet.";

type DatabaseUser = {
  id: string;
  name: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  email: string;
  phone?: string | null;
  birthDate?: Date | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  deactivatedAt?: Date | null;
};

type DatabaseSession = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  revokedAt?: Date | null;
  expiresAt: Date;
};

interface AuthTokenPayload {
  sub: string;
  userId: string;
  email: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface SessionMetadata {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface AuthSessionResponse extends AuthResponseDto {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface RefreshSessionResponse extends RefreshResponseDto {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService
  ) {}

  async register(input: RegisterRequestDto = {}, metadata: SessionMetadata = {}): Promise<AuthSessionResponse> {
    const name = this.validateName(input.name);
    const email = this.validateEmail(input.email);
    const password = this.validatePassword(input.password);

    const existingUser = await this.prisma.client.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await this.hashPassword(password);

    try {
      const user = await this.prisma.client.user.create({
        data: {
          name,
          firstName: "",
          middleName: null,
          lastName: "",
          displayName: "",
          email,
          passwordHash
        }
      });

      return this.createAuthResponse(user, metadata);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("An account with this email already exists");
      }

      throw error;
    }
  }

  async login(input: LoginRequestDto = {}, metadata: SessionMetadata = {}): Promise<AuthSessionResponse> {
    const email = this.validateEmail(input.email);
    const password = this.validatePassword(input.password);

    const user = await this.prisma.client.user.findUnique({
      where: { email }
    });

    if (!user || (user as DatabaseUser).deactivatedAt || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.createAuthResponse(user, metadata);
  }

  async forgotPassword(input: ForgotPasswordRequestDto = {}, metadata: SessionMetadata = {}): Promise<PasswordResetMessageDto> {
    let email: string;

    try {
      email = this.validateEmail(input.email);
    } catch {
      return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
    }

    const user = await this.prisma.client.user.findUnique({ where: { email } });

    if (!user) {
      return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
    }

    const emailHash = this.hashResetEmail(email);
    const resendCooldownStart = new Date(Date.now() - PASSWORD_RESET_RESEND_COOLDOWN_MS);
    const recentEmailCooldownRequest = await (this.prisma.client as any).passwordResetToken.findFirst({
      where: { emailHash, createdAt: { gte: resendCooldownStart } },
      select: { id: true }
    });

    if (recentEmailCooldownRequest) {
      return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
    }

    const windowStart = new Date(Date.now() - PASSWORD_RESET_RATE_LIMIT_WINDOW_MS);
    const recentEmailRequests = await (this.prisma.client as any).passwordResetToken.count({
      where: { emailHash, createdAt: { gte: windowStart } }
    });
    const recentIpRequests = metadata.ipAddress
      ? await (this.prisma.client as any).passwordResetToken.count({
          where: { requestIp: metadata.ipAddress, createdAt: { gte: windowStart } }
        })
      : 0;

    if (recentEmailRequests >= PASSWORD_RESET_EMAIL_LIMIT || recentIpRequests >= PASSWORD_RESET_IP_LIMIT) {
      return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
    }

    const rawToken = this.createPasswordResetToken();
    await (this.prisma.client as any).passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashPasswordResetToken(rawToken),
        emailHash,
        requestIp: metadata.ipAddress ?? null,
        userAgent: metadata.userAgent ?? null,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRES_IN_MS)
      }
    });

    await this.emailService.sendEmail({
      to: user.email,
      template: "forgot-password",
      data: {
        resetUrl: `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`,
        expiresInMinutes: PASSWORD_RESET_EXPIRES_IN_MINUTES
      }
    });

    return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
  }

  async resetPassword(input: ResetPasswordRequestDto = {}): Promise<PasswordResetMessageDto> {
    const token = this.validatePasswordResetToken(input.token);
    const password = this.validatePassword(input.password);
    const tokenHash = this.hashPasswordResetToken(token);
    const resetRecord = await (this.prisma.client as any).passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("Lenken er ugyldig eller utløpt. Be om en ny lenke.");
    }

    const passwordHash = await this.hashPassword(password);
    const now = new Date();
    const updated = await (this.prisma.client as any).passwordResetToken.updateMany({
      where: { id: resetRecord.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now }
    });

    if (updated.count !== 1) {
      throw new BadRequestException("Lenken er ugyldig eller utløpt. Be om en ny lenke.");
    }

    await this.prisma.client.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash }
    });
    await this.revokeAllUserSessions(resetRecord.userId);

    return { message: "Passordet er oppdatert. Du kan logge inn med det nye passordet." };
  }

  async refresh(refreshTokenValue: unknown): Promise<RefreshSessionResponse> {
    const refreshToken = this.validateRefreshToken(refreshTokenValue);
    const currentRefreshTokenHash = this.hashRefreshToken(refreshToken);
    const session = await (this.prisma.client as any).userSession.findUnique({
      where: { refreshTokenHash: currentRefreshTokenHash },
      include: { user: true }
    });

    if (!session || !this.isSessionActive(session) || session.user?.deactivatedAt) {
      throw new UnauthorizedException("Refresh session is no longer active");
    }

    const rotatedRefreshToken = this.createRefreshToken();
    const rotation = await (this.prisma.client as any).userSession.updateMany({
      where: { id: session.id, refreshTokenHash: currentRefreshTokenHash, revokedAt: null },
      data: { refreshTokenHash: this.hashRefreshToken(rotatedRefreshToken) }
    });

    if (rotation.count !== 1) {
      throw new UnauthorizedException("Refresh session is no longer active");
    }

    return {
      tokens: {
        accessToken: this.createAccessToken(session.user, session.id),
        tokenType: "Bearer",
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS
      },
      refreshToken: rotatedRefreshToken,
      refreshTokenExpiresAt: session.expiresAt
    };
  }

  async logout(accessToken: string): Promise<{ message: string }> {
    const payload = this.verifyAccessTokenSignature(accessToken);
    const session = await (this.prisma.client as any).userSession.findUnique({
      where: { id: payload.sessionId },
      select: { id: true, userId: true }
    });

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException("Session is no longer active");
    }

    await (this.prisma.client as any).userSession.updateMany({
      where: { id: payload.sessionId, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    return { message: "Logged out" };
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await (this.prisma.client as any).userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    const payload = this.verifyAccessTokenSignature(token);
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp <= now) {
      throw new UnauthorizedException("Access token has expired");
    }

    return payload;
  }

  async validateActiveSession(sessionId: string, userId: string): Promise<DatabaseSession> {
    const session = await (this.prisma.client as any).userSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, refreshTokenHash: true, revokedAt: true, expiresAt: true }
    });

    if (!session || session.userId !== userId || !this.isSessionActive(session)) {
      throw new UnauthorizedException("Session is no longer active");
    }

    return session;
  }

  private validateName(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Name is required");
    }

    const name = value.trim();

    if (name.length < 1 || name.length > 100) {
      throw new BadRequestException("Name must be between 1 and 100 characters");
    }

    return name;
  }

  private validateEmail(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Email is required");
    }

    const email = value.trim().toLowerCase();

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException("Email must be a valid email address");
    }

    return email;
  }

  validatePassword(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Password is required");
    }

    if (value.length < 8 || value.length > 1024) {
      throw new BadRequestException("Password must be between 8 and 1024 characters");
    }

    return value;
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("base64url");
    const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;

    return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey.toString("base64url")}`;
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [prefix, salt, hash] = storedHash.split(":");

    if (prefix !== PASSWORD_HASH_PREFIX || !salt || !hash) {
      return false;
    }

    const expectedHash = Buffer.from(hash, "base64url");
    const derivedKey = (await scrypt(password, salt, expectedHash.length)) as Buffer;

    return expectedHash.length === derivedKey.length && timingSafeEqual(expectedHash, derivedKey);
  }

  private async createAuthResponse(user: DatabaseUser, metadata: SessionMetadata): Promise<AuthSessionResponse> {
    const refreshToken = this.createRefreshToken();
    const session = await (this.prisma.client as any).userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        userAgent: metadata.userAgent ?? null,
        ipAddress: metadata.ipAddress ?? null,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000)
      }
    });

    return {
      user: this.toSafeUser(user),
      tokens: {
        accessToken: this.createAccessToken(user, session.id),
        tokenType: "Bearer",
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS
      },
      refreshToken,
      refreshTokenExpiresAt: session.expiresAt
    };
  }

  private toSafeUser(user: DatabaseUser): SafeUserDto {
    const displayName = this.getResolvedDisplayName(user);

    return {
      id: user.id,
      name: displayName,
      firstName: user.firstName ?? "",
      middleName: user.middleName ?? null,
      lastName: user.lastName ?? "",
      displayName,
      avatarUrl: user.avatarUrl ?? null,
      email: user.email,
      phone: user.phone ?? null,
      birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  private getResolvedDisplayName(user: Pick<DatabaseUser, "name" | "firstName" | "middleName" | "lastName" | "displayName">): string {
    return user.displayName || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ").trim() || user.name;
  }

  private getFirstNameFromDisplayName(name: string): string {
    return name.trim().split(/\s+/)[0] ?? name;
  }

  private getLastNameFromDisplayName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : "";
  }

  private createAccessToken(user: DatabaseUser, sessionId: string): string {
    const now = Math.floor(Date.now() / 1000);
    const header = this.base64UrlEncode({ alg: "HS256", typ: "JWT" });
    const payload = this.base64UrlEncode({
      sub: user.id,
      userId: user.id,
      email: user.email,
      sessionId,
      iat: now,
      exp: now + ACCESS_TOKEN_EXPIRES_IN_SECONDS
    });
    const signature = this.signJwtParts(header, payload);

    return `${header}.${payload}.${signature}`;
  }

  private createRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString("base64url");
  }

  private validatePasswordResetToken(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Tilbakestillingslenken er ugyldig.");
    }

    const token = value.trim();

    if (token.length < 32 || token.length > 256 || !/^[A-Za-z0-9_-]+$/.test(token)) {
      throw new BadRequestException("Tilbakestillingslenken er ugyldig.");
    }

    return token;
  }

  private createPasswordResetToken(): string {
    return randomBytes(PASSWORD_RESET_TOKEN_BYTE_LENGTH).toString("base64url");
  }

  private hashPasswordResetToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("base64url");
  }

  private hashResetEmail(email: string): string {
    return createHmac("sha256", this.getJwtSecret()).update(email, "utf8").digest("base64url");
  }

  private validateRefreshToken(value: unknown): string {
    if (typeof value !== "string" || value.trim().length < 32) {
      throw new UnauthorizedException("Refresh token is required");
    }

    return value.trim();
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash("sha256").update(refreshToken, "utf8").digest("base64url");
  }

  private isSessionActive(session: { revokedAt?: Date | null; expiresAt: Date }): boolean {
    return !session.revokedAt && session.expiresAt > new Date();
  }

  private verifyAccessTokenSignature(token: string): AuthTokenPayload {
    const tokenParts = token.split(".");

    if (tokenParts.length !== 3) {
      throw new UnauthorizedException("Invalid access token");
    }

    const [encodedHeader, encodedPayload, signature] = tokenParts;

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException("Invalid access token");
    }

    const expectedSignature = this.signJwtParts(encodedHeader, encodedPayload);

    if (!this.safeEqual(signature, expectedSignature)) {
      throw new UnauthorizedException("Invalid access token");
    }

    return this.parseTokenPayload(encodedPayload);
  }

  private signJwtParts(encodedHeader: string, encodedPayload: string): string {
    return createHmac("sha256", this.getJwtSecret())
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");
  }

  private getJwtSecret(): string {
    return this.config.authJwtSecret;
  }

  private parseTokenPayload(encodedPayload: string): AuthTokenPayload {
    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<AuthTokenPayload>;

      if (
        typeof payload.sub !== "string" ||
        typeof payload.userId !== "string" ||
        payload.userId !== payload.sub ||
        typeof payload.email !== "string" ||
        typeof payload.sessionId !== "string" ||
        typeof payload.iat !== "number" ||
        typeof payload.exp !== "number"
      ) {
        throw new Error("Invalid payload");
      }

      return payload as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
  }

  private base64UrlEncode(value: unknown): string {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
