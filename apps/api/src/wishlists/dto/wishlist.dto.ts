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

export interface WishlistShareInviteInput {
  email?: unknown;
  invitedEmail?: unknown;
  invited_email?: unknown;
}

export type WishlistShareInvitationStatus = "pending" | "accepted" | "declined" | "removed" | "revoked";

export interface WishlistShareInvitationDto {
  id: string;
  wishlistOwnerUserId: string;
  wishlistOwnerFamilyMemberId: string | null;
  familyId: string;
  invitedEmail: string;
  invitedUserId: string | null;
  status: WishlistShareInvitationStatus;
  createdByUserId: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  removedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistInvitePreviewDto {
  id: string;
  invitedEmail: string;
  ownerName: string;
  inviterName: string;
  status: WishlistShareInvitationStatus;
  expiresAt: string | null;
  requiresAuth: true;
}

export interface WishlistShareInviteResponseDto {
  invitation: WishlistShareInvitationDto;
  email: {
    ok: boolean;
    mode: "provider" | "dev-log";
  };
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
  isReserved?: boolean;
  reservedByMe?: boolean;
}

export interface SharedWishlistItemDto {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  storeOrLink: string | null;
  imageUrl: string | null;
  icon: string | null;
  isReserved: boolean;
  reservedByMe: boolean;
}

export interface WishlistItemListResponseDto {
  items: WishlistItemDto[];
}

export interface SharedWishlistSummaryDto {
  ownerFamilyMemberId: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  ownerColor: string;
  itemCount: number;
  updatedAt: string;
  shareId?: string;
  isExternal?: boolean;
}

export interface SharedWishlistItemsResponseDto {
  ownerFamilyMemberId: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  ownerColor: string;
  items: SharedWishlistItemDto[];
  shareId?: string;
  isExternal?: boolean;
}
