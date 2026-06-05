import type { Metadata } from "next";

import { WishlistFormClient } from "../../../../features/wishlist/WishlistFormClient";

export const metadata: Metadata = {
  title: "Rediger ønske – Ønskeliste",
};

export default async function EditWishlistItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <WishlistFormClient itemId={id} mode="edit" />;
}
