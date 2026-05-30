export interface CreateWishlistRequestDto {
  ownerFamilyMemberId?: unknown;
  title?: unknown;
  description?: unknown;
}

export interface AddWishlistItemRequestDto {
  title?: unknown;
  description?: unknown;
  productUrl?: unknown;
  imageUrl?: unknown;
  estimatedPrice?: unknown;
}

export interface UpdateWishlistItemRequestDto {
  title?: unknown;
  description?: unknown;
  productUrl?: unknown;
  imageUrl?: unknown;
  estimatedPrice?: unknown;
  purchased?: unknown;
}

export interface ReserveWishlistItemRequestDto {
  reservedByName?: unknown;
}

export interface WishlistItemDto {
  id: string;
  wishlistId: string;
  title: string;
  description: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  estimatedPrice: string | null;
  purchased: boolean;
  unavailable: boolean;
  reserved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistDto {
  id: string;
  familyId: string;
  ownerFamilyMemberId: string;
  title: string;
  description: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  items: WishlistItemDto[];
}

export interface WishlistSummaryDto {
  id: string;
  ownerFamilyMemberId: string;
  title: string;
  description: string | null;
  itemCount: number;
  unavailableCount: number;
  updatedAt: string;
}

export interface WishlistShareDto {
  token: string;
  shareUrl: string;
  expiresAt: string | null;
}

export interface PublicWishlistItemDto {
  id: string;
  title: string;
  description: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  estimatedPrice: string | null;
  purchased: boolean;
  unavailable: boolean;
  reserved: boolean;
}

export interface PublicWishlistDto {
  id: string;
  title: string;
  description: string | null;
  items: PublicWishlistItemDto[];
}
