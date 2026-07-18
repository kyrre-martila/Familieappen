import type { HuskList } from "@familieappen/shared";
import type { HuskView } from "./hooks/useHusk";
import { huskQueryKeys } from "./queryKeys";

export function huskQueryEnabled({ accessToken, familyId, view, dataset }: { accessToken: string | null; familyId: string | null; view: HuskView; dataset: HuskView }) {
  return Boolean(accessToken && familyId && view === dataset);
}

export function huskListsQueryKey(familyId: string | null) {
  return familyId ? huskQueryKeys.lists(familyId) : ["husk", "lists", "missing-family"] as const;
}

export function findCachedHuskList(lists: HuskList[] | undefined, listId: string | null) {
  return listId ? lists?.find((list) => list.id === listId) : undefined;
}
