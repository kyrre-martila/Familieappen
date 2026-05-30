export interface AddShoppingItemRequestDto {
  label?: unknown;
  quantity?: unknown;
}

export interface ShoppingListItemDto {
  id: string;
  shoppingListId: string;
  label: string;
  quantity: string | null;
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
