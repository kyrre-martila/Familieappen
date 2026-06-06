import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { UpdateUserProfileRequestDto, UserProfileDto } from "./dto/profile.dto";

const UPDATE_PROFILE_FIELDS = new Set(["name", "email", "phone"]);

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
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("User profile was not found");
    }

    return this.toProfileDto(user);
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
