"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createWishlistItem,
  deleteMyWishlistItem,
  getMyWishlistItems,
  updateMyWishlistItem,
  type WishlistItem,
} from "../../../lib/api";
import { getUserFacingApiMessage } from "../../../lib/auth-family";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";

export type WishlistStatus = "loading" | "ready" | "error";

export type WishlistItemInput = {
  title: string;
  description?: string | null;
  price?: number | null;
  storeOrLink?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
};

function sortWishlistItems(items: WishlistItem[]) {
  return [...items].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function createOptimisticWishlistItem(input: WishlistItemInput, familyId: string, ownerFamilyMemberId: string | null): WishlistItem {
  const now = new Date().toISOString();

  return {
    id: `optimistic-wishlist-${Date.now()}`,
    familyId,
    ownerUserId: "optimistic",
    ownerFamilyMemberId,
    title: input.title.trim(),
    description: input.description ?? null,
    price: input.price ?? null,
    storeOrLink: input.storeOrLink ?? null,
    imageUrl: input.imageUrl ?? null,
    icon: input.icon ?? null,
    position: Date.now(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function useWishlist() {
  const { family, currentUserMember, loading: familyLoading, error: familyError } = useFamilyMembers();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeFamilyId = family?.id ?? null;

  const refresh = useCallback(async () => {
    if (!activeFamilyId) {
      setItems([]);
      setLoading(familyLoading);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getMyWishlistItems(activeFamilyId);
      setItems(sortWishlistItems(response.items));
    } catch (refreshError) {
      setError(getUserFacingApiMessage(refreshError, "Kunne ikke hente ønskelisten akkurat nå"));
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

  const createItem = useCallback(async (input: WishlistItemInput) => {
    if (!activeFamilyId) {
      throw new Error("Velg en familie før du fortsetter.");
    }

    const optimisticItem = createOptimisticWishlistItem(input, activeFamilyId, currentUserMember?.id ?? null);
    const previousItems = items;

    setError(null);
    setItems((currentItems) => sortWishlistItems([...currentItems, optimisticItem]));

    try {
      const savedItem = await createWishlistItem(activeFamilyId, input);
      setItems((currentItems) => sortWishlistItems(currentItems.map((item) => (item.id === optimisticItem.id ? savedItem : item))));
      return savedItem;
    } catch (createError) {
      setItems(previousItems);
      setError(getUserFacingApiMessage(createError, "Kunne ikke lagre ønsket akkurat nå"));
      throw createError;
    }
  }, [activeFamilyId, currentUserMember?.id, items]);

  const updateItem = useCallback(async (itemId: string, input: Partial<WishlistItemInput>) => {
    if (!activeFamilyId) {
      throw new Error("Velg en familie før du fortsetter.");
    }

    const previousItems = items;
    setError(null);
    setItems((currentItems) => currentItems.map((item) => (item.id === itemId ? { ...item, ...input, updatedAt: new Date().toISOString() } : item)));

    try {
      const savedItem = await updateMyWishlistItem(activeFamilyId, itemId, input);
      setItems((currentItems) => sortWishlistItems(currentItems.map((item) => (item.id === itemId ? savedItem : item))));
      return savedItem;
    } catch (updateError) {
      setItems(previousItems);
      setError(getUserFacingApiMessage(updateError, "Kunne ikke oppdatere ønsket akkurat nå"));
      throw updateError;
    }
  }, [activeFamilyId, items]);

  const deleteItem = useCallback(async (itemId: string) => {
    if (!activeFamilyId) {
      throw new Error("Velg en familie før du fortsetter.");
    }

    const previousItems = items;
    setError(null);
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));

    try {
      return await deleteMyWishlistItem(activeFamilyId, itemId);
    } catch (deleteError) {
      setItems(previousItems);
      setError(getUserFacingApiMessage(deleteError, "Kunne ikke slette ønsket akkurat nå"));
      throw deleteError;
    }
  }, [activeFamilyId, items]);

  const visibleItems = useMemo(() => items.filter((item) => !item.deletedAt), [items]);

  return {
    items: visibleItems,
    loading: familyLoading || loading,
    error: familyError ?? error,
    status: familyLoading || loading ? "loading" as const : error || familyError ? "error" as const : "ready" as const,
    refresh,
    createItem,
    updateItem,
    deleteItem,
  };
}
