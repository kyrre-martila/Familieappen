import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../families";
import { PrismaService } from "../prisma";
import { WishlistItemCreateInput, WishlistItemDto, WishlistItemListResponseDto, WishlistItemUpdateInput, WishlistReorderInput } from "./dto/wishlist.dto";

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
}
