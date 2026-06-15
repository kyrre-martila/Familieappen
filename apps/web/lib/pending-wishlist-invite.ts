const PENDING_WISHLIST_INVITE_KEY = "familieappen:wishlist:pending-invite-token";

export function savePendingWishlistInvite(token: string): void {
  const normalizedToken = token.trim();

  if (!normalizedToken || typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_WISHLIST_INVITE_KEY, normalizedToken);
}

export function getPendingWishlistInvite(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(PENDING_WISHLIST_INVITE_KEY)?.trim();

  return token || null;
}

export function clearPendingWishlistInvite(token?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const currentToken = getPendingWishlistInvite();

  if (!token || currentToken === token) {
    window.localStorage.removeItem(PENDING_WISHLIST_INVITE_KEY);
  }
}
