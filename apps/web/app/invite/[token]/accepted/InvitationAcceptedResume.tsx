"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "../../../../lib/session";
import { getInvitationContext, INVITATION_ROUTES } from "../../../../lib/invitation-context";
import { getInvitationPostAuthRoute, hasCompletedPersonalInformation, resolveInvitationCompletion } from "../../../../lib/invitation-flow";

interface InvitationAcceptedResumeProps {
  token: string;
}

export function InvitationAcceptedResume({ token }: InvitationAcceptedResumeProps) {
  const router = useRouter();
  const [message, setMessage] = useState("Vi klargjør invitasjonen din…");

  useEffect(() => {
    const context = getInvitationContext();

    if (!context || context.token !== token) {
      router.replace(INVITATION_ROUTES.landing(token));
      return;
    }

    if (!getAccessToken()) {
      router.replace(`/login?next=${encodeURIComponent(INVITATION_ROUTES.accepted(token))}`);
      return;
    }

    if (!hasCompletedPersonalInformation()) {
      router.replace(getInvitationPostAuthRoute());
      return;
    }

    setMessage("Invitasjonen behandles…");
    const result = resolveInvitationCompletion(context);
    router.replace(result.redirectTo);
  }, [router, token]);

  return <p className="invitation-status__description">{message}</p>;
}
