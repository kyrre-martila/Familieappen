"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getInvitationResumeRoute } from "../../../lib/invitation-context";

export function FamilyStartInviteGate() {
  const router = useRouter();

  useEffect(() => {
    const resumeRoute = getInvitationResumeRoute();

    if (resumeRoute) {
      router.replace(resumeRoute);
    }
  }, [router]);

  return null;
}
