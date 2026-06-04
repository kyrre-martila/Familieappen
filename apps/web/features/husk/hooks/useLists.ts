"use client";

import { useMemo, useState } from "react";

import {
  huskListDetails,
  huskMockData,
  type HuskListDetail,
  type HuskListDetailItem,
} from "../../../app/husk/mockHuskData";
import { remapLegacyMemberIds } from "../../family/familyMemberAdapters";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";
import type { HuskFamilyMember, HuskListGroup } from "../types";

export type ListInput = Omit<HuskListGroup, "id"> & { id?: string };

export function useLists(initialListDetail?: HuskListDetail) {
  const [lists, setLists] = useState<HuskListGroup[]>(huskMockData.listGroups);
  const { familyMembers, loading, error, refresh } = useFamilyMembers();
  const huskFamilyMembers = familyMembers as HuskFamilyMember[];
  const scopedLists = useMemo(
    () =>
      lists.map((list) => ({
        ...list,
        memberIds: remapLegacyMemberIds(list.memberIds, huskFamilyMembers),
      })),
    [huskFamilyMembers, lists],
  );
  const [listDetails, setListDetails] =
    useState<HuskListDetail[]>(huskListDetails);
  const scopedListDetails = useMemo(
    () =>
      listDetails.map((detail) => ({
        ...detail,
        familyMembers: huskFamilyMembers,
        items: detail.items.map((item) => ({
          ...item,
          assignedMemberIds: remapLegacyMemberIds(item.assignedMemberIds, huskFamilyMembers),
        })),
      })),
    [huskFamilyMembers, listDetails],
  );
  const [listItems, setListItems] = useState<HuskListDetailItem[]>(
    initialListDetail?.items ?? [],
  );
  const scopedListItems = useMemo(
    () =>
      listItems.map((item) => ({
        ...item,
        assignedMemberIds: remapLegacyMemberIds(item.assignedMemberIds, huskFamilyMembers),
      })),
    [huskFamilyMembers, listItems],
  );

  function createList(input: ListInput) {
    const list: HuskListGroup = {
      ...input,
      id: input.id ?? `mock-list-${Date.now()}`,
    };
    setLists((currentLists) => [list, ...currentLists]);
    return list;
  }

  function updateList(id: string, update: Partial<HuskListGroup>) {
    setLists((currentLists) =>
      currentLists.map((list) =>
        list.id === id ? { ...list, ...update } : list,
      ),
    );
  }

  function deleteList(id: string) {
    setLists((currentLists) => currentLists.filter((list) => list.id !== id));
  }

  function updateListItem(itemId: string, update: Partial<HuskListDetailItem>) {
    setListItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, ...update } : item,
      ),
    );
  }

  function completeListItem(itemId: string) {
    updateListItem(itemId, { completed: true });
  }

  function uncompleteListItem(itemId: string) {
    updateListItem(itemId, { completed: false });
  }

  function deleteListItem(itemId: string) {
    setListItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId),
    );
  }

  function createListItem(item: HuskListDetailItem) {
    setListItems((currentItems) => [item, ...currentItems]);
    return item;
  }

  return {
    familyMembers: huskFamilyMembers,
    lists: scopedLists,
    loading,
    error,
    refresh,
    listDetails: scopedListDetails,
    listItems: scopedListItems,
    createList,
    updateList,
    deleteList,
    createListItem,
    updateListItem,
    deleteListItem,
    completeListItem,
    uncompleteListItem,
  };
}
