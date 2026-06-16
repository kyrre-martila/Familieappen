import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../families";
import { PrismaService } from "../prisma";
import { AddShoppingItemRequestDto, ShoppingListDto, ShoppingListItemDto, UpdateShoppingItemRequestDto } from "./dto/shopping.dto";

const DEFAULT_SHOPPING_LIST_NAME = "Family Shopping";

type ShoppingListRecord = {
  id: string;
  familyId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type ShoppingListItemRecord = {
  id: string;
  shoppingListId: string;
  label: string;
  quantity: string | null;
  unit: string | null;
  note: string | null;
  category: string | null;
  checked: boolean;
  createdByUserId: string | null;
  checkedByUserId: string | null;
  checkedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ShoppingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService
  ) {}

  async getShoppingList(userId: string, familyId: string): Promise<ShoppingListDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const shoppingList = await this.getOrCreateFamilyShoppingList(familyId);

    return this.toShoppingListDto(shoppingList);
  }

  async addItem(userId: string, familyId: string, input: AddShoppingItemRequestDto = {}): Promise<ShoppingListItemDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const shoppingList = await this.getOrCreateFamilyShoppingList(familyId);
    const label = this.validateLabel(input.label);
    const quantity = this.validateOptionalText(input.quantity, "Shopping item quantity", 60);
    const unit = this.validateOptionalText(input.unit, "Shopping item unit", 40);
    const note = this.validateOptionalText(input.note, "Shopping item note", 240);
    const category = this.validateOptionalText(input.category, "Shopping item category", 60);

    const item = await this.prisma.client.shoppingListItem.create({
      data: {
        shoppingListId: shoppingList.id,
        label,
        quantity,
        unit,
        note,
        category,
        createdByUserId: userId
      }
    });

    return this.toShoppingListItemDto(item);
  }

  async updateItem(userId: string, familyId: string, itemId: string, input: UpdateShoppingItemRequestDto = {}): Promise<ShoppingListItemDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const item = await this.getFamilyShoppingItemOrThrow(familyId, itemId);
    const label = this.validateLabel(input.label);
    const quantity = this.validateOptionalText(input.quantity, "Shopping item quantity", 60);
    const unit = this.validateOptionalText(input.unit, "Shopping item unit", 40);
    const note = this.validateOptionalText(input.note, "Shopping item note", 240);
    const category = this.validateOptionalText(input.category, "Shopping item category", 60);

    const updatedItem = await this.prisma.client.shoppingListItem.update({
      where: { id: item.id },
      data: {
        label,
        quantity,
        unit,
        note,
        category
      }
    });

    return this.toShoppingListItemDto(updatedItem);
  }

  async toggleItem(userId: string, familyId: string, itemId: string): Promise<ShoppingListItemDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const item = await this.getFamilyShoppingItemOrThrow(familyId, itemId);
    const nextChecked = !item.checked;

    const updatedItem = await this.prisma.client.shoppingListItem.update({
      where: { id: item.id },
      data: {
        checked: nextChecked,
        checkedByUserId: nextChecked ? userId : null,
        checkedAt: nextChecked ? new Date() : null
      }
    });

    return this.toShoppingListItemDto(updatedItem);
  }

  async deleteItem(userId: string, familyId: string, itemId: string): Promise<ShoppingListItemDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const item = await this.getFamilyShoppingItemOrThrow(familyId, itemId);
    const deletedItem = await this.prisma.client.shoppingListItem.delete({
      where: { id: item.id }
    });

    return this.toShoppingListItemDto(deletedItem);
  }

  async getShoppingSummary(userId: string, familyId: string): Promise<{ uncheckedCount: number; totalItems: number }> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const shoppingList = await this.getOrCreateFamilyShoppingList(familyId);
    const [uncheckedCount, totalItems] = await Promise.all([
      this.prisma.client.shoppingListItem.count({
        where: {
          shoppingListId: shoppingList.id,
          checked: false
        }
      }),
      this.prisma.client.shoppingListItem.count({
        where: {
          shoppingListId: shoppingList.id
        }
      })
    ]);

    return { uncheckedCount, totalItems };
  }

  private async getOrCreateFamilyShoppingList(familyId: string): Promise<ShoppingListRecord & { items: ShoppingListItemRecord[] }> {
    const existingList = await this.prisma.client.shoppingList.findUnique({
      where: { familyId },
      include: {
        items: {
          orderBy: [{ checked: "asc" }, { createdAt: "asc" }]
        }
      }
    });

    if (existingList) {
      return existingList;
    }

    return this.prisma.client.shoppingList.create({
      data: {
        familyId,
        name: DEFAULT_SHOPPING_LIST_NAME
      },
      include: {
        items: {
          orderBy: [{ checked: "asc" }, { createdAt: "asc" }]
        }
      }
    });
  }

  private async getFamilyShoppingItemOrThrow(familyId: string, itemId: string): Promise<ShoppingListItemRecord> {
    const item = await this.prisma.client.shoppingListItem.findFirst({
      where: {
        id: itemId,
        shoppingList: {
          familyId
        }
      }
    });

    if (!item) {
      throw new NotFoundException("Shopping item was not found");
    }

    return item;
  }

  private validateLabel(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Shopping item label is required");
    }

    const label = value.trim();

    if (label.length < 1 || label.length > 120) {
      throw new BadRequestException("Shopping item label must be between 1 and 120 characters");
    }

    return label;
  }

  private validateOptionalText(value: unknown, fieldName: string, maxLength: number): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${fieldName} must be text`);
    }

    const text = value.trim();

    if (text.length > maxLength) {
      throw new BadRequestException(`${fieldName} must be ${maxLength} characters or fewer`);
    }

    return text.length === 0 ? null : text;
  }

  private toShoppingListDto(shoppingList: ShoppingListRecord & { items: ShoppingListItemRecord[] }): ShoppingListDto {
    return {
      id: shoppingList.id,
      familyId: shoppingList.familyId,
      name: shoppingList.name,
      createdAt: shoppingList.createdAt.toISOString(),
      updatedAt: shoppingList.updatedAt.toISOString(),
      items: shoppingList.items.map((item) => this.toShoppingListItemDto(item))
    };
  }

  private toShoppingListItemDto(item: ShoppingListItemRecord): ShoppingListItemDto {
    return {
      id: item.id,
      shoppingListId: item.shoppingListId,
      label: item.label,
      quantity: item.quantity,
      unit: item.unit,
      note: item.note,
      category: item.category,
      checked: item.checked,
      createdByUserId: item.createdByUserId,
      checkedByUserId: item.checkedByUserId,
      checkedAt: item.checkedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }
}
