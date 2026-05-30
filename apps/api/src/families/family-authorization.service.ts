import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { FamilyMemberRoleDto } from "./dto/family.dto";

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
export class FamilyAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async requireFamilyMember(userId: string, familyId: string): Promise<FamilyMemberRecord> {
    const membership = await this.prisma.client.familyMember.findFirst({
      where: {
        familyId,
        userId
      }
    });

    if (!membership) {
      throw new NotFoundException("Family was not found");
    }

    return membership;
  }

  async requireFamilyRole(
    userId: string,
    familyId: string,
    allowedRoles: FamilyMemberRoleDto[]
  ): Promise<FamilyMemberRecord> {
    const membership = await this.requireFamilyMember(userId, familyId);

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException("You do not have permission to manage this family");
    }

    return membership;
  }
}
