import { useQuery } from "@tanstack/react-query";
import { getFamily, listFamilies } from "../../auth/api";
import { useAuth } from "../../auth/AuthProvider";
import { calendarQueryKeys } from "../queryKeys";

export function useCalendarFamilyMembers() {
  const { accessToken } = useAuth();
  const familiesQuery = useQuery({ queryKey: calendarQueryKeys.families, queryFn: () => listFamilies(accessToken!), enabled: Boolean(accessToken) });
  const familyId = familiesQuery.data?.[0]?.family.id ?? null;
  const membersQuery = useQuery({ queryKey: familyId ? calendarQueryKeys.familyMembers(familyId) : ["calendar", "familyMembers", "missing"], queryFn: () => getFamily(accessToken!, familyId!), enabled: Boolean(accessToken && familyId), staleTime: 60_000 });
  return { familyId, familyMembers: membersQuery.data?.members ?? [], loading: familiesQuery.isLoading || membersQuery.isLoading, error: familiesQuery.error ?? membersQuery.error, refetch: membersQuery.refetch };
}
