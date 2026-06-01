"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listFamilies } from "../../../lib/api";
import { getAccessToken } from "../../../lib/session";
import { saveInvitationContext } from "../../../lib/invitation-context";

interface InvitationLandingActionsProps {
  familyName: string;
  inviterName: string;
  token: string;
}

export function InvitationLandingActions({ familyName, inviterName, token }: InvitationLandingActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preserveInvitationContext = useCallback((accepted = false) => {
    return saveInvitationContext({
      acceptedAt: accepted ? new Date().toISOString() : undefined,
      familyName,
      inviterName,
      sourcePath: `/invite/${encodeURIComponent(token)}`,
      token,
    });
  }, [familyName, inviterName, token]);

  const routeAuthenticatedInvitation = useCallback(async (continueWithoutFamily = false) => {
    try {
      const families = await listFamilies();

      if (families.length > 0) {
        preserveInvitationContext(false);
        router.replace(`/invite/${encodeURIComponent(token)}/already-in-family`);
        return;
      }
    } catch {
      // TODO: Replace this fallback with a backend-verified invitation eligibility check.
      // If the family lookup is unavailable, keep the existing invite resume path without
      // changing active family client-side.
    }

    if (continueWithoutFamily) {
      preserveInvitationContext(true);
      router.replace(`/onboarding/join-family?invite=${encodeURIComponent(token)}`);
    }
  }, [preserveInvitationContext, router, token]);

  useEffect(() => {
    if (!getAccessToken()) {
      return;
    }

    void routeAuthenticatedInvitation(searchParams.get("continue") === "1");
    // TODO: Replace this client-side continuation with a backend-verified invite resume flow.
  }, [routeAuthenticatedInvitation, searchParams]);

  function handleAcceptInvitation() {
    // TODO: Replace this with the real invitation acceptance endpoint.
    // Authenticated users should only continue automatically when they have no active family;
    // users who already belong to a family must explicitly choose to switch first.
    if (getAccessToken()) {
      void routeAuthenticatedInvitation(true);
      return;
    }

    preserveInvitationContext(true);
    router.push(`/login?next=${encodeURIComponent(`/invite/${token}?continue=1`)}`);
  }

  function handleDeclineInvitation() {
    preserveInvitationContext(false);
    // TODO: Add a decline confirmation flow and call the backend decline endpoint.
    router.push("/onboarding/family-start");
  }

  return (
    <div className="invitation-landing__actions" aria-label="Svar på invitasjon">
      <button className="invitation-landing__button invitation-landing__button--primary" onClick={handleAcceptInvitation} type="button">
        Godta invitasjon
      </button>
      <button className="invitation-landing__button invitation-landing__button--secondary" onClick={handleDeclineInvitation} type="button">
        Avslå invitasjon
      </button>
    </div>
  );
}
