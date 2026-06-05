export interface WishlistItemCreateInput {
  title?: unknown;
  description?: unknown;
  price?: unknown;
  storeOrLink?: unknown;
  store_or_link?: unknown;
  imageUrl?: unknown;
  image_url?: unknown;
  icon?: unknown;
}

export interface WishlistItemUpdateInput {
  title?: unknown;
  description?: unknown;
  price?: unknown;
  storeOrLink?: unknown;
  store_or_link?: unknown;
  imageUrl?: unknown;
  image_url?: unknown;
  icon?: unknown;
}

export interface WishlistReorderInput {
  orderedIds?: unknown;
  positions?: unknown;
}

export interface WishlistItemDto {
  id: string;
  familyId: string;
  ownerUserId: string;
  ownerFamilyMemberId: string | null;
  title: string;
  description: string | null;
  price: number | null;
  storeOrLink: string | null;
  imageUrl: string | null;
  icon: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WishlistItemListResponseDto {
  items: WishlistItemDto[];
}
