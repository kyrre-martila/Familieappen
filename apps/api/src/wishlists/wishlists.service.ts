import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../families";
import { PrismaService } from "../prisma";
import { SharedWishlistItemDto, SharedWishlistItemsResponseDto, SharedWishlistSummaryDto, WishlistItemCreateInput, WishlistItemDto, WishlistItemListResponseDto, WishlistItemUpdateInput, WishlistReorderInput } from "./dto/wishlist.dto";

const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 1000;
const LINK_MAX_LENGTH = 2048;
const IMAGE_URL_MAX_LENGTH = 2048;
const ICON_MAX_LENGTH = 80;
const POSITION_STEP = 1000;

type FamilyMemberRecord = {
  id: string;
  userId: string | null;
  familyId: string;
  displayName: string;
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
    findFirst(input: unknown): Promise<unknown>;
  };
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
    private readonly familyAuthorization: FamilyAuthorizationService
  ) {}

  async listMyItems(userId: string, familyId: string): Promise<WishlistItemListResponseDto> {
    await this.requireCurrentMember(userId, familyId);
    const items = await this.findActiveItems(userId, familyId);

    return { items: items.map((item) => this.toWishlistItemDto(item)) };
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
        ownerFamilyMember: true
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
        ownerAvatarUrl: null,
        ownerColor: this.getOwnerColor(owner.id),
        itemCount: 1,
        updatedAt: item.updatedAt.toISOString()
      });
    }

    return Array.from(summaries.values()).sort((a, b) => a.ownerName.localeCompare(b.ownerName, "nb"));
  }

  async listSharedWishlistItems(userId: string, familyId: string, memberId: string): Promise<SharedWishlistItemsResponseDto> {
    const membership = await this.requireCurrentMember(userId, familyId);
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
      ownerAvatarUrl: null,
      ownerColor: this.getOwnerColor(owner.id),
      items: items.map((item) => this.toSharedWishlistItemDto(item, userId, false))
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
    const deletedItem = await this.prisma.client.wishlistItem.update({
      where: { id: item.id },
      data: { deletedAt: new Date() }
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
        familyId,
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
