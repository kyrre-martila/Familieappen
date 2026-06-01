"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listFamilies } from "../../../lib/api";
import { getAccessToken } from "../../../lib/session";
import {
  buildInvitationSourcePath,
  INVITATION_ROUTES,
  markInvitationAccepted,
  saveInvitationContext,
} from "../../../lib/invitation-context";
import { getInvitationPostAuthRoute } from "../../../lib/invitation-flow";

interface InvitationLandingActionsProps {
  familyName: string;
  inviterName: string;
  token: string;
}

export function InvitationLandingActions({ familyName, inviterName, token }: InvitationLandingActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requiresApproval = searchParams.get("approval") === "required";

  const invitationIdentity = useCallback(() => ({
    familyName,
    inviterName,
    requiresApproval,
    sourcePath: buildInvitationSourcePath(token),
    token,
  }), [familyName, inviterName, requiresApproval, token]);

  const preserveInvitationContext = useCallback(() => {
    return saveInvitationContext({
      ...invitationIdentity(),
      status: "landing",
    });
  }, [invitationIdentity]);

  const routeAuthenticatedInvitation = useCallback(async (continueInvitation = false) => {
    try {
      const families = await listFamilies();

      if (families.length > 0) {
        preserveInvitationContext();
        router.replace(INVITATION_ROUTES.alreadyInFamily(token));
        return;
      }
    } catch {
      // TODO: Replace this fallback with a backend-verified invitation eligibility check.
      // If the family lookup is unavailable, keep the existing invite resume path without
      // changing active family client-side.
    }

    if (continueInvitation) {
      markInvitationAccepted(invitationIdentity());
      router.replace(getInvitationPostAuthRoute());
    }
  }, [invitationIdentity, preserveInvitationContext, router, token]);

  useEffect(() => {
    preserveInvitationContext();

    if (!getAccessToken()) {
      return;
    }

    void routeAuthenticatedInvitation(searchParams.get("continue") === "1");
    // TODO: Replace this client-side continuation with a backend-verified invite resume flow.
  }, [preserveInvitationContext, routeAuthenticatedInvitation, searchParams]);

  function handleAcceptInvitation() {
    if (getAccessToken()) {
      void routeAuthenticatedInvitation(true);
      return;
    }

    markInvitationAccepted(invitationIdentity());
    router.push(`/login?next=${encodeURIComponent(`${INVITATION_ROUTES.landing(token)}?continue=1`)}`);
  }

  function handleDeclineInvitation() {
    preserveInvitationContext();
    router.push(INVITATION_ROUTES.decline(token));
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
