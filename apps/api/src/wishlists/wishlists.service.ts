import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { EmailService, getAppBaseUrl } from "../email";
import { FamilyAuthorizationService } from "../families";
import { PrismaService } from "../prisma";
import { SharedWishlistItemDto, SharedWishlistItemsResponseDto, SharedWishlistSummaryDto, WishlistInvitePreviewDto, WishlistItemCreateInput, WishlistItemDto, WishlistItemListResponseDto, WishlistItemUpdateInput, WishlistReorderInput, WishlistShareInvitationDto, WishlistShareInviteInput, WishlistShareInviteResponseDto } from "./dto/wishlist.dto";

const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 1000;
const LINK_MAX_LENGTH = 2048;
const IMAGE_URL_MAX_LENGTH = 2048;
const ICON_MAX_LENGTH = 80;
const POSITION_STEP = 1000;
const INVITE_TOKEN_BYTES = 32;
const ACTIVE_SHARE_STATUSES = ["pending", "accepted"];

type FamilyMemberRecord = {
  id: string;
  userId: string | null;
  familyId: string;
  displayName: string;
  user?: { avatarUrl?: string | null } | null;
};

type WishlistItemReservationRecord = {
  id: string;
  wishlistItemId: string;
  reservedByUserId: string;
  reservedAt: Date;
  releasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaClientWithWishlistReservations = typeof PrismaService.prototype.client & {
  wishlistItemReservation: {
    create(input: unknown): Promise<unknown>;
    update(input: unknown): Promise<unknown>;
    updateMany(input: unknown): Promise<unknown>;
    findFirst(input: unknown): Promise<unknown>;
  };
  wishlistShareInvitation: {
    create(input: unknown): Promise<unknown>;
    update(input: unknown): Promise<unknown>;
    findFirst(input: unknown): Promise<unknown>;
    findMany(input: unknown): Promise<unknown[]>;
  };
};

type UserRecord = { id: string; email: string; name: string };

type WishlistShareInvitationRecord = {
  id: string;
  wishlistOwnerUserId: string;
  wishlistOwnerFamilyMemberId: string | null;
  familyId: string;
  invitedEmail: string;
  invitedUserId: string | null;
  tokenHash: string;
  status: "pending" | "accepted" | "declined" | "removed" | "revoked";
  createdByUserId: string;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  removedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  wishlistOwnerFamilyMember?: FamilyMemberRecord | null;
  createdByUser?: UserRecord | null;
};

type WishlistItemRecord = {
  id: string;
  familyId: string;
  ownerUserId: string;
  ownerFamilyMemberId: string | null;
  title: string;
  description: string | null;
  price: number | string | null;
  storeOrLink: string | null;
  imageUrl: string | null;
  icon: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  reservations?: WishlistItemReservationRecord[];
};

@Injectable()
export class WishlistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService,
    private readonly emailService: EmailService
  ) {}

  async listMyItems(userId: string, familyId: string): Promise<WishlistItemListResponseDto> {
    await this.requireCurrentMember(userId, familyId);
    const items = await this.findActiveItems(userId, familyId);

    return { items: items.map((item) => this.toWishlistItemDto(item)) };
  }


  async listShareInvitations(userId: string, familyId: string): Promise<WishlistShareInvitationDto[]> {
    await this.requireCurrentMember(userId, familyId);
    const invitations = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.findMany({
      where: { wishlistOwnerUserId: userId, familyId },
      orderBy: [{ createdAt: "desc" }]
    }) as WishlistShareInvitationRecord[];

    return invitations.map((invitation) => this.toShareInvitationDto(invitation));
  }

  async inviteByEmail(userId: string, familyId: string, input: WishlistShareInviteInput = {}): Promise<WishlistShareInviteResponseDto> {
    const membership = await this.requireCurrentMember(userId, familyId);
    const invitedEmail = this.validateEmail(this.pickAlias(input.email, this.pickAlias(input.invitedEmail, input.invited_email)));
    const inviter = await this.prisma.client.user.findUnique({ where: { id: userId } }) as UserRecord | null;

    if (!inviter) {
      throw new NotFoundException("User was not found");
    }

    if (inviter.email.trim().toLowerCase() === invitedEmail) {
      throw new BadRequestException("Du kan ikke invitere deg selv");
    }

    const familyMemberWithEmail = await this.prisma.client.familyMember.findFirst({
      where: {
        familyId,
        user: { email: { equals: invitedEmail, mode: "insensitive" } }
      }
    });

    if (familyMemberWithEmail) {
      throw new ConflictException("Familiemedlemmer har allerede tilgang til ønskelisten");
    }

    const existingActiveInvite = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.findFirst({
      where: {
        wishlistOwnerUserId: userId,
        invitedEmail: { equals: invitedEmail, mode: "insensitive" },
        status: { in: ACTIVE_SHARE_STATUSES }
      }
    }) as WishlistShareInvitationRecord | null;

    const invitedUser = await this.prisma.client.user.findUnique({ where: { email: invitedEmail } }) as UserRecord | null;
    const token = this.generateRawToken();

    if (existingActiveInvite?.status === "accepted") {
      throw new ConflictException("Denne e-postadressen har allerede tilgang");
    }

    if (existingActiveInvite?.status === "pending") {
      const updated = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.update({
        where: { id: existingActiveInvite.id },
        data: {
          wishlistOwnerFamilyMemberId: membership.id,
          invitedUserId: invitedUser?.id ?? existingActiveInvite.invitedUserId,
          tokenHash: this.hashToken(token)
        }
      }) as WishlistShareInvitationRecord;
      const email = await this.sendWishlistInviteEmail(invitedEmail, token, inviter.name, membership.displayName);

      return { invitation: this.toShareInvitationDto(updated), email: { ok: email.ok, mode: email.mode } };
    }

    const invitation = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.create({
      data: {
        wishlistOwnerUserId: userId,
        wishlistOwnerFamilyMemberId: membership.id,
        familyId,
        invitedEmail,
        invitedUserId: invitedUser?.id ?? null,
        tokenHash: this.hashToken(token),
        createdByUserId: userId
      }
    }) as WishlistShareInvitationRecord;
    const email = await this.sendWishlistInviteEmail(invitedEmail, token, inviter.name, membership.displayName);

    return { invitation: this.toShareInvitationDto(invitation), email: { ok: email.ok, mode: email.mode } };
  }

  async resendInvitation(userId: string, familyId: string, inviteId: string): Promise<WishlistShareInviteResponseDto> {
    const membership = await this.requireCurrentMember(userId, familyId);
    const invitation = await this.getOwnedInvitationOrThrow(userId, familyId, inviteId);

    if (invitation.status !== "pending") {
      throw new BadRequestException("Bare ventende invitasjoner kan sendes på nytt");
    }

    const inviter = await this.prisma.client.user.findUnique({ where: { id: userId } }) as UserRecord | null;
    const token = this.generateRawToken();
    const updated = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.update({
      where: { id: invitation.id },
      data: { tokenHash: this.hashToken(token), wishlistOwnerFamilyMemberId: membership.id }
    }) as WishlistShareInvitationRecord;
    const email = await this.sendWishlistInviteEmail(invitation.invitedEmail, token, inviter?.name ?? membership.displayName, membership.displayName);

    return { invitation: this.toShareInvitationDto(updated), email: { ok: email.ok, mode: email.mode } };
  }

  async revokeInvitation(userId: string, familyId: string, inviteId: string): Promise<WishlistShareInvitationDto> {
    await this.requireCurrentMember(userId, familyId);
    const invitation = await this.getOwnedInvitationOrThrow(userId, familyId, inviteId);

    if (invitation.status === "revoked") {
      return this.toShareInvitationDto(invitation);
    }

    const updated = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.update({
      where: { id: invitation.id },
      data: { status: "revoked", revokedAt: new Date() }
    }) as WishlistShareInvitationRecord;

    return this.toShareInvitationDto(updated);
  }

  async getInvitePreview(token: string): Promise<WishlistInvitePreviewDto> {
    const invitation = await this.getInvitationByTokenOrThrow(token);
    const ownerName = invitation.wishlistOwnerFamilyMember?.displayName ?? "Eier";
    const inviterName = invitation.createdByUser?.name ?? ownerName;

    return {
      id: invitation.id,
      invitedEmail: invitation.invitedEmail,
      ownerName,
      inviterName,
      status: invitation.status,
      expiresAt: invitation.expiresAt?.toISOString() ?? null,
      requiresAuth: true
    };
  }

  async acceptInvite(userId: string, token: string): Promise<WishlistShareInvitationDto> {
    const invitation = await this.getInvitationByTokenOrThrow(token);

    this.assertInviteCanBeChanged(invitation);
    await this.assertRecipientCanUseInvite(userId, invitation);

    const updated = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted", invitedUserId: userId, acceptedAt: new Date(), declinedAt: null, removedAt: null, revokedAt: null }
    }) as WishlistShareInvitationRecord;

    return this.toShareInvitationDto(updated);
  }

  async declineInvite(userId: string, token: string): Promise<WishlistShareInvitationDto> {
    const invitation = await this.getInvitationByTokenOrThrow(token);

    this.assertInviteCanBeChanged(invitation);
    await this.assertRecipientCanUseInvite(userId, invitation);

    const updated = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.update({
      where: { id: invitation.id },
      data: { status: "declined", invitedUserId: userId, declinedAt: new Date() }
    }) as WishlistShareInvitationRecord;

    return this.toShareInvitationDto(updated);
  }

  async removeSharedWishlist(userId: string, shareId: string): Promise<WishlistShareInvitationDto> {
    const invitation = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.findFirst({
      where: { id: shareId, invitedUserId: userId, status: "accepted" }
    }) as WishlistShareInvitationRecord | null;

    if (!invitation) {
      throw new NotFoundException("Shared wishlist was not found");
    }

    const updated = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.update({
      where: { id: invitation.id },
      data: { status: "removed", removedAt: new Date() }
    }) as WishlistShareInvitationRecord;

    return this.toShareInvitationDto(updated);
  }

  async listSharedWishlists(userId: string, familyId: string): Promise<SharedWishlistSummaryDto[]> {
    const membership = await this.requireCurrentMember(userId, familyId);
    const activeItems = await this.prisma.client.wishlistItem.findMany({
      where: {
        familyId,
        deletedAt: null,
        ownerFamilyMemberId: {
          not: null
        },
        NOT: {
          ownerFamilyMemberId: membership.id
        }
      },
      include: {
        ownerFamilyMember: { include: { user: { select: { avatarUrl: true } } } }
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    }) as Array<WishlistItemRecord & { ownerFamilyMember: FamilyMemberRecord | null }>;

    const summaries = new Map<string, SharedWishlistSummaryDto>();

    for (const item of activeItems) {
      const owner = item.ownerFamilyMember;

      if (!owner || owner.familyId !== familyId) {
        continue;
      }

      const existing = summaries.get(owner.id);

      if (existing) {
        existing.itemCount += 1;
        if (new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
          existing.updatedAt = item.updatedAt.toISOString();
        }
        continue;
      }

      summaries.set(owner.id, {
        ownerFamilyMemberId: owner.id,
        ownerName: owner.displayName,
        ownerAvatarUrl: owner.user?.avatarUrl ?? null,
        ownerColor: this.getOwnerColor(owner.id),
        itemCount: 1,
        updatedAt: item.updatedAt.toISOString(),
        isExternal: false
      });
    }

    const familySummaries = Array.from(summaries.values()).sort((a, b) => a.ownerName.localeCompare(b.ownerName, "nb"));
    const externalSummaries = await this.listAcceptedExternalWishlistSummaries(userId);

    return [...familySummaries, ...externalSummaries];
  }

  async listSharedWishlistItems(userId: string, familyId: string, memberId: string): Promise<SharedWishlistItemsResponseDto> {
    const membership = await this.requireCurrentMember(userId, familyId);
    const externalInvitation = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.findFirst({
      where: { id: memberId, invitedUserId: userId, status: "accepted" },
      include: { wishlistOwnerFamilyMember: true }
    }) as WishlistShareInvitationRecord | null;

    if (externalInvitation) {
      return this.listExternalWishlistItems(userId, externalInvitation);
    }

    const owner = await this.prisma.client.familyMember.findFirst({
      where: {
        id: memberId,
        familyId
      }
    }) as FamilyMemberRecord | null;

    if (!owner || owner.id === membership.id) {
      throw new NotFoundException("Shared wishlist was not found");
    }

    const items = await this.prisma.client.wishlistItem.findMany({
      where: {
        familyId,
        ownerFamilyMemberId: owner.id,
        deletedAt: null
      },
      include: {
        reservations: {
          where: { releasedAt: null },
          take: 1
        }
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }]
    }) as WishlistItemRecord[];

    return {
      ownerFamilyMemberId: owner.id,
      ownerName: owner.displayName,
      ownerAvatarUrl: owner.user?.avatarUrl ?? null,
      ownerColor: this.getOwnerColor(owner.id),
      items: items.map((item) => this.toSharedWishlistItemDto(item, userId, false)),
      isExternal: false
    };
  }

  async reserveItem(userId: string, familyId: string, itemId: string): Promise<SharedWishlistItemDto> {
    const membership = await this.requireCurrentMember(userId, familyId);
    const item = await this.getAccessibleSharedItemOrThrow(userId, familyId, membership.id, itemId);
    const activeReservation = await this.findActiveReservation(item.id);

    if (activeReservation) {
      throw new ConflictException("Dette ønsket er allerede reservert");
    }

    try {
      await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistItemReservation.create({
        data: {
          wishlistItemId: item.id,
          reservedByUserId: userId
        }
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Dette ønsket er allerede reservert");
      }

      throw error;
    }

    return this.toSharedWishlistItemDto({ ...item, reservations: [{
      id: "",
      wishlistItemId: item.id,
      reservedByUserId: userId,
      reservedAt: new Date(),
      releasedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }] }, userId, false);
  }

  async unreserveItem(userId: string, familyId: string, itemId: string): Promise<SharedWishlistItemDto> {
    const membership = await this.requireCurrentMember(userId, familyId);
    const item = await this.getAccessibleSharedItemOrThrow(userId, familyId, membership.id, itemId);
    const activeReservation = await this.findActiveReservation(item.id);

    if (!activeReservation || activeReservation.reservedByUserId !== userId) {
      throw new ForbiddenException("Du kan bare angre din egen reservasjon");
    }

    await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistItemReservation.update({
      where: { id: activeReservation.id },
      data: { releasedAt: new Date() }
    });

    return this.toSharedWishlistItemDto({ ...item, reservations: [] }, userId, false);
  }

  async createItem(userId: string, familyId: string, input: WishlistItemCreateInput = {}): Promise<WishlistItemDto> {
    const membership = await this.requireCurrentMember(userId, familyId);
    const data = this.validateCreateInput(input);

    const createdItem = await this.prisma.client.$transaction(async (transaction) => {
      const lastItem = await transaction.wishlistItem.findFirst({
        where: this.myActiveWhere(userId, familyId),
        orderBy: [{ position: "desc" }, { createdAt: "desc" }]
      });
      const nextPosition = ((lastItem as WishlistItemRecord | null)?.position ?? 0) + POSITION_STEP;

      return transaction.wishlistItem.create({
        data: {
          ...data,
          familyId,
          ownerUserId: userId,
          ownerFamilyMemberId: membership.id,
          position: nextPosition
        }
      });
    });

    return this.toWishlistItemDto(createdItem as WishlistItemRecord);
  }

  async updateItem(userId: string, familyId: string, itemId: string, input: WishlistItemUpdateInput = {}): Promise<WishlistItemDto> {
    await this.requireCurrentMember(userId, familyId);
    const item = await this.getMyActiveItemOrThrow(userId, familyId, itemId);
    const data = this.validateUpdateInput(input);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No wishlist item changes were provided");
    }

    const updatedItem = await this.prisma.client.wishlistItem.update({
      where: { id: item.id },
      data
    });

    return this.toWishlistItemDto(updatedItem as WishlistItemRecord);
  }

  async deleteItem(userId: string, familyId: string, itemId: string): Promise<WishlistItemDto> {
    await this.requireCurrentMember(userId, familyId);
    const item = await this.getMyActiveItemOrThrow(userId, familyId, itemId);
    const deletedAt = new Date();
    const deletedItem = await this.prisma.client.$transaction(async (transaction) => {
      await (transaction as unknown as PrismaClientWithWishlistReservations).wishlistItemReservation.updateMany({
        where: { wishlistItemId: item.id, releasedAt: null },
        data: { releasedAt: deletedAt }
      });

      return transaction.wishlistItem.update({
        where: { id: item.id },
        data: { deletedAt }
      });
    });

    return this.toWishlistItemDto(deletedItem as WishlistItemRecord);
  }

  async reorderItems(userId: string, familyId: string, input: WishlistReorderInput = {}): Promise<WishlistItemListResponseDto> {
    await this.requireCurrentMember(userId, familyId);
    const activeItems = await this.findActiveItems(userId, familyId);
    const orderedIds = this.resolveReorderIds(input, activeItems);

    const items = await this.prisma.client.$transaction(async (transaction) => {
      await Promise.all(
        orderedIds.map((id, index) => transaction.wishlistItem.update({
          where: { id },
          data: { position: -((index + 1) * POSITION_STEP) }
        }))
      );
      await Promise.all(
        orderedIds.map((id, index) => transaction.wishlistItem.update({
          where: { id },
          data: { position: (index + 1) * POSITION_STEP }
        }))
      );

      return transaction.wishlistItem.findMany({
        where: this.myActiveWhere(userId, familyId),
        orderBy: [{ position: "asc" }, { createdAt: "asc" }]
      });
    });

    return { items: (items as WishlistItemRecord[]).map((item) => this.toWishlistItemDto(item)) };
  }

  private async requireCurrentMember(userId: string, familyId: string): Promise<FamilyMemberRecord> {
    const membership = await this.familyAuthorization.requireFamilyMember(userId, familyId);
    return membership as FamilyMemberRecord;
  }

  private async findActiveItems(userId: string, familyId: string): Promise<WishlistItemRecord[]> {
    const items = await this.prisma.client.wishlistItem.findMany({
      where: this.myActiveWhere(userId, familyId),
      orderBy: [{ position: "asc" }, { createdAt: "asc" }]
    });

    return items as WishlistItemRecord[];
  }

  private async getMyActiveItemOrThrow(userId: string, familyId: string, itemId: string): Promise<WishlistItemRecord> {
    const item = await this.prisma.client.wishlistItem.findFirst({
      where: {
        id: itemId,
        ...this.myActiveWhere(userId, familyId)
      }
    });

    if (!item) {
      throw new NotFoundException("Wishlist item was not found");
    }

    return item as WishlistItemRecord;
  }


  private async getAccessibleSharedItemOrThrow(userId: string, familyId: string, currentMemberId: string, itemId: string): Promise<WishlistItemRecord> {
    const item = await this.prisma.client.wishlistItem.findFirst({
      where: {
        id: itemId,
        deletedAt: null
      }
    });

    if (!item) {
      throw new NotFoundException("Wishlist item was not found");
    }

    const wishlistItem = item as WishlistItemRecord;

    if (wishlistItem.ownerUserId === userId || wishlistItem.ownerFamilyMemberId === currentMemberId) {
      throw new ForbiddenException("Du kan ikke reservere egne ønsker");
    }

    if (wishlistItem.familyId === familyId) {
      return wishlistItem;
    }

    const externalAccess = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.findFirst({
      where: {
        familyId: wishlistItem.familyId,
        wishlistOwnerUserId: wishlistItem.ownerUserId,
        invitedUserId: userId,
        status: "accepted"
      }
    });

    if (!externalAccess) {
      throw new NotFoundException("Wishlist item was not found");
    }

    return wishlistItem;
  }

  private async findActiveReservation(itemId: string): Promise<WishlistItemReservationRecord | null> {
    const reservation = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistItemReservation.findFirst({
      where: {
        wishlistItemId: itemId,
        releasedAt: null
      }
    });

    return reservation as WishlistItemReservationRecord | null;
  }

  private myActiveWhere(userId: string, familyId: string) {
    return {
      familyId,
      ownerUserId: userId,
      deletedAt: null
    };
  }

  private async listAcceptedExternalWishlistSummaries(userId: string): Promise<SharedWishlistSummaryDto[]> {
    const invitations = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.findMany({
      where: { invitedUserId: userId, status: "accepted" },
      include: { wishlistOwnerFamilyMember: true },
      orderBy: [{ acceptedAt: "desc" }, { createdAt: "desc" }]
    }) as WishlistShareInvitationRecord[];
    const summaries: SharedWishlistSummaryDto[] = [];

    for (const invitation of invitations) {
      const owner = invitation.wishlistOwnerFamilyMember;
      if (!owner) continue;

      const items = await this.prisma.client.wishlistItem.findMany({
        where: { familyId: invitation.familyId, ownerUserId: invitation.wishlistOwnerUserId, deletedAt: null },
        orderBy: [{ updatedAt: "desc" }]
      }) as WishlistItemRecord[];
      const latest = items[0]?.updatedAt ?? invitation.updatedAt;

      summaries.push({
        ownerFamilyMemberId: invitation.id,
        ownerName: owner.displayName,
        ownerAvatarUrl: owner.user?.avatarUrl ?? null,
        ownerColor: this.getOwnerColor(owner.id),
        itemCount: items.length,
        updatedAt: latest.toISOString(),
        shareId: invitation.id,
        isExternal: true
      });
    }

    return summaries.sort((a, b) => a.ownerName.localeCompare(b.ownerName, "nb"));
  }

  private async listExternalWishlistItems(userId: string, invitation: WishlistShareInvitationRecord): Promise<SharedWishlistItemsResponseDto> {
    const owner = invitation.wishlistOwnerFamilyMember;
    if (!owner || invitation.wishlistOwnerUserId === userId) {
      throw new NotFoundException("Shared wishlist was not found");
    }

    const items = await this.prisma.client.wishlistItem.findMany({
      where: { familyId: invitation.familyId, ownerUserId: invitation.wishlistOwnerUserId, deletedAt: null },
      include: { reservations: { where: { releasedAt: null }, take: 1 } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }]
    }) as WishlistItemRecord[];

    return {
      ownerFamilyMemberId: invitation.id,
      ownerName: owner.displayName,
      ownerAvatarUrl: owner.user?.avatarUrl ?? null,
      ownerColor: this.getOwnerColor(owner.id),
      items: items.map((item) => this.toSharedWishlistItemDto(item, userId, false)),
      shareId: invitation.id,
      isExternal: true
    };
  }

  private async getOwnedInvitationOrThrow(userId: string, familyId: string, inviteId: string): Promise<WishlistShareInvitationRecord> {
    const invitation = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.findFirst({
      where: { id: inviteId, wishlistOwnerUserId: userId, familyId }
    }) as WishlistShareInvitationRecord | null;

    if (!invitation) {
      throw new NotFoundException("Invitation was not found");
    }

    return invitation;
  }

  private async getInvitationByTokenOrThrow(token: string): Promise<WishlistShareInvitationRecord> {
    if (typeof token !== "string" || token.trim().length < 32) {
      throw new NotFoundException("Invitation was not found");
    }

    const invitation = await (this.prisma.client as PrismaClientWithWishlistReservations).wishlistShareInvitation.findFirst({
      where: { tokenHash: this.hashToken(token.trim()) },
      include: { wishlistOwnerFamilyMember: true, createdByUser: true }
    }) as WishlistShareInvitationRecord | null;

    if (!invitation) {
      throw new NotFoundException("Invitation was not found");
    }

    return invitation;
  }

  private assertInviteCanBeChanged(invitation: WishlistShareInvitationRecord): void {
    if (invitation.status === "revoked" || invitation.status === "removed") {
      throw new ForbiddenException("Invitasjonen er ikke lenger tilgjengelig");
    }

    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException("Invitasjonen er utløpt");
    }
  }

  private async assertRecipientCanUseInvite(userId: string, invitation: WishlistShareInvitationRecord): Promise<void> {
    if (invitation.wishlistOwnerUserId === userId) {
      throw new BadRequestException("Du kan ikke invitere deg selv");
    }

    const user = await this.prisma.client.user.findUnique({ where: { id: userId } }) as UserRecord | null;
    if (!user) {
      throw new NotFoundException("User was not found");
    }

    if (invitation.invitedUserId && invitation.invitedUserId !== userId) {
      throw new ForbiddenException("Invitasjonen tilhører en annen bruker");
    }

    if (user.email.trim().toLowerCase() !== invitation.invitedEmail.trim().toLowerCase()) {
      throw new ForbiddenException("Logg inn med e-postadressen som ble invitert");
    }
  }

  private async sendWishlistInviteEmail(invitedEmail: string, token: string, inviterName: string, ownerName: string) {
    const inviteUrl = `${getAppBaseUrl()}/wishlist/invite/${encodeURIComponent(token)}`;

    return this.emailService.sendEmail({
      to: invitedEmail,
      template: "wishlist-invite",
      subject: "Du er invitert til en ønskeliste",
      data: { inviterName, ownerName, inviteUrl }
    });
  }

  private generateRawToken(): string {
    return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private validateEmail(value: unknown): string {
    const email = this.validateRequiredText(value, "E-postadresse", 320).toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException("Skriv inn en gyldig e-postadresse");
    }

    return email;
  }

  private toShareInvitationDto(invitation: WishlistShareInvitationRecord): WishlistShareInvitationDto {
    return {
      id: invitation.id,
      wishlistOwnerUserId: invitation.wishlistOwnerUserId,
      wishlistOwnerFamilyMemberId: invitation.wishlistOwnerFamilyMemberId,
      familyId: invitation.familyId,
      invitedEmail: invitation.invitedEmail,
      invitedUserId: invitation.invitedUserId,
      status: invitation.status,
      createdByUserId: invitation.createdByUserId,
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
      declinedAt: invitation.declinedAt?.toISOString() ?? null,
      removedAt: invitation.removedAt?.toISOString() ?? null,
      revokedAt: invitation.revokedAt?.toISOString() ?? null,
      expiresAt: invitation.expiresAt?.toISOString() ?? null,
      createdAt: invitation.createdAt.toISOString(),
      updatedAt: invitation.updatedAt.toISOString()
    };
  }

  private validateCreateInput(input: WishlistItemCreateInput): {
    title: string;
    description?: string | null;
    price?: number | null;
    storeOrLink?: string | null;
    imageUrl?: string | null;
    icon?: string | null;
  } {
    return {
      title: this.validateRequiredText(input.title, "Title", TITLE_MAX_LENGTH),
      description: this.validateOptionalText(input.description, "Description", DESCRIPTION_MAX_LENGTH),
      price: this.validateOptionalPrice(input.price),
      storeOrLink: this.validateOptionalText(this.pickAlias(input.storeOrLink, input.store_or_link), "Store or link", LINK_MAX_LENGTH),
      imageUrl: this.validateOptionalText(this.pickAlias(input.imageUrl, input.image_url), "Image URL", IMAGE_URL_MAX_LENGTH),
      icon: this.validateOptionalText(input.icon, "Icon", ICON_MAX_LENGTH)
    };
  }

  private validateUpdateInput(input: WishlistItemUpdateInput): Record<string, string | number | null> {
    const data: Record<string, string | number | null> = {};

    if (Object.prototype.hasOwnProperty.call(input, "title")) {
      data.title = this.validateRequiredText(input.title, "Title", TITLE_MAX_LENGTH);
    }

    if (Object.prototype.hasOwnProperty.call(input, "description")) {
      data.description = this.validateOptionalText(input.description, "Description", DESCRIPTION_MAX_LENGTH);
    }

    if (Object.prototype.hasOwnProperty.call(input, "price")) {
      data.price = this.validateOptionalPrice(input.price);
    }

    if (Object.prototype.hasOwnProperty.call(input, "storeOrLink") || Object.prototype.hasOwnProperty.call(input, "store_or_link")) {
      data.storeOrLink = this.validateOptionalText(this.pickAlias(input.storeOrLink, input.store_or_link), "Store or link", LINK_MAX_LENGTH);
    }

    if (Object.prototype.hasOwnProperty.call(input, "imageUrl") || Object.prototype.hasOwnProperty.call(input, "image_url")) {
      data.imageUrl = this.validateOptionalText(this.pickAlias(input.imageUrl, input.image_url), "Image URL", IMAGE_URL_MAX_LENGTH);
    }

    if (Object.prototype.hasOwnProperty.call(input, "icon")) {
      data.icon = this.validateOptionalText(input.icon, "Icon", ICON_MAX_LENGTH);
    }

    return data;
  }

  private resolveReorderIds(input: WishlistReorderInput, activeItems: WishlistItemRecord[]): string[] {
    const activeIds = activeItems.map((item) => item.id);
    const expectedIds = new Set(activeIds);
    let orderedIds: string[];

    if (Array.isArray(input.orderedIds)) {
      orderedIds = input.orderedIds.map((id) => this.validateId(id));
    } else if (input.positions && typeof input.positions === "object" && !Array.isArray(input.positions)) {
      orderedIds = Object.entries(input.positions as Record<string, unknown>)
        .map(([id, position]) => ({ id: this.validateId(id), position: this.validatePosition(position) }))
        .sort((a, b) => a.position - b.position)
        .map((entry) => entry.id);
    } else {
      throw new BadRequestException("Provide orderedIds or positions to reorder wishlist items");
    }

    const uniqueIds = new Set(orderedIds);

    if (orderedIds.length !== activeIds.length || uniqueIds.size !== orderedIds.length) {
      throw new BadRequestException("Reorder payload must include each active wishlist item exactly once");
    }

    for (const id of orderedIds) {
      if (!expectedIds.has(id)) {
        throw new BadRequestException("Reorder payload contains an invalid wishlist item");
      }
    }

    return orderedIds;
  }

  private validateRequiredText(value: unknown, field: string, maxLength: number): string {
    if (typeof value !== "string") {
      throw new BadRequestException(`${field} is required`);
    }

    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new BadRequestException(`${field} is required`);
    }

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(`${field} must be ${maxLength} characters or less`);
    }

    return normalizedValue;
  }

  private validateOptionalText(value: unknown, field: string, maxLength: number): string | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${field} must be a string`);
    }

    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return null;
    }

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(`${field} must be ${maxLength} characters or less`);
    }

    return normalizedValue;
  }

  private validateOptionalPrice(value: unknown): number | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      throw new BadRequestException("Price must be a positive number");
    }

    return Math.round(numericValue * 100) / 100;
  }

  private validateId(value: unknown): string {
    if (typeof value !== "string" || !value.trim()) {
      throw new BadRequestException("Wishlist item id must be a string");
    }

    return value.trim();
  }

  private validatePosition(value: unknown): number {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      throw new BadRequestException("Wishlist positions must be non-negative integers");
    }

    return value;
  }

  private pickAlias(primary: unknown, secondary: unknown): unknown {
    return primary !== undefined ? primary : secondary;
  }

  private getOwnerColor(ownerFamilyMemberId: string): string {
    const colors = ["#e7d8ff", "#d8efe4", "#f8dfbd", "#d9e9fb", "#f4d7df"];
    const colorIndex = [...ownerFamilyMemberId].reduce((total, character) => total + character.charCodeAt(0), 0) % colors.length;

    return colors[colorIndex];
  }

  private toWishlistItemDto(item: WishlistItemRecord): WishlistItemDto {
    return {
      id: item.id,
      familyId: item.familyId,
      ownerUserId: item.ownerUserId,
      ownerFamilyMemberId: item.ownerFamilyMemberId,
      title: item.title,
      description: item.description,
      price: item.price === null ? null : Number(item.price),
      storeOrLink: item.storeOrLink,
      imageUrl: item.imageUrl,
      icon: item.icon,
      position: item.position,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      deletedAt: item.deletedAt?.toISOString() ?? null
    };
  }

  private toSharedWishlistItemDto(item: WishlistItemRecord, userId: string, isOwner: boolean): SharedWishlistItemDto {
    const activeReservation = item.reservations?.find((reservation) => reservation.releasedAt === null) ?? null;

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price === null ? null : Number(item.price),
      storeOrLink: item.storeOrLink,
      imageUrl: item.imageUrl,
      icon: item.icon,
      isReserved: isOwner ? false : Boolean(activeReservation),
      reservedByMe: isOwner ? false : activeReservation?.reservedByUserId === userId
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
  }
}
