import type { Metadata } from "next";

import { SharedWishlistClient } from "./SharedWishlistClient";

export const metadata: Metadata = {
  title: "Delt ønskeliste – Ønskeliste",
};

export default async function SharedWishlistPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;

  return <SharedWishlistClient memberId={memberId} />;
}
