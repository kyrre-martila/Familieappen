export interface AddShoppingItemRequestDto { label?: unknown; quantity?: unknown; unit?: unknown; note?: unknown; category?: unknown; }
export interface UpdateShoppingItemRequestDto extends AddShoppingItemRequestDto {}
export interface CreateShoppingListRequestDto { name?: unknown; }
export interface ShoppingListInviteRequestDto { email?: unknown; invitedEmail?: unknown; invited_email?: unknown; }
export type ShoppingListInvitationStatusDto = "pending" | "accepted" | "declined" | "revoked";
export interface ShoppingListInvitationDto { id: string; shoppingListId: string; invitedEmail: string; invitedUserId: string | null; status: ShoppingListInvitationStatusDto; acceptedAt: string | null; createdAt: string; updatedAt: string; }
export interface ShoppingListInviteResponseDto { invitation: ShoppingListInvitationDto; email: { ok: boolean; mode: "provider" | "dev-log" }; }
export interface ShoppingListInvitePreviewDto { id: string; shoppingListId: string; listName: string; invitedEmail: string; inviterName: string; status: ShoppingListInvitationStatusDto; requiresAuth: true; }
export interface ShoppingListSummaryDto { id: string; familyId: string; name: string; isDefault: boolean; ownerUserId: string | null; createdAt: string; updatedAt: string; invitations?: ShoppingListInvitationDto[]; }
export interface ShoppingListItemDto { id: string; shoppingListId: string; label: string; quantity: string | null; unit: string | null; note: string | null; category: string | null; checked: boolean; createdByUserId: string | null; checkedByUserId: string | null; checkedAt: string | null; createdAt: string; updatedAt: string; }
export interface ShoppingListDto extends ShoppingListSummaryDto { items: ShoppingListItemDto[]; }
export interface ShoppingCatalogCategoryDto { id: string; name: string; slug: string; sortOrder: number; totalItemCount: number; }
export interface ShoppingCatalogItemDto { id: string; name: string; categorySlug: string; aliases: string[]; defaultUnit: string; suggestedQuantity: number; }
