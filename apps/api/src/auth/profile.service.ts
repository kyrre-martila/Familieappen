import { BadRequestException, ConflictException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, join, basename } from "node:path";
import { API_ERROR_CODES, ApiException } from "../common";
import { PrismaService } from "../prisma";
import { AuthService } from "./auth.service";
import { ChangePasswordRequestDto, ChangePasswordResponseDto, DeleteAccountRequestDto, DeleteAccountResponseDto, UpdateUserProfileRequestDto, UserProfileDto } from "./dto/profile.dto";

const TECHNICAL_REGISTRATION_NAMES = new Set(["Ny bruker"]);
const UPDATE_PROFILE_FIELDS = new Set(["name", "firstName", "middleName", "lastName", "displayName", "avatarUrl", "email", "phone", "birthDate"]);
const PROFILE_IMAGE_UPLOAD_DIR = "/app/uploads/profile-images";
const PROFILE_IMAGE_PUBLIC_PREFIX = "/uploads/profile-images";
const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const CHANGE_PASSWORD_FIELDS = new Set(["currentPassword", "newPassword", "confirmPassword"]);
const DELETE_ACCOUNT_FIELDS = new Set(["password", "confirmationText"]);
const FAMILY_ADMIN_ROLES = ["OWNER", "PARENT"] as const;

