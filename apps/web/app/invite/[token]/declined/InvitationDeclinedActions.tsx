"use client";

import { useRouter } from "next/navigation";
import { completeInvitationContext } from "../../../../lib/invitation-context";

export function InvitationDeclinedActions() {
  const router = useRouter();

  function returnToLogin() {
    completeInvitationContext();
    router.push("/login");
  }

  return (
    <button className="invitation-status__button invitation-status__button--primary" onClick={returnToLogin} type="button">
      Tilbake til innlogging
    </button>
  );
}
