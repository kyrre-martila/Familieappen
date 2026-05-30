import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from "@nestjs/common";
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ConfigService } from "../config";
import { PrismaService } from "../prisma";
import { AuthResponseDto, LoginRequestDto, RegisterRequestDto, SafeUserDto } from "./dto/auth.dto";

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_KEY_LENGTH = 64;
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

type DatabaseUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

interface AuthTokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async register(input: RegisterRequestDto = {}): Promise<AuthResponseDto> {
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
          email,
          passwordHash
        }
      });

      return this.createAuthResponse(user);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("An account with this email already exists");
      }

      throw error;
    }
  }

  async login(input: LoginRequestDto = {}): Promise<AuthResponseDto> {
    const email = this.validateEmail(input.email);
    const password = this.validatePassword(input.password);

    const user = await this.prisma.client.user.findUnique({
      where: { email }
    });

    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.createAuthResponse(user);
  }

  verifyAccessToken(token: string): AuthTokenPayload {
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

    const payload = this.parseTokenPayload(encodedPayload);
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp <= now) {
      throw new UnauthorizedException("Access token has expired");
    }

    return payload;
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

  private validatePassword(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Password is required");
    }

    if (value.length < 8 || value.length > 1024) {
      throw new BadRequestException("Password must be between 8 and 1024 characters");
    }

    return value;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("base64url");
    const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;

    return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey.toString("base64url")}`;
  }

  private async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [prefix, salt, hash] = storedHash.split(":");

    if (prefix !== PASSWORD_HASH_PREFIX || !salt || !hash) {
      return false;
    }

    const expectedHash = Buffer.from(hash, "base64url");
    const derivedKey = (await scrypt(password, salt, expectedHash.length)) as Buffer;

    return expectedHash.length === derivedKey.length && timingSafeEqual(expectedHash, derivedKey);
  }

  private createAuthResponse(user: DatabaseUser): AuthResponseDto {
    return {
      user: this.toSafeUser(user),
      tokens: {
        accessToken: this.createAccessToken(user),
        tokenType: "Bearer",
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS
      }
    };
  }

  private toSafeUser(user: DatabaseUser): SafeUserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  private createAccessToken(user: DatabaseUser): string {
    const now = Math.floor(Date.now() / 1000);
    const header = this.base64UrlEncode({ alg: "HS256", typ: "JWT" });
    const payload = this.base64UrlEncode({
      sub: user.id,
      email: user.email,
      iat: now,
      exp: now + ACCESS_TOKEN_EXPIRES_IN_SECONDS
    });
    const signature = this.signJwtParts(header, payload);

    return `${header}.${payload}.${signature}`;
  }

  private signJwtParts(encodedHeader: string, encodedPayload: string): string {
    return createHmac("sha256", this.getJwtSecret())
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");
  }

  private getJwtSecret(): string {
    if (this.config.authJwtSecret) {
      return this.config.authJwtSecret;
    }

    if (this.config.nodeEnv === "production") {
      throw new InternalServerErrorException("Authentication is not configured");
    }

    return "familieappen-development-auth-secret-change-me";
  }

  private parseTokenPayload(encodedPayload: string): AuthTokenPayload {
    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<AuthTokenPayload>;

      if (
        typeof payload.sub !== "string" ||
        typeof payload.email !== "string" ||
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
