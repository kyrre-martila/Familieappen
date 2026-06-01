"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  const continueAuthenticatedInvitation = useCallback(() => {
    preserveInvitationContext(true);
    router.replace(`/onboarding/join-family?invite=${encodeURIComponent(token)}`);
  }, [preserveInvitationContext, router, token]);

  useEffect(() => {
    if (searchParams.get("continue") === "1" && getAccessToken()) {
      continueAuthenticatedInvitation();
    }
    // TODO: Replace this client-side continuation with a backend-verified invite resume flow.
  }, [continueAuthenticatedInvitation, searchParams]);

  function handleAcceptInvitation() {
    preserveInvitationContext(true);

    // TODO: Replace this with the real invitation acceptance endpoint.
    // Authenticated users should join the invited family automatically, while
    // unauthenticated users should return here after auth with this context intact.
    if (getAccessToken()) {
      continueAuthenticatedInvitation();
      return;
    }

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