type DatabaseProfileUser = {
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
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  async getCurrentUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("User profile was not found");
    }

    return this.toProfileDto(user);
  }

  async changeCurrentUserPassword(userId: string, input: ChangePasswordRequestDto = {}): Promise<ChangePasswordResponseDto> {
    this.rejectUnknownPasswordFields(input);

    const currentPassword = this.validateRequiredPassword(input.currentPassword, "Current password is required");
    const newPassword = this.authService.validateNewPassword(input.newPassword);
    const confirmPassword = this.validateRequiredPassword(input.confirmPassword, "Confirm password is required");

    if (newPassword !== confirmPassword) {
      throw new BadRequestException("Passordene er ikke like.");
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException("Nytt passord må være forskjellig fra nåværende passord.");
    }

    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("User profile was not found");
    }

    if (!(await this.authService.verifyPassword(currentPassword, user.passwordHash))) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Nåværende passord stemmer ikke.");
    }

    await this.prisma.client.user.update({
      where: { id: userId },
      data: { passwordHash: await this.authService.hashPassword(newPassword) }
    });

    return { message: "Passordet ble oppdatert" };
  }


  async deleteCurrentUserAccount(userId: string, input: DeleteAccountRequestDto = {}): Promise<DeleteAccountResponseDto> {
    this.rejectUnknownDeleteAccountFields(input);

    const password = this.validateRequiredPassword(input.password, "Password is required");
    const confirmationText = this.validateConfirmationText(input.confirmationText);

    if (confirmationText !== "SLETT") {
      throw new BadRequestException("Skriv SLETT for å bekrefte.");
    }

    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("User profile was not found");
    }

    if (!(await this.authService.verifyPassword(password, user.passwordHash))) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Passordet stemmer ikke.");
    }

    await this.prisma.client.$transaction(async (tx) => {
      const memberships = await tx.familyMember.findMany({
        where: { userId },
        select: { id: true, familyId: true, role: true }
      });

      for (const membership of memberships) {
        const [memberCount, otherAdminCount] = await Promise.all([
          tx.familyMember.count({ where: { familyId: membership.familyId } }),
          tx.familyMember.count({
            where: {
              familyId: membership.familyId,
              id: { not: membership.id },
              role: { in: [...FAMILY_ADMIN_ROLES] }
            }
          })
        ]);

        if (memberCount > 1 && this.isFamilyAdminRole(membership.role) && otherAdminCount < 1) {
          throw new BadRequestException("Du må gi administratorrollen til noen andre før du kan slette kontoen.");
        }
      }

      const revokedAt = new Date();

      await (tx as any).userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt }
      });

      await tx.familyInvitation.updateMany({
        where: { createdByUserId: userId, status: "pending" },
        data: { status: "revoked", revokedAt }
      });

      await tx.wishlistShareInvitation.updateMany({
        where: { createdByUserId: userId, status: "pending" },
        data: { status: "revoked", revokedAt }
      });

      for (const membership of memberships) {
        const memberCount = await tx.familyMember.count({ where: { familyId: membership.familyId } });

        if (memberCount <= 1) {
          await tx.family.delete({ where: { id: membership.familyId } });
        } else {
          await tx.familyMember.delete({ where: { id: membership.id } });
        }
      }

      await tx.user.delete({ where: { id: userId } });
    });

    return { message: "Kontoen ble slettet." };
  }

  async updateCurrentUserProfile(userId: string, input: UpdateUserProfileRequestDto = {}): Promise<UserProfileDto> {
    this.rejectUnknownFields(input);

    const data: { name?: string; firstName?: string; middleName?: string | null; lastName?: string; displayName?: string; avatarUrl?: string | null; email?: string; phone?: string | null; birthDate?: Date | null } = {};
    const currentUser = await this.prisma.client.user.findUnique({ where: { id: userId } }) as DatabaseProfileUser | null;

    if (!currentUser) {
      throw new NotFoundException("User profile was not found");
    }

    if ("firstName" in input || "middleName" in input || "lastName" in input) {
      const firstName = "firstName" in input ? this.validateNamePart(input.firstName, "First name is required") : (currentUser.firstName || this.getFirstNameFromDisplayName(currentUser.name));
      const middleName = "middleName" in input ? this.validateOptionalNamePart(input.middleName) : (currentUser.middleName ?? null);
      const lastName = "lastName" in input ? this.validateNamePart(input.lastName, "Last name is required") : (currentUser.lastName || this.getLastNameFromDisplayName(currentUser.name));
      const displayName = this.buildDisplayName(firstName, middleName, lastName);

      data.firstName = firstName;
      data.middleName = middleName;
      data.lastName = lastName;
      data.displayName = displayName;
      data.name = displayName;
    } else if ("displayName" in input || "name" in input) {
      const displayName = this.validateName(("displayName" in input ? input.displayName : input.name));
      data.displayName = displayName;
      data.name = displayName;
      data.firstName = this.getFirstNameFromDisplayName(displayName);
      data.middleName = null;
      data.lastName = this.getLastNameFromDisplayName(displayName);
    }

    if ("avatarUrl" in input) {
      data.avatarUrl = this.validateAvatarUrl(input.avatarUrl);
    }

    if ("email" in input) {
      data.email = this.validateEmail(input.email);
    }

    if ("phone" in input) {
      data.phone = this.validatePhone(input.phone);
    }

    if ("birthDate" in input) {
      data.birthDate = this.validateBirthDate(input.birthDate);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("At least one profile field must be provided");
    }

    if (data.email) {
      const existingUser = await this.prisma.client.user.findUnique({ where: { email: data.email } });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException("An account with this email already exists");
      }
    }

    try {
      const user = await this.prisma.client.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data
        });

        if (data.name) {
          await tx.familyMember.updateMany({
            where: { userId },
            data: { displayName: data.name }
          });
        }

        return updatedUser;
      });

      return this.toProfileDto(user);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("An account with this email already exists");
      }

      if (this.isRecordNotFoundError(error)) {
        throw new NotFoundException("User profile was not found");
      }

      throw error;
    }
  }

  async updateCurrentUserAvatar(userId: string, file: { buffer?: Buffer; mimetype?: string; originalname?: string; size?: number }): Promise<UserProfileDto> {
    if (!file?.buffer || !file.mimetype || !ALLOWED_PROFILE_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Profile image must be JPEG, PNG, WebP, HEIC or HEIF");
    }

    if ((file.size ?? file.buffer.length) > MAX_PROFILE_IMAGE_BYTES) {
      throw new BadRequestException("Profile image must be smaller than 2 MB");
    }

    const currentUser = await this.prisma.client.user.findUnique({ where: { id: userId } }) as DatabaseProfileUser | null;

    if (!currentUser) {
      throw new NotFoundException("User profile was not found");
    }

    await mkdir(PROFILE_IMAGE_UPLOAD_DIR, { recursive: true });
    const extension = this.getUploadExtension(file.mimetype, file.originalname);
    const filename = `${userId}-${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
    const filePath = join(PROFILE_IMAGE_UPLOAD_DIR, filename);
    await writeFile(filePath, file.buffer);

    const avatarUrl = `${PROFILE_IMAGE_PUBLIC_PREFIX}/${filename}`;
    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data: { avatarUrl }
    }) as DatabaseProfileUser;

    void this.removeOwnedAvatarFile(currentUser.avatarUrl, userId);

    return this.toProfileDto(updatedUser);
  }

  async removeCurrentUserAvatar(userId: string): Promise<UserProfileDto> {
    const currentUser = await this.prisma.client.user.findUnique({ where: { id: userId } }) as DatabaseProfileUser | null;

    if (!currentUser) {
      throw new NotFoundException("User profile was not found");
    }

    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data: { avatarUrl: null }
    }) as DatabaseProfileUser;

    void this.removeOwnedAvatarFile(currentUser.avatarUrl, userId);

    return this.toProfileDto(updatedUser);
  }


  private rejectUnknownDeleteAccountFields(input: DeleteAccountRequestDto): void {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      throw new BadRequestException("Account deletion must be an object");
    }

    const unknownFields = Object.keys(input).filter((field) => !DELETE_ACCOUNT_FIELDS.has(field));

    if (unknownFields.length > 0) {
      throw new BadRequestException(`Unknown account deletion field: ${unknownFields[0]}`);
    }
  }

  private validateConfirmationText(value: unknown): string {
    if (typeof value !== "string" || value.length === 0) {
      throw new BadRequestException("Confirmation text is required");
    }

    return value;
  }

  private isFamilyAdminRole(role: string): boolean {
    return FAMILY_ADMIN_ROLES.some((adminRole) => adminRole === role);
  }

  private rejectUnknownPasswordFields(input: ChangePasswordRequestDto): void {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      throw new BadRequestException("Password change must be an object");
    }

    const unknownFields = Object.keys(input).filter((field) => !CHANGE_PASSWORD_FIELDS.has(field));

    if (unknownFields.length > 0) {
      throw new BadRequestException(`Unknown password field: ${unknownFields[0]}`);
    }
  }

  private validateRequiredPassword(value: unknown, message: string): string {
    if (typeof value !== "string" || value.length === 0) {
      throw new BadRequestException(message);
    }

    return value;
  }

  private rejectUnknownFields(input: UpdateUserProfileRequestDto): void {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      throw new BadRequestException("Profile update must be an object");
    }

    const unknownFields = Object.keys(input).filter((field) => !UPDATE_PROFILE_FIELDS.has(field));

    if (unknownFields.length > 0) {
      throw new BadRequestException(`Unknown profile field: ${unknownFields[0]}`);
    }
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

  private validateNamePart(value: unknown, message: string): string {
    if (typeof value !== "string") {
      throw new BadRequestException(message);
    }

    const name = value.trim();

    if (name.length < 1 || name.length > 60) {
      throw new BadRequestException(message);
    }

    return name;
  }

  private validateOptionalNamePart(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Middle name must be text");
    }

    const name = value.trim();

    if (!name) {
      return null;
    }

    if (name.length > 80) {
      throw new BadRequestException("Middle name is too long");
    }

    return name;
  }

  private validateAvatarUrl(value: unknown): string | null {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    if (typeof value !== "string" || !value.startsWith(PROFILE_IMAGE_PUBLIC_PREFIX + "/") || value.length > 255) {
      throw new BadRequestException("Avatar URL is invalid");
    }

    return value;
  }

  private buildDisplayName(firstName: string, middleName: string | null, lastName: string): string {
    return [firstName, middleName, lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  private getFirstNameFromDisplayName(name: string): string {
    return name.trim().split(/\s+/)[0] ?? name;
  }

  private getLastNameFromDisplayName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : "";
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

  private validateBirthDate(value: unknown): Date | null {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Birth date must use YYYY-MM-DD format");
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      throw new BadRequestException("Birth date must use YYYY-MM-DD format");
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new BadRequestException("Birth date must be a valid calendar date");
    }

    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (date > todayUtc) {
      throw new BadRequestException("Birth date cannot be in the future");
    }

    return date;
  }

  private validatePhone(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Phone must be a valid phone number");
    }

    const phone = value.trim();

    if (!phone) {
      return null;
    }

    if (phone.length > 30 || !/^[+()\d\s.-]{3,30}$/.test(phone)) {
      throw new BadRequestException("Phone must be a valid phone number");
    }

    return phone;
  }

  private isTechnicalRegistrationName(name: string | null | undefined): boolean {
    return TECHNICAL_REGISTRATION_NAMES.has((name ?? "").trim());
  }

  private toProfileDto(user: DatabaseProfileUser): UserProfileDto {
    const profileName = user.displayName || this.buildDisplayName(user.firstName ?? "", user.middleName ?? null, user.lastName ?? "");
    const displayName = profileName || (this.isTechnicalRegistrationName(user.name) ? "" : user.name);

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

  private getUploadExtension(mimetype: string, originalName?: string): string {
    if (mimetype === "image/png") return ".png";
    if (mimetype === "image/webp") return ".webp";
    if (mimetype === "image/heic") return ".heic";
    if (mimetype === "image/heif") return ".heif";
    const originalExtension = originalName ? extname(originalName).toLowerCase() : "";
    return [".jpg", ".jpeg"].includes(originalExtension) ? originalExtension : ".jpg";
  }

  private async removeOwnedAvatarFile(avatarUrl: string | null | undefined, userId: string): Promise<void> {
    if (!avatarUrl?.startsWith(PROFILE_IMAGE_PUBLIC_PREFIX + "/")) {
      return;
    }

    const filename = basename(avatarUrl);

    if (!filename.startsWith(`${userId}-`)) {
      return;
    }

    try {
      await unlink(join(PROFILE_IMAGE_UPLOAD_DIR, filename));
    } catch {
      // TODO: record cleanup failures once the API has structured operational logging.
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }

  private isRecordNotFoundError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
  }
}
