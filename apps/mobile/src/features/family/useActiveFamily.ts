import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { listFamilies } from "../auth/api";
import { selectCanonicalActiveFamilyId } from "./familySelection";
import { familyQueryKeys } from "./queryKeys";

export function useActiveFamily() {
  const { accessToken } = useAuth();
  const familiesQuery = useQuery({ queryKey: familyQueryKeys.families, queryFn: () => listFamilies(accessToken!), enabled: Boolean(accessToken), staleTime: 60_000 });
  const familyId = selectCanonicalActiveFamilyId(familiesQuery.data ?? []);
  return { accessToken, familiesQuery, familyId, families: familiesQuery.data ?? [], loading: familiesQuery.isLoading, refreshing: familiesQuery.isRefetching, error: familiesQuery.error, missingFamily: Boolean(accessToken && familiesQuery.isSuccess && !familyId) };
}
