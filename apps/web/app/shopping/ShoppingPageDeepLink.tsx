"use client";

import { useSearchParams } from "next/navigation";
import { ShoppingPageClient } from "./ShoppingPageClient";

export function ShoppingPageDeepLink() {
  const searchParams = useSearchParams();
  const linkedShoppingListId = searchParams.get("listId") ?? undefined;

  return <ShoppingPageClient linkedShoppingListId={linkedShoppingListId} />;
}
