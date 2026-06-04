"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getFamily, type Family, type FamilyMember as BackendFamilyMember } from "../../../lib/api";
import { getUserFacingApiMessage, loadAvailableFamilies } from "../../../lib/auth-family";
import { toFeatureFamilyMembers, type FeatureFamilyMemberWithTone } from "../familyMemberAdapters";

export type FamilyMembersState = {
  family: Family | null;
  familyMembers: FeatureFamilyMemberWithTone[];
  adults: FeatureFamilyMemberWithTone[];
  children: FeatureFamilyMemberWithTone[];
  currentUserMember: FeatureFamilyMemberWithTone | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useFamilyMembers(): FamilyMembersState {
  const [family, setFamily] = useState<Family | null>(null);
  const [backendMembers, setBackendMembers] = useState<BackendFamilyMember[]>([]);
  const [currentUserMemberId, setCurrentUserMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const familyContext = await loadAvailableFamilies();

      if (familyContext.status !== "ready") {
        setFamily(null);
        setBackendMembers([]);
        setCurrentUserMemberId(null);
        return;
      }

      const activeFamily = familyContext.families.find(
        (familyWithMembership) => familyWithMembership.family.id === familyContext.activeFamilyId,
      );
      const details = await getFamily(familyContext.activeFamilyId);

      setFamily(details.family);
      setBackendMembers(details.members);
      setCurrentUserMemberId(activeFamily?.membership.id ?? null);
    } catch (refreshError) {
      setFamily(null);
      setBackendMembers([]);
      setCurrentUserMemberId(null);
      setError(getUserFacingApiMessage(refreshError, "Kunne ikke hente familie akkurat nå"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const familyMembers = useMemo(() => toFeatureFamilyMembers(backendMembers), [backendMembers]);
  const adults = useMemo(() => familyMembers.filter((member) => member.role !== "child"), [familyMembers]);
  const children = useMemo(() => familyMembers.filter((member) => member.role === "child"), [familyMembers]);
  const currentUserMember = useMemo(
    () => familyMembers.find((member) => member.id === currentUserMemberId) ?? null,
    [currentUserMemberId, familyMembers],
  );

  return {
    family,
    familyMembers,
    adults,
    children,
    currentUserMember,
    loading,
    error,
    refresh,
  };
}
