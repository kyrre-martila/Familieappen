import { useQuery } from "@tanstack/react-query";
import { getFamily } from "../../auth/api";
import { useActiveFamily } from "../../family/useActiveFamily";
import { calendarQueryKeys } from "../queryKeys";

export function useCalendarFamilyMembers() {
  const { accessToken, familiesQuery, familyId } = useActiveFamily();
  const membersQuery = useQuery({ queryKey: familyId ? calendarQueryKeys.familyMembers(familyId) : ["calendar", "familyMembers", "missing"], queryFn: () => getFamily(accessToken!, familyId!), enabled: Boolean(accessToken && familyId), staleTime: 60_000 });
  return { familyId, familyMembers: membersQuery.data?.members ?? [], loading: familiesQuery.isLoading || membersQuery.isLoading, error: familiesQuery.error ?? membersQuery.error, refetch: membersQuery.refetch };
}
