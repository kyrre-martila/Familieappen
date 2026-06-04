"use client";

import { useState } from "react";

import { huskListDetails, huskMockData, type HuskListDetail, type HuskListDetailItem, type HuskListGroup } from "../../../app/husk/mockHuskData";

export type ListInput = Omit<HuskListGroup, "id"> & { id?: string };

export function useLists(initialListDetail?: HuskListDetail) {
  const [lists, setLists] = useState<HuskListGroup[]>(huskMockData.listGroups);
  const [listDetails, setListDetails] = useState<HuskListDetail[]>(huskListDetails);
  const [listItems, setListItems] = useState<HuskListDetailItem[]>(
    initialListDetail?.items ?? [],
  );

  function createList(input: ListInput) {
    const list: HuskListGroup = { ...input, id: input.id ?? `mock-list-${Date.now()}` };
    setLists((currentLists) => [list, ...currentLists]);
    return list;
  }

  function updateList(id: string, update: Partial<HuskListGroup>) {
    setLists((currentLists) =>
      currentLists.map((list) => (list.id === id ? { ...list, ...update } : list)),
    );
  }

  function deleteList(id: string) {
    setLists((currentLists) => currentLists.filter((list) => list.id !== id));
  }

  function updateListItem(itemId: string, update: Partial<HuskListDetailItem>) {
    setListItems((currentItems) =>
      currentItems.map((item) => (item.id === itemId ? { ...item, ...update } : item)),
    );
  }

  function completeListItem(itemId: string) {
    updateListItem(itemId, { completed: true });
  }

  function uncompleteListItem(itemId: string) {
    updateListItem(itemId, { completed: false });
  }

  function deleteListItem(itemId: string) {
    setListItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  function createListItem(item: HuskListDetailItem) {
    setListItems((currentItems) => [item, ...currentItems]);
    return item;
  }

  return {
    familyMembers: huskMockData.familyMembers,
    lists,
    listDetails,
    listItems,
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
