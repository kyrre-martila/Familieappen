"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveInvitationContext } from "../../../../lib/invitation-context";

interface InvitationFamilySwitchActionsProps {
  familyName: string;
  inviterName: string;
  token: string;
}

export function InvitationFamilySwitchActions({ familyName, inviterName, token }: InvitationFamilySwitchActionsProps) {
  const router = useRouter();

  const preserveInvitationContext = useCallback((accepted = false) => {
    return saveInvitationContext({
      acceptedAt: accepted ? new Date().toISOString() : undefined,
      familyName,
      inviterName,
      sourcePath: `/invite/${encodeURIComponent(token)}`,
      token,
    });
  }, [familyName, inviterName, token]);

  function handleSwitchFamily() {
    preserveInvitationContext(true);

    // TODO: Replace this placeholder route with a backend-confirmed invitation switch endpoint.
    // The current account must only switch families after this explicit user action.
    router.push(`/onboarding/join-family?invite=${encodeURIComponent(token)}&switch=1`);
  }

  function handleDeclineInvitation() {
    preserveInvitationContext(false);

    // TODO: Route to a dedicated decline confirmation flow and call the backend decline endpoint.
    router.push("/onboarding/family-start");
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
