import { useMemo } from "react";
import type { HuskList } from "@familieappen/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveFamily } from "../../family/useActiveFamily";
import { getHuskLists } from "../api";
import { huskQueryKeys } from "../queryKeys";
import { findCachedHuskList, huskListsQueryKey } from "../queryState";

export function useHuskListDetails(listId: string | null) {
  const queryClient = useQueryClient();
  const { accessToken, familiesQuery: families, familyId } = useActiveFamily();
  const cached = findCachedHuskList(familyId ? queryClient.getQueryData<HuskList[]>(huskQueryKeys.lists(familyId)) : undefined, listId);
  const lists = useQuery({ queryKey: huskListsQueryKey(familyId), queryFn: () => getHuskLists(accessToken!, familyId!), enabled: Boolean(accessToken && familyId && listId), staleTime: 60_000 });
  const list = useMemo(() => lists.data?.find((item) => item.id === listId) ?? null, [listId, lists.data]);
  return { list, loading: families.isLoading || (lists.isLoading && !cached), refreshing: families.isRefetching || lists.isRefetching, error: families.error || lists.error, missingContext: !accessToken || (families.isSuccess && !familyId), refetch: async () => { await Promise.all([families.refetch(), lists.refetch()]); } };
}
