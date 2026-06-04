"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addHuskList,
  addHuskListItem,
  completeHuskListItem,
  deleteHuskList as deleteBackendHuskList,
  deleteHuskListItem as deleteBackendHuskListItem,
  getHuskLists,
  uncompleteHuskListItem,
  updateHuskList as updateBackendHuskList,
  updateHuskListItem as updateBackendHuskListItem,
  type HuskList as BackendList,
  type HuskListItem as BackendListItem,
} from "../../../lib/api";
import { getUserFacingApiMessage } from "../../../lib/auth-family";
import { remapLegacyMemberIds } from "../../family/familyMemberAdapters";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";
import type { HuskFamilyMember, HuskListGroup, HuskListIcon } from "../types";
import type { HuskListDetail, HuskListDetailItem } from "../../../app/husk/mockHuskData";

type BackendHuskListDetailItem = HuskListDetailItem & {
  listId?: string;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListInput = Omit<HuskListGroup, "id"> & {
  id?: string;
  description?: string;
  scopeText?: string;
};

const LISTS_ERROR_COPY = "Kunne ikke hente lister akkurat nå";
const tones: HuskListGroup["tone"][] = ["blue", "green", "orange", "purple"];
const listIcons = ["birthday", "home", "summer", "celebration"] as const;

export function useLists(initialListDetail?: HuskListDetail) {
  const { family, familyMembers, loading: familyLoading, error: familyError, refresh: refreshFamilyMembers } = useFamilyMembers();
  const [backendLists, setBackendLists] = useState<BackendList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeFamilyId = family?.id ?? null;
  const huskFamilyMembers = familyMembers as HuskFamilyMember[];

  const refresh = useCallback(async () => {
    await refreshFamilyMembers();

    if (!activeFamilyId) {
      setBackendLists([]);
      setLoading(familyLoading);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setBackendLists(await getHuskLists(activeFamilyId));
    } catch (refreshError) {
      setError(getUserFacingApiMessage(refreshError, LISTS_ERROR_COPY));
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, familyLoading, refreshFamilyMembers]);

  useEffect(() => {
    if (!activeFamilyId) {
      setBackendLists([]);
      setLoading(familyLoading);
      setError(familyError);
      return;
    }

    let isActive = true;

    async function loadLists() {
      setLoading(true);
      setError(null);

      try {
        const lists = await getHuskLists(activeFamilyId as string);

        if (isActive) {
          setBackendLists(lists);
        }
      } catch (refreshError) {
        if (isActive) {
          setError(getUserFacingApiMessage(refreshError, LISTS_ERROR_COPY));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadLists();

    return () => {
      isActive = false;
    };
  }, [activeFamilyId, familyError, familyLoading]);

  const lists = useMemo(
    () => backendLists.map((list, index) => toHuskListGroup(list, huskFamilyMembers, index)),
    [backendLists, huskFamilyMembers],
  );

  const listDetails = useMemo(
    () => backendLists.map((list, index) => toHuskListDetail(list, huskFamilyMembers, index)),
    [backendLists, huskFamilyMembers],
  );

  const activeDetail = backendLists.find((list) => list.id === initialListDetail?.id) ?? null;
  const listItems = useMemo(
    () => (activeDetail ? activeDetail.items.map(toHuskListDetailItem) : (initialListDetail?.items ?? [])),
    [activeDetail, initialListDetail],
  );

  const createList = useCallback(async (input: ListInput) => {
    if (!activeFamilyId) {
      throw new Error("Choose a family before continuing.");
    }

    const optimisticList = createOptimisticBackendList(input, activeFamilyId, huskFamilyMembers);
    setBackendLists((currentLists) => [optimisticList, ...currentLists]);

    try {
      const savedList = await addHuskList(activeFamilyId, toBackendListInput(input, huskFamilyMembers));
      setBackendLists((currentLists) => currentLists.map((list) => (list.id === optimisticList.id ? savedList : list)));
      return toHuskListGroup(savedList, huskFamilyMembers, 0);
    } catch (createError) {
      setBackendLists((currentLists) => currentLists.filter((list) => list.id !== optimisticList.id));
      setError(getUserFacingApiMessage(createError, "Kunne ikke lagre liste akkurat nå"));
      throw createError;
    }
  }, [activeFamilyId, huskFamilyMembers]);

  const updateList = useCallback(async (id: string, update: Partial<HuskListGroup>) => {
    if (!activeFamilyId) throw new Error("Choose a family before continuing.");
    const previousLists = backendLists;
    const previousList = previousLists.find((list) => list.id === id);
    if (!previousList) throw new Error("List was not found");

    const optimisticList = applyListUpdate(previousList, update, huskFamilyMembers);
    setBackendLists((currentLists) => currentLists.map((list) => (list.id === id ? optimisticList : list)));

    try {
      const savedList = await updateBackendHuskList(activeFamilyId, id, toBackendListUpdate(update, huskFamilyMembers));
      setBackendLists((currentLists) => currentLists.map((list) => (list.id === id ? savedList : list)));
      return toHuskListGroup(savedList, huskFamilyMembers, 0);
    } catch (updateError) {
      setBackendLists(previousLists);
      setError(getUserFacingApiMessage(updateError, "Kunne ikke lagre liste akkurat nå"));
      throw updateError;
    }
  }, [activeFamilyId, backendLists, huskFamilyMembers]);

  const deleteList = useCallback(async (id: string) => {
    if (!activeFamilyId) throw new Error("Choose a family before continuing.");
    const previousLists = backendLists;
    setBackendLists((currentLists) => currentLists.filter((list) => list.id !== id));

    try {
      await deleteBackendHuskList(activeFamilyId, id);
    } catch (deleteError) {
      setBackendLists(previousLists);
      setError(getUserFacingApiMessage(deleteError, "Kunne ikke slette liste akkurat nå"));
      throw deleteError;
    }
  }, [activeFamilyId, backendLists]);

  const archiveList = useCallback((id: string) => updateList(id, { archived: true }), [updateList]);
  const unarchiveList = useCallback((id: string) => updateList(id, { archived: false }), [updateList]);

  const createListItem = useCallback(async (item: BackendHuskListDetailItem) => {
    if (!activeFamilyId) throw new Error("Choose a family before continuing.");
    const listId = item.listId ?? initialListDetail?.id;
    if (!listId) throw new Error("List was not found");

    const previousLists = backendLists;
    const optimisticItem = createOptimisticBackendListItem(item, listId, listItems.length);
    setBackendLists((currentLists) => addItemToList(currentLists, listId, optimisticItem));

    try {
      const savedItem = await addHuskListItem(activeFamilyId, listId, toBackendListItemInput(item));
      setBackendLists((currentLists) => replaceItemInList(currentLists, listId, optimisticItem.id, savedItem));
      return toHuskListDetailItem(savedItem);
    } catch (createError) {
      setBackendLists(previousLists);
      setError(getUserFacingApiMessage(createError, "Kunne ikke lagre punkt akkurat nå"));
      throw createError;
    }
  }, [activeFamilyId, backendLists, initialListDetail?.id, listItems.length]);

  const updateListItem = useCallback(async (itemId: string, update: Partial<HuskListDetailItem>) => {
    if (!activeFamilyId) throw new Error("Choose a family before continuing.");
    const listId = initialListDetail?.id;
    if (!listId) throw new Error("List was not found");
    const previousLists = backendLists;
    setBackendLists((currentLists) => updateItemInList(currentLists, listId, itemId, (item) => applyItemUpdate(item, update)));

    try {
      const savedItem = await updateBackendHuskListItem(activeFamilyId, listId, itemId, toBackendListItemUpdate(update));
      setBackendLists((currentLists) => replaceItemInList(currentLists, listId, itemId, savedItem));
      return toHuskListDetailItem(savedItem);
    } catch (updateError) {
      setBackendLists(previousLists);
      setError(getUserFacingApiMessage(updateError, "Kunne ikke lagre punkt akkurat nå"));
      throw updateError;
    }
  }, [activeFamilyId, backendLists, initialListDetail?.id]);

  const deleteListItem = useCallback(async (itemId: string) => {
    if (!activeFamilyId) throw new Error("Choose a family before continuing.");
    const listId = initialListDetail?.id;
    if (!listId) throw new Error("List was not found");
    const previousLists = backendLists;
    setBackendLists((currentLists) => removeItemFromList(currentLists, listId, itemId));

    try {
      await deleteBackendHuskListItem(activeFamilyId, listId, itemId);
    } catch (deleteError) {
      setBackendLists(previousLists);
      setError(getUserFacingApiMessage(deleteError, "Kunne ikke slette punkt akkurat nå"));
      throw deleteError;
    }
  }, [activeFamilyId, backendLists, initialListDetail?.id]);

  const completeListItem = useCallback(async (itemId: string) => {
    if (!activeFamilyId) throw new Error("Choose a family before continuing.");
    const listId = initialListDetail?.id;
    if (!listId) throw new Error("List was not found");
    const previousLists = backendLists;
    const completedAt = new Date().toISOString();
    setBackendLists((currentLists) => updateItemInList(currentLists, listId, itemId, (item) => ({ ...item, completed: true, completedAt })));

    try {
      const savedItem = await completeHuskListItem(activeFamilyId, listId, itemId);
      setBackendLists((currentLists) => replaceItemInList(currentLists, listId, itemId, savedItem));
      return toHuskListDetailItem(savedItem);
    } catch (completeError) {
      setBackendLists(previousLists);
      setError(getUserFacingApiMessage(completeError, "Kunne ikke fullføre punkt akkurat nå"));
      throw completeError;
    }
  }, [activeFamilyId, backendLists, initialListDetail?.id]);

  const uncompleteListItem = useCallback(async (itemId: string) => {
    if (!activeFamilyId) throw new Error("Choose a family before continuing.");
    const listId = initialListDetail?.id;
    if (!listId) throw new Error("List was not found");
    const previousLists = backendLists;
    setBackendLists((currentLists) => updateItemInList(currentLists, listId, itemId, (item) => ({ ...item, completed: false, completedAt: null })));

    try {
      const savedItem = await uncompleteHuskListItem(activeFamilyId, listId, itemId);
      setBackendLists((currentLists) => replaceItemInList(currentLists, listId, itemId, savedItem));
      return toHuskListDetailItem(savedItem);
    } catch (completeError) {
      setBackendLists(previousLists);
      setError(getUserFacingApiMessage(completeError, "Kunne ikke angre fullføring akkurat nå"));
      throw completeError;
    }
  }, [activeFamilyId, backendLists, initialListDetail?.id]);

  return {
    familyMembers: huskFamilyMembers,
    lists,
    loading: familyLoading || loading,
    error: familyError ?? error,
    refresh,
    listDetails,
    listItems,
    createList,
    updateList,
    deleteList,
    archiveList,
    unarchiveList,
    createListItem,
    updateListItem,
    deleteListItem,
    completeListItem,
    uncompleteListItem,
  };
}

function toBackendListInput(input: ListInput, familyMembers: HuskFamilyMember[]) {
  const isFamilyScope = input.scopeText === "Hele familien" || input.memberIds.length === 0 || input.memberIds.length >= familyMembers.length;
  return {
    title: input.title,
    icon: input.icon,
    description: input.description ?? null,
    scope: isFamilyScope ? "family" as const : "members" as const,
    memberIds: isFamilyScope ? [] : input.memberIds,
  };
}

function toBackendListUpdate(update: Partial<HuskListGroup>, familyMembers: HuskFamilyMember[]) {
  const isFamilyScope = update.scopeText === "Hele familien" || (update.memberIds !== undefined && update.memberIds.length >= familyMembers.length);
  return {
    ...(update.title !== undefined ? { title: update.title } : {}),
    ...(update.icon !== undefined ? { icon: update.icon } : {}),
    ...(update.archived !== undefined ? { archivedAt: update.archived ? new Date().toISOString() : null } : {}),
    ...(update.scopeText !== undefined || update.memberIds !== undefined
      ? { scope: isFamilyScope ? "family" as const : "members" as const, memberIds: isFamilyScope ? [] : (update.memberIds ?? []) }
      : {}),
  };
}

function toBackendListItemInput(item: BackendHuskListDetailItem) {
  return {
    title: item.title,
    description: item.description ?? null,
    assignedMemberIds: item.assignedMemberIds,
    dueDate: item.dueDate ?? null,
  };
}

function toBackendListItemUpdate(update: Partial<BackendHuskListDetailItem>) {
  return {
    ...(update.title !== undefined ? { title: update.title } : {}),
    ...(update.description !== undefined ? { description: update.description ?? null } : {}),
    ...(update.completedAt !== undefined ? { completedAt: update.completedAt } : {}),
    ...(update.assignedMemberIds !== undefined ? { assignedMemberIds: update.assignedMemberIds } : {}),
    ...(update.dueDate !== undefined ? { dueDate: update.dueDate ?? null } : {}),
  };
}

function createOptimisticBackendList(input: ListInput, familyId: string, familyMembers: HuskFamilyMember[]): BackendList {
  const now = new Date().toISOString();
  const isFamilyScope = input.scopeText === "Hele familien" || input.memberIds.length === 0 || input.memberIds.length >= familyMembers.length;
  return {
    id: input.id ?? `optimistic-list-${Date.now()}`,
    familyId,
    title: input.title,
    icon: input.icon,
    category: input.icon,
    description: input.description ?? null,
    archivedAt: input.archived ? now : null,
    archived: input.archived,
    scope: isFamilyScope ? "family" : "members",
    memberIds: isFamilyScope ? [] : input.memberIds,
    completedCount: 0,
    totalCount: 0,
    createdAt: now,
    updatedAt: now,
    audienceMembers: [],
    items: [],
  };
}

function applyListUpdate(list: BackendList, update: Partial<HuskListGroup>, familyMembers: HuskFamilyMember[]): BackendList {
  const isFamilyScope = update.scopeText === "Hele familien" || (update.memberIds !== undefined && update.memberIds.length >= familyMembers.length);
  const memberIds = update.memberIds === undefined ? list.memberIds : (isFamilyScope ? [] : update.memberIds);
  return {
    ...list,
    ...(update.title !== undefined ? { title: update.title } : {}),
    ...(update.icon !== undefined ? { icon: update.icon, category: update.icon } : {}),
    ...(update.archived !== undefined ? { archived: update.archived, archivedAt: update.archived ? new Date().toISOString() : null } : {}),
    scope: memberIds.length === 0 ? "family" : "members",
    memberIds,
    updatedAt: new Date().toISOString(),
  };
}

function toHuskListGroup(list: BackendList, familyMembers: HuskFamilyMember[], index: number): HuskListGroup {
  const memberIds = getUiMemberIds(list, familyMembers);
  return {
    id: list.id,
    familyId: list.familyId,
    title: list.title,
    scopeText: getScopeText(list.scope, memberIds, familyMembers),
    completedCount: list.completedCount,
    totalCount: list.totalCount,
    archived: list.archived,
    icon: isListIcon(list.icon) ? list.icon : "home",
    tone: tones[index % tones.length],
    memberIds,
    items: list.items.map(toHuskListDetailItem),
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  };
}

function toHuskListDetail(list: BackendList, familyMembers: HuskFamilyMember[], index: number): HuskListDetail {
  const group = toHuskListGroup(list, familyMembers, index);
  return {
    id: group.id,
    title: group.title,
    scopeText: group.scopeText ?? "Hele familien",
    completedCount: group.completedCount,
    totalCount: group.totalCount,
    familyMembers,
    items: list.items.map(toHuskListDetailItem),
  };
}

function toHuskListDetailItem(item: BackendListItem): BackendHuskListDetailItem {
  return {
    id: item.id,
    listId: item.listId,
    title: item.title,
    completed: item.completed,
    assignedMemberIds: item.assignedFamilyMemberId ? [item.assignedFamilyMemberId] : [],
    description: item.description ?? "",
    dueDate: item.dueDate?.slice(0, 10) ?? null,
    dueLabel: item.dueDate ? formatDueLabel(item.dueDate) : undefined,
    completedAt: item.completedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function getUiMemberIds(list: BackendList, familyMembers: HuskFamilyMember[]) {
  const memberIds = remapLegacyMemberIds(list.memberIds, familyMembers);
  return list.scope === "family" || memberIds.length === 0 ? familyMembers.map((member) => member.id) : memberIds;
}

function getScopeText(scope: BackendList["scope"], memberIds: string[], familyMembers: HuskFamilyMember[]) {
  if (scope === "family" || memberIds.length >= familyMembers.length) return "Hele familien";
  if (memberIds.length === 1) return familyMembers.find((member) => member.id === memberIds[0])?.name ?? "1 person";
  return `${memberIds.length} personer`;
}

function isListIcon(icon: string): icon is HuskListIcon {
  return (listIcons as readonly string[]).includes(icon);
}

function formatDueLabel(value: string) {
  return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long" }).format(new Date(value));
}

function createOptimisticBackendListItem(item: BackendHuskListDetailItem, listId: string, sortOrder: number): BackendListItem {
  const now = new Date().toISOString();
  return {
    id: item.id ?? `optimistic-item-${Date.now()}`,
    listId,
    title: item.title,
    description: item.description ?? null,
    completedAt: item.completed ? now : null,
    completed: item.completed,
    assignedFamilyMemberId: item.assignedMemberIds[0] ?? null,
    dueDate: item.dueDate ?? null,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

function addItemToList(lists: BackendList[], listId: string, item: BackendListItem) {
  return lists.map((list) => list.id === listId ? recalculateList({ ...list, items: [item, ...list.items] }) : list);
}

function replaceItemInList(lists: BackendList[], listId: string, itemId: string, item: BackendListItem) {
  return lists.map((list) => list.id === listId ? recalculateList({ ...list, items: list.items.map((currentItem) => currentItem.id === itemId ? item : currentItem) }) : list);
}

function updateItemInList(lists: BackendList[], listId: string, itemId: string, updater: (item: BackendListItem) => BackendListItem) {
  return lists.map((list) => list.id === listId ? recalculateList({ ...list, items: list.items.map((item) => item.id === itemId ? updater(item) : item) }) : list);
}

function removeItemFromList(lists: BackendList[], listId: string, itemId: string) {
  return lists.map((list) => list.id === listId ? recalculateList({ ...list, items: list.items.filter((item) => item.id !== itemId) }) : list);
}

function applyItemUpdate(item: BackendListItem, update: Partial<BackendHuskListDetailItem>): BackendListItem {
  return {
    ...item,
    ...(update.title !== undefined ? { title: update.title } : {}),
    ...(update.description !== undefined ? { description: update.description ?? null } : {}),
    ...(update.assignedMemberIds !== undefined ? { assignedFamilyMemberId: update.assignedMemberIds[0] ?? null } : {}),
    ...(update.dueDate !== undefined ? { dueDate: update.dueDate } : {}),
    updatedAt: new Date().toISOString(),
  };
}

function recalculateList(list: BackendList): BackendList {
  return {
    ...list,
    completedCount: list.items.filter((item) => item.completedAt !== null || item.completed).length,
    totalCount: list.items.length,
    updatedAt: new Date().toISOString(),
  };
}
