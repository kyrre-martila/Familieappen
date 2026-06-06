import { BadRequestException, ConflictException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { API_ERROR_CODES, ApiException } from "../common";
import { PrismaService } from "../prisma";
import { AuthService } from "./auth.service";
import { ChangePasswordRequestDto, ChangePasswordResponseDto, DeleteAccountRequestDto, DeleteAccountResponseDto, UpdateUserProfileRequestDto, UserProfileDto } from "./dto/profile.dto";

const UPDATE_PROFILE_FIELDS = new Set(["name", "email", "phone"]);
const CHANGE_PASSWORD_FIELDS = new Set(["currentPassword", "newPassword", "confirmPassword"]);
const DELETE_ACCOUNT_FIELDS = new Set(["password", "confirmationText"]);
const FAMILY_ADMIN_ROLES = ["OWNER", "PARENT"] as const;

type DatabaseProfileUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
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
    const newPassword = this.authService.validatePassword(input.newPassword);
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

    const data: { name?: string; email?: string; phone?: string | null } = {};

    if ("name" in input) {
      data.name = this.validateName(input.name);
    }

    if ("email" in input) {
      data.email = this.validateEmail(input.email);
    }

    if ("phone" in input) {
      data.phone = this.validatePhone(input.phone);
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
      const user = await this.prisma.client.user.update({
        where: { id: userId },
        data
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

  private toProfileDto(user: DatabaseProfileUser): UserProfileDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }

  private isRecordNotFoundError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
  }
}
