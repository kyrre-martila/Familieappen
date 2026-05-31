"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function FamilyStartInviteGate() {
  const router = useRouter();

  useEffect(() => {
    // TODO: Check for pending invite token/session and auto-skip this screen if invite exists.
    // When invite detection is available, continue into the invitation flow instead of showing choices.
    void router;
  }, [router]);

  return null;
}
