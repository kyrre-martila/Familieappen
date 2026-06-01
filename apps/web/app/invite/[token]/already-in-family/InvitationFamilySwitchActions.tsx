"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  buildInvitationSourcePath,
  INVITATION_ROUTES,
  markInvitationAccepted,
  saveInvitationContext,
} from "../../../../lib/invitation-context";

interface InvitationFamilySwitchActionsProps {
  familyName: string;
  inviterName: string;
  token: string;
}

export function InvitationFamilySwitchActions({ familyName, inviterName, token }: InvitationFamilySwitchActionsProps) {
  const router = useRouter();

  const invitationIdentity = useCallback(() => ({
    familyName,
    inviterName,
    sourcePath: buildInvitationSourcePath(token),
    token,
  }), [familyName, inviterName, token]);

  function handleSwitchFamily() {
    markInvitationAccepted(invitationIdentity(), "switch-requested");

    // TODO: Replace this continuation with a backend-confirmed invitation switch endpoint.
    // The current account must only switch families after this explicit user action.
    router.push(INVITATION_ROUTES.accepted(token));
  }

  function handleDeclineInvitation() {
    saveInvitationContext({
      ...invitationIdentity(),
      status: "landing",
    });
    router.push(INVITATION_ROUTES.decline(token));
  }

  function handleGoBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <div className="invitation-switch__actions" aria-label="Velg hva som skjer med invitasjonen">
      <button className="invitation-switch__button invitation-switch__button--primary" onClick={handleSwitchFamily} type="button">
        Bytt familie
      </button>
      <button className="invitation-switch__button invitation-switch__button--secondary" onClick={handleDeclineInvitation} type="button">
        Avslå invitasjon
      </button>
      <button className="invitation-switch__back" onClick={handleGoBack} type="button">
        Gå tilbake
      </button>
    </div>
  );
}
