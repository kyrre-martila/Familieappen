"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getSharedWishlistItems,
  getSharedWishlistSummaries,
  type SharedWishlistItemsResponse,
  type SharedWishlistSummary,
  type WishlistItem,
} from "../../../lib/api";
import { getUserFacingApiMessage } from "../../../lib/auth-family";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";

function sortWishlistItems(items: WishlistItem[]) {
  return [...items].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function useSharedWishlists() {
  const { family, loading: familyLoading, error: familyError } = useFamilyMembers();
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

  const status = familyLoading || loading ? "loading" as const : error || familyError ? "error" as const : "ready" as const;

  return useMemo(() => ({
    sharedWishlistSummaries,
    getSharedWishlistItems: getSharedWishlistItemsForMember,
    itemsByMemberId,
    loading: familyLoading || loading,
    loadingItemsForMemberId,
    error: familyError ?? error,
    status,
    refresh,
  }), [error, familyError, familyLoading, getSharedWishlistItemsForMember, itemsByMemberId, loading, loadingItemsForMemberId, refresh, sharedWishlistSummaries, status]);
}
