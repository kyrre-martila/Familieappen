"use client";

import { useRouter } from "next/navigation";
import { buildInvitationSourcePath, INVITATION_ROUTES, markInvitationDeclined } from "../../../../lib/invitation-context";

interface InvitationDeclineActionsProps {
  familyName: string;
  inviterName: string;
  token: string;
}

export function InvitationDeclineActions({ familyName, inviterName, token }: InvitationDeclineActionsProps) {
  const router = useRouter();

  function goBack() {
    router.push(INVITATION_ROUTES.landing(token));
  }

  function confirmDecline() {
    // TODO: Call the backend decline-invitation endpoint when invitation APIs are available.
    markInvitationDeclined({
      familyName,
      inviterName,
      sourcePath: buildInvitationSourcePath(token),
      token,
    });
    router.replace(INVITATION_ROUTES.declined(token));
  }

  return (
    <div className="invitation-status__actions">
      <button className="invitation-status__button invitation-status__button--primary" onClick={goBack} type="button">
        Nei, gå tilbake
      </button>
      <button className="invitation-status__button invitation-status__button--danger" onClick={confirmDecline} type="button">
        Ja, avslå
      </button>
    </div>
  );
}
