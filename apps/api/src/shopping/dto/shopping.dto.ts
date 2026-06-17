export interface AddShoppingItemRequestDto {
  label?: unknown;
  quantity?: unknown;
  unit?: unknown;
  note?: unknown;
  category?: unknown;
}

export interface UpdateShoppingItemRequestDto extends AddShoppingItemRequestDto {}

export interface ShoppingListItemDto {
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
  checkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListDto {
  id: string;
  familyId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: ShoppingListItemDto[];
}

export interface ShoppingCatalogCategoryDto {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  totalItemCount: number;
}

export interface ShoppingCatalogItemDto {
  id: string;
  name: string;
  categorySlug: string;
  aliases: string[];
  defaultUnit: string;
  suggestedQuantity: number;
}
