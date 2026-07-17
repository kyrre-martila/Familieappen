import { useMemo } from "react";
import type { HuskList } from "@familieappen/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listFamilies } from "../../auth/api";
import { useAuth } from "../../auth/AuthProvider";
import { getHuskLists } from "../api";
import { huskQueryKeys } from "../queryKeys";

export function useHuskListDetails(listId: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const families = useQuery({ queryKey: huskQueryKeys.families, queryFn: () => listFamilies(accessToken!), enabled: Boolean(accessToken), staleTime: 60_000 });
  const familyId = families.data?.[0]?.family.id ?? null;
  const cached = familyId && listId ? queryClient.getQueryData<HuskList[]>(huskQueryKeys.lists(familyId))?.find((list) => list.id === listId) : undefined;
  const lists = useQuery({ queryKey: familyId ? huskQueryKeys.lists(familyId) : ["husk", "lists", "missing-family"], queryFn: () => getHuskLists(accessToken!, familyId!), enabled: Boolean(accessToken && familyId && listId), staleTime: 60_000 });
  const list = useMemo(() => lists.data?.find((item) => item.id === listId) ?? null, [listId, lists.data]);
  return { list, loading: families.isLoading || (lists.isLoading && !cached), refreshing: families.isRefetching || lists.isRefetching, error: families.error || lists.error, missingContext: !accessToken || (families.isSuccess && !familyId), refetch: async () => { await Promise.all([families.refetch(), lists.refetch()]); } };
}
