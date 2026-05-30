import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { FamilyAuthorizationService } from "../families";
import { PrismaService } from "../prisma";
import {
  AddWishlistItemRequestDto,
  CreateWishlistRequestDto,
  PublicWishlistDto,
  PublicWishlistItemDto,
  ReserveWishlistItemRequestDto,
  UpdateWishlistItemRequestDto,
  WishlistDto,
  WishlistItemDto,
  WishlistShareDto,
  WishlistSummaryDto
} from "./dto/wishlist.dto";

type WishlistReservationRecord = {
  id: string;
  wishlistItemId: string;
  reservedByUserId: string | null;
  reservedByName: string | null;
  purchased: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type WishlistItemRecord = {
  id: string;
  wishlistId: string;
  title: string;
  description: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  estimatedPrice: string | null;
  purchased: boolean;
  createdAt: Date;
  updatedAt: Date;
  reservations: WishlistReservationRecord[];
};

type WishlistRecord = {
  id: string;
  familyId: string;
  ownerFamilyMemberId: string;
  title: string;
  description: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: WishlistItemRecord[];
};

@Injectable()
export class WishlistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService
  ) {}

  async listWishlists(userId: string, familyId: string): Promise<WishlistSummaryDto[]> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);

    const wishlists = await this.prisma.client.wishlist.findMany({
      where: { familyId },
      include: { items: { include: { reservations: true } } },
      orderBy: { updatedAt: "desc" }
    });

    return wishlists.map((wishlist: WishlistRecord) => this.toWishlistSummaryDto(wishlist));
  }

  async createWishlist(userId: string, familyId: string, input: CreateWishlistRequestDto = {}): Promise<WishlistDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const ownerFamilyMemberId = this.validateRequiredText(input.ownerFamilyMemberId, "Wishlist owner is required", 120);
    await this.requireFamilyMemberRecord(familyId, ownerFamilyMemberId);

    const wishlist = await this.prisma.client.wishlist.create({
      data: {
        familyId,
        ownerFamilyMemberId,
        title: this.validateRequiredText(input.title, "Wishlist title is required", 120),
        description: this.validateOptionalText(input.description, "Wishlist description", 500),
        createdByUserId: userId
      },
      include: this.wishlistInclude()
    });

    return this.toWishlistDto(wishlist);
  }

  async getWishlist(userId: string, familyId: string, wishlistId: string): Promise<WishlistDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const wishlist = await this.getFamilyWishlistOrThrow(familyId, wishlistId);

    return this.toWishlistDto(wishlist);
  }

  async addItem(userId: string, familyId: string, wishlistId: string, input: AddWishlistItemRequestDto = {}): Promise<WishlistItemDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const wishlist = await this.getFamilyWishlistOrThrow(familyId, wishlistId);

    const item = await this.prisma.client.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        title: this.validateRequiredText(input.title, "Wishlist item title is required", 140),
        description: this.validateOptionalText(input.description, "Wishlist item description", 700),
        productUrl: this.validateOptionalUrl(input.productUrl, "Product URL"),
        imageUrl: this.validateOptionalUrl(input.imageUrl, "Image URL"),
        estimatedPrice: this.validateOptionalText(input.estimatedPrice, "Estimated price", 80)
      },
      include: { reservations: true }
    });

    return this.toWishlistItemDto(item);
  }

  async updateItem(userId: string, familyId: string, itemId: string, input: UpdateWishlistItemRequestDto = {}): Promise<WishlistItemDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const item = await this.getFamilyWishlistItemOrThrow(familyId, itemId);
    const data: Record<string, unknown> = {};

    if (input.title !== undefined) {
      data.title = this.validateRequiredText(input.title, "Wishlist item title is required", 140);
    }

    if (input.description !== undefined) {
      data.description = this.validateOptionalText(input.description, "Wishlist item description", 700);
    }

    if (input.productUrl !== undefined) {
      data.productUrl = this.validateOptionalUrl(input.productUrl, "Product URL");
    }

    if (input.imageUrl !== undefined) {
      data.imageUrl = this.validateOptionalUrl(input.imageUrl, "Image URL");
    }

    if (input.estimatedPrice !== undefined) {
      data.estimatedPrice = this.validateOptionalText(input.estimatedPrice, "Estimated price", 80);
    }

    if (input.purchased !== undefined) {
      if (typeof input.purchased !== "boolean") {
        throw new BadRequestException("Purchased must be true or false");
      }

      data.purchased = input.purchased;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No wishlist item changes were provided");
    }

    const updatedItem = await this.prisma.client.wishlistItem.update({
      where: { id: item.id },
      data,
      include: { reservations: true }
    });

    return this.toWishlistItemDto(updatedItem);
  }

  async deleteItem(userId: string, familyId: string, itemId: string): Promise<WishlistItemDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const item = await this.getFamilyWishlistItemOrThrow(familyId, itemId);
    const deletedItem = await this.prisma.client.wishlistItem.delete({
      where: { id: item.id },
      include: { reservations: true }
    });

    return this.toWishlistItemDto(deletedItem);
  }

  async reserveItem(userId: string | null, familyId: string | null, itemId: string, input: ReserveWishlistItemRequestDto = {}): Promise<WishlistItemDto> {
    const item = familyId ? await this.getFamilyWishlistItemOrThrow(familyId, itemId) : await this.getWishlistItemOrThrow(itemId);

    if (familyId && userId) {
      await this.familyAuthorization.requireFamilyMember(userId, familyId);
    }

    if (item.purchased || item.reservations.length > 0) {
      throw new BadRequestException("Wishlist item is already unavailable");
    }

    await this.prisma.client.wishlistReservation.create({
      data: {
        wishlistItemId: item.id,
        reservedByUserId: userId,
        reservedByName: this.validateOptionalText(input.reservedByName, "Reserved by name", 120)
      }
    });

    const updatedItem = await this.getWishlistItemOrThrow(item.id);
    return this.toWishlistItemDto(updatedItem);
  }

  async markPurchased(userId: string | null, familyId: string | null, itemId: string, input: ReserveWishlistItemRequestDto = {}): Promise<WishlistItemDto> {
    const item = familyId ? await this.getFamilyWishlistItemOrThrow(familyId, itemId) : await this.getWishlistItemOrThrow(itemId);

    if (familyId && userId) {
      await this.familyAuthorization.requireFamilyMember(userId, familyId);
    }

    const reservation = item.reservations[0];

    if (reservation) {
      await this.prisma.client.wishlistReservation.update({
        where: { id: reservation.id },
        data: {
          purchased: true,
          reservedByUserId: reservation.reservedByUserId ?? userId,
          reservedByName: reservation.reservedByName ?? this.validateOptionalText(input.reservedByName, "Reserved by name", 120)
        }
      });
    } else {
      await this.prisma.client.wishlistReservation.create({
        data: {
          wishlistItemId: item.id,
          reservedByUserId: userId,
          reservedByName: this.validateOptionalText(input.reservedByName, "Reserved by name", 120),
          purchased: true
        }
      });
    }

    const updatedItem = await this.prisma.client.wishlistItem.update({
      where: { id: item.id },
      data: { purchased: true },
      include: { reservations: true }
    });

    return this.toWishlistItemDto(updatedItem);
  }

  async createShare(userId: string, familyId: string, wishlistId: string): Promise<WishlistShareDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const wishlist = await this.getFamilyWishlistOrThrow(familyId, wishlistId);
    const share = await this.prisma.client.wishlistShare.create({
      data: {
        wishlistId: wishlist.id,
        token: this.createToken()
      }
    });

    return {
      token: share.token,
      shareUrl: `/shared/wishlist/${share.token}`,
      expiresAt: share.expiresAt?.toISOString() ?? null
    };
  }

  async getPublicWishlist(token: string): Promise<PublicWishlistDto> {
    const share = await this.getActiveShareOrThrow(token);

    return this.toPublicWishlistDto(share.wishlist);
  }

  async reservePublicItem(token: string, itemId: string, input: ReserveWishlistItemRequestDto = {}): Promise<PublicWishlistItemDto> {
    const share = await this.getActiveShareOrThrow(token);
    this.requireItemInWishlist(share.wishlist.id, itemId, share.wishlist);

    return this.toPublicWishlistItemDto(await this.reserveItem(null, null, itemId, input));
  }

  async markPublicItemPurchased(token: string, itemId: string, input: ReserveWishlistItemRequestDto = {}): Promise<PublicWishlistItemDto> {
    const share = await this.getActiveShareOrThrow(token);
    this.requireItemInWishlist(share.wishlist.id, itemId, share.wishlist);

    return this.toPublicWishlistItemDto(await this.markPurchased(null, null, itemId, input));
  }

  async getDashboardSummary(familyId: string): Promise<{ wishlistCount: number; unavailableItemCount: number; recentlyUpdated: WishlistSummaryDto[] }> {
    const wishlists = await this.prisma.client.wishlist.findMany({
      where: { familyId },
      include: { items: { include: { reservations: true } } },
      orderBy: { updatedAt: "desc" },
      take: 3
    });
    const wishlistCount = await this.prisma.client.wishlist.count({ where: { familyId } });
    const unavailableItemCount = wishlists.reduce((count: number, wishlist: WishlistRecord) => {
      return count + wishlist.items.filter((item) => this.isUnavailable(item)).length;
    }, 0);

    return {
      wishlistCount,
      unavailableItemCount,
      recentlyUpdated: wishlists.map((wishlist: WishlistRecord) => this.toWishlistSummaryDto(wishlist))
    };
  }

  private async requireFamilyMemberRecord(familyId: string, memberId: string): Promise<void> {
    const member = await this.prisma.client.familyMember.findFirst({ where: { id: memberId, familyId } });

    if (!member) {
      throw new NotFoundException("Wishlist owner was not found");
    }
  }

  private async getFamilyWishlistOrThrow(familyId: string, wishlistId: string): Promise<WishlistRecord> {
    const wishlist = await this.prisma.client.wishlist.findFirst({
      where: { id: wishlistId, familyId },
      include: this.wishlistInclude()
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist was not found");
    }

    return wishlist;
  }

  private async getFamilyWishlistItemOrThrow(familyId: string, itemId: string): Promise<WishlistItemRecord> {
    const item = await this.prisma.client.wishlistItem.findFirst({
      where: { id: itemId, wishlist: { familyId } },
      include: { reservations: { orderBy: { createdAt: "asc" } } }
    });

    if (!item) {
      throw new NotFoundException("Wishlist item was not found");
    }

    return item;
  }

  private async getWishlistItemOrThrow(itemId: string): Promise<WishlistItemRecord> {
    const item = await this.prisma.client.wishlistItem.findUnique({
      where: { id: itemId },
      include: { reservations: { orderBy: { createdAt: "asc" } } }
    });

    if (!item) {
      throw new NotFoundException("Wishlist item was not found");
    }

    return item;
  }

  private async getActiveShareOrThrow(token: string): Promise<{ wishlist: WishlistRecord }> {
    if (!/^[A-Za-z0-9_-]{32,}$/.test(token)) {
      throw new NotFoundException("Shared wishlist was not found");
    }

    const share = await this.prisma.client.wishlistShare.findUnique({
      where: { token },
      include: { wishlist: { include: this.wishlistInclude() } }
    });

    if (!share || (share.expiresAt && share.expiresAt < new Date())) {
      throw new NotFoundException("Shared wishlist was not found");
    }

    return share;
  }

  private requireItemInWishlist(wishlistId: string, itemId: string, wishlist?: WishlistRecord): void {
    const belongsToShare = wishlist?.items.some((item) => item.id === itemId) ?? false;

    if (!itemId || !wishlistId || !belongsToShare) {
      throw new NotFoundException("Wishlist item was not found");
    }
  }

  private wishlistInclude() {
    return {
      items: {
        include: { reservations: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "asc" }
      }
    };
  }

  private createToken(): string {
    return randomBytes(32).toString("base64url");
  }

  private validateRequiredText(value: unknown, message: string, maxLength: number): string {
    if (typeof value !== "string") {
      throw new BadRequestException(message);
    }

    const text = value.trim();

    if (text.length < 1 || text.length > maxLength) {
      throw new BadRequestException(`${message.replace(" is required", "")} must be between 1 and ${maxLength} characters`);
    }

    return text;
  }

  private validateOptionalText(value: unknown, label: string, maxLength: number): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${label} must be text`);
    }

    const text = value.trim();

    if (text.length > maxLength) {
      throw new BadRequestException(`${label} must be ${maxLength} characters or fewer`);
    }

    return text.length ? text : null;
  }

  private validateOptionalUrl(value: unknown, label: string): string | null {
    const text = this.validateOptionalText(value, label, 500);

    if (!text) {
      return null;
    }

    try {
      const url = new URL(text);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Unsupported URL protocol");
      }

      return url.toString();
    } catch {
      throw new BadRequestException(`${label} must be a valid http or https URL`);
    }
  }

  private isUnavailable(item: WishlistItemRecord): boolean {
    return item.purchased || item.reservations.length > 0;
  }

  private toWishlistSummaryDto(wishlist: WishlistRecord): WishlistSummaryDto {
    const unavailableCount = wishlist.items.filter((item) => this.isUnavailable(item)).length;

    return {
      id: wishlist.id,
      ownerFamilyMemberId: wishlist.ownerFamilyMemberId,
      title: wishlist.title,
      description: wishlist.description,
      itemCount: wishlist.items.length,
      unavailableCount,
      updatedAt: wishlist.updatedAt.toISOString()
    };
  }

  private toWishlistDto(wishlist: WishlistRecord): WishlistDto {
    return {
      id: wishlist.id,
      familyId: wishlist.familyId,
      ownerFamilyMemberId: wishlist.ownerFamilyMemberId,
      title: wishlist.title,
      description: wishlist.description,
      createdByUserId: wishlist.createdByUserId,
      createdAt: wishlist.createdAt.toISOString(),
      updatedAt: wishlist.updatedAt.toISOString(),
      items: wishlist.items.map((item) => this.toWishlistItemDto(item))
    };
  }

  private toWishlistItemDto(item: WishlistItemRecord): WishlistItemDto {
    const reserved = item.reservations.length > 0;

    return {
      id: item.id,
      wishlistId: item.wishlistId,
      title: item.title,
      description: item.description,
      productUrl: item.productUrl,
      imageUrl: item.imageUrl,
      estimatedPrice: item.estimatedPrice,
      purchased: item.purchased || item.reservations.some((reservation) => reservation.purchased),
      unavailable: this.isUnavailable(item),
      reserved,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private toPublicWishlistItemDto(item: WishlistItemDto): PublicWishlistItemDto {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      productUrl: item.productUrl,
      imageUrl: item.imageUrl,
      estimatedPrice: item.estimatedPrice,
      purchased: item.purchased,
      unavailable: item.unavailable,
      reserved: item.reserved
    };
  }

  private toPublicWishlistDto(wishlist: WishlistRecord): PublicWishlistDto {
    return {
      id: wishlist.id,
      title: wishlist.title,
      description: wishlist.description,
      items: wishlist.items.map((item) => {
        const dto = this.toWishlistItemDto(item);

        return this.toPublicWishlistItemDto(dto);
      })
    };
  }
}
