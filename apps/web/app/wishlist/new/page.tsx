import type { Metadata } from "next";

import { WishlistFormClient } from "../../../features/wishlist/WishlistFormClient";

export const metadata: Metadata = {
  title: "Legg til ønske – Ønskeliste",
};

export default function NewWishlistItemPage() {
  return <WishlistFormClient mode="create" />;
}
