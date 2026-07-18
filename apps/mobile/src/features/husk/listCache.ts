import type { HuskList, HuskListItem } from "@familieappen/shared";

function counts(items: HuskListItem[]) {
  return {
    totalCount: items.length,
    completedCount: items.filter((i) => i.completed || i.completedAt).length,
  };
}
function withItems(list: HuskList, items: HuskListItem[]): HuskList {
  return { ...list, items, ...counts(items) };
}
export function mergeCreatedHuskList(
  current: HuskList[] | undefined,
  list: HuskList,
) {
  return current
    ? [...current.filter((item) => item.id !== list.id), list]
    : [list];
}
export function replaceHuskList(
  current: HuskList[] | undefined,
  list: HuskList,
) {
  return current
    ? current.map((item) => (item.id === list.id ? list : item))
    : current;
}
export function appendHuskListItem(
  current: HuskList[] | undefined,
  listId: string,
  item: HuskListItem,
) {
  return current?.map((list) =>
    list.id === listId
      ? withItems(
          list,
          [...list.items.filter((i) => i.id !== item.id), item].sort(
            (a, b) => a.sortOrder - b.sortOrder,
          ),
        )
      : list,
  );
}
export function replaceHuskListItem(
  current: HuskList[] | undefined,
  listId: string,
  item: HuskListItem,
) {
  return current?.map((list) =>
    list.id === listId
      ? withItems(
          list,
          list.items
            .map((i) => (i.id === item.id ? item : i))
            .sort((a, b) => a.sortOrder - b.sortOrder),
        )
      : list,
  );
}
export function removeHuskListItem(
  current: HuskList[] | undefined,
  listId: string,
  itemId: string,
) {
  return current?.map((list) =>
    list.id === listId
      ? withItems(
          list,
          list.items.filter((i) => i.id !== itemId),
        )
      : list,
  );
}
