"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getSharedWishlistItems,
  getSharedWishlistSummaries,
  reserveWishlistItem,
  unreserveWishlistItem,
  type SharedWishlistItemsResponse,
  type SharedWishlistSummary,
  type SharedWishlistItem,
} from "../../../lib/api";
import { getUserFacingApiMessage } from "../../../lib/auth-family";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";

function sortWishlistItems(items: SharedWishlistItem[]) {
  return [...items];
}

export function useSharedWishlists() {
  const { family, currentUserMember, loading: familyLoading, error: familyError } = useFamilyMembers();
  const [sharedWishlistSummaries, setSharedWishlistSummaries] = useState<SharedWishlistSummary[]>([]);
  const [itemsByMemberId, setItemsByMemberId] = useState<Record<string, SharedWishlistItemsResponse>>({});
  const [loading, setLoading] = useState(true);
  const [loadingItemsForMemberId, setLoadingItemsForMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeFamilyId = family?.id ?? null;

  const refresh = useCallback(async () => {
    if (!activeFamilyId) {
      setSharedWishlistSummaries([]);
      setLoading(familyLoading);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setSharedWishlistSummaries(await getSharedWishlistSummaries(activeFamilyId));
    } catch (refreshError) {
      setError(getUserFacingApiMessage(refreshError, "Kunne ikke hente delte ønskelister akkurat nå"));
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, familyLoading]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (familyError) {
      setError(familyError);
    }
  }, [familyError]);

  const getSharedWishlistItemsForMember = useCallback(async (memberId: string) => {
    if (!activeFamilyId) {
      throw new Error("Velg en familie før du fortsetter.");
    }

    const cachedWishlist = itemsByMemberId[memberId];

    if (cachedWishlist) {
      return cachedWishlist;
    }

    setLoadingItemsForMemberId(memberId);
    setError(null);

    try {
      const response = await getSharedWishlistItems(activeFamilyId, memberId);
      const sortedResponse = { ...response, items: sortWishlistItems(response.items) };
      setItemsByMemberId((currentItems) => ({ ...currentItems, [memberId]: sortedResponse }));
      return sortedResponse;
    } catch (itemsError) {
      setError(getUserFacingApiMessage(itemsError, "Kunne ikke hente ønskelisten akkurat nå"));
      throw itemsError;
    } finally {
      setLoadingItemsForMemberId(null);
    }
  }, [activeFamilyId, itemsByMemberId]);


  const replaceWishlistItem = useCallback((memberId: string, item: SharedWishlistItem) => {
    setItemsByMemberId((currentItems) => {
      const wishlist = currentItems[memberId];

      if (!wishlist) {
        return currentItems;
      }

      return {
        ...currentItems,
        [memberId]: {
          ...wishlist,
          items: sortWishlistItems(wishlist.items.map((currentItem) => currentItem.id === item.id ? { ...currentItem, ...item } : currentItem))
        }
      };
    });
  }, []);

  const reserveSharedWishlistItem = useCallback(async (memberId: string, itemId: string) => {
    if (!activeFamilyId) {
      throw new Error("Velg en familie før du fortsetter.");
    }

    const item = await reserveWishlistItem(activeFamilyId, itemId);
    replaceWishlistItem(memberId, item);
    return item;
  }, [activeFamilyId, replaceWishlistItem]);

  const unreserveSharedWishlistItem = useCallback(async (memberId: string, itemId: string) => {
    if (!activeFamilyId) {
      throw new Error("Velg en familie før du fortsetter.");
    }

    const item = await unreserveWishlistItem(activeFamilyId, itemId);
    replaceWishlistItem(memberId, item);
    return item;
  }, [activeFamilyId, replaceWishlistItem]);

  const status = familyLoading || loading ? "loading" as const : error || familyError ? "error" as const : "ready" as const;

  return useMemo(() => ({
    sharedWishlistSummaries,
    getSharedWishlistItems: getSharedWishlistItemsForMember,
    reserveSharedWishlistItem,
    unreserveSharedWishlistItem,
    itemsByMemberId,
    loading: familyLoading || loading,
    loadingItemsForMemberId,
    error: familyError ?? error,
    status,
    refresh,
    activeFamilyId,
    currentUserMember,
  }), [activeFamilyId, currentUserMember, error, familyError, familyLoading, getSharedWishlistItemsForMember, itemsByMemberId, loading, loadingItemsForMemberId, refresh, reserveSharedWishlistItem, sharedWishlistSummaries, status, unreserveSharedWishlistItem]);
}
