import { Suspense } from "react";
import { ShoppingPageDeepLink } from "./ShoppingPageDeepLink";

export default function ShoppingPage() {
  return (
    <Suspense fallback={null}>
      <ShoppingPageDeepLink />
    </Suspense>
  );
}
