import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma";
import {
  AddFamilyMemberRequestDto,
  AddFamilyMemberRoleDto,
  CreateFamilyRequestDto,
  FamilyDetailsDto,
  FamilyDto,
  FamilyMemberDto,
  FamilyMemberRoleDto,
  FamilyWithMembershipDto
} from "./dto/family.dto";
import { FamilyAuthorizationService } from "./family-authorization.service";

const FAMILY_MANAGER_ROLES: FamilyMemberRoleDto[] = ["OWNER", "PARENT"];
const MANUAL_MEMBER_ROLES: AddFamilyMemberRoleDto[] = ["PARENT", "CHILD", "GUEST"];

type UserRecord = {
  id: string;
  name: string;
};

type FamilyRecord = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type FamilyMemberRecord = {
  id: string;
  userId: string | null;
  familyId: string;
  displayName: string;
  role: FamilyMemberRoleDto;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class FamiliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService
  ) {}

  async createFamily(userId: string, input: CreateFamilyRequestDto = {}): Promise<FamilyDetailsDto> {
    const name = this.validateFamilyName(input.name);
    const user = await this.getUserOrThrow(userId);

    const family = await this.prisma.client.family.create({
      data: {
        name,
        members: {
          create: {
            userId: user.id,
            displayName: user.name,
            role: "OWNER"
          }
        }
      },
      include: {
        members: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return {
      family: this.toFamilyDto(family),
      members: family.members.map((member: FamilyMemberRecord) => this.toFamilyMemberDto(member))
    };
  }

  async listUserFamilies(userId: string): Promise<FamilyWithMembershipDto[]> {
    const memberships = await this.prisma.client.familyMember.findMany({
      where: { userId },
      include: { family: true },
      orderBy: { createdAt: "asc" }
    });

    return memberships.map((membership: FamilyMemberRecord & { family: FamilyRecord }) => ({
      family: this.toFamilyDto(membership.family),
      membership: this.toFamilyMemberDto(membership)
    }));
  }

  async getFamilyDetails(userId: string, familyId: string): Promise<FamilyDetailsDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);

    const family = await this.prisma.client.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!family) {
      throw new NotFoundException("Family was not found");
    }

    return {
      family: this.toFamilyDto(family),
      members: family.members.map((member: FamilyMemberRecord) => this.toFamilyMemberDto(member))
    };
  }

  async addFamilyMember(
    userId: string,
    familyId: string,
    input: AddFamilyMemberRequestDto = {}
  ): Promise<FamilyMemberDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, FAMILY_MANAGER_ROLES);

    const displayName = this.validateDisplayName(input.displayName);
    const role = this.validateManualMemberRole(input.role);

    const member = await this.prisma.client.familyMember.create({
      data: {
        familyId,
        displayName,
        role
      }
    });

    return this.toFamilyMemberDto(member);
  }

  async removeFamilyMember(userId: string, familyId: string, memberId: string): Promise<FamilyMemberDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, FAMILY_MANAGER_ROLES);

    const member = await this.prisma.client.familyMember.findFirst({
      where: {
        id: memberId,
        familyId
      }
    });

    if (!member) {
      throw new NotFoundException("Family member was not found");
    }

    if (member.role === "OWNER") {
      const ownerCount = await this.prisma.client.familyMember.count({
        where: {
          familyId,
          role: "OWNER"
        }
      });

      if (ownerCount <= 1) {
        throw new BadRequestException("The last owner cannot be removed");
      }
    }

    const deletedMember = await this.prisma.client.familyMember.delete({
      where: { id: member.id }
    });

    return this.toFamilyMemberDto(deletedMember);
  }

  private async getUserOrThrow(userId: string): Promise<UserRecord> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true
      }
    });

    if (!user) {
      throw new NotFoundException("User was not found");
    }

    return user;
  }

  private validateFamilyName(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Family name is required");
    }

    const name = value.trim();

    if (name.length < 1 || name.length > 100) {
      throw new BadRequestException("Family name must be between 1 and 100 characters");
    }

    return name;
  }

  private validateDisplayName(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Display name is required");
    }

    const displayName = value.trim();

    if (displayName.length < 1 || displayName.length > 100) {
      throw new BadRequestException("Display name must be between 1 and 100 characters");
    }

    return displayName;
  }

  private validateManualMemberRole(value: unknown): AddFamilyMemberRoleDto {
    if (typeof value !== "string" || !MANUAL_MEMBER_ROLES.includes(value as AddFamilyMemberRoleDto)) {
      throw new BadRequestException("Role must be PARENT, CHILD, or GUEST");
    }

    return value as AddFamilyMemberRoleDto;
  }

  private toFamilyDto(family: FamilyRecord): FamilyDto {
    return {
      id: family.id,
      name: family.name,
      createdAt: family.createdAt.toISOString(),
      updatedAt: family.updatedAt.toISOString()
    };
  }

  private toFamilyMemberDto(member: FamilyMemberRecord): FamilyMemberDto {
    return {
      id: member.id,
      userId: member.userId,
      familyId: member.familyId,
      displayName: member.displayName,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString()
    };
  }
}
