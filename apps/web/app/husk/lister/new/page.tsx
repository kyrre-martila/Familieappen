import type { Metadata } from "next";

import { HuskFocusFormClient } from "../../HuskFocusFormClient";

export const metadata: Metadata = {
  title: "Ny liste – Husk",
};

export default function NewHuskListPage() {
  return <HuskFocusFormClient kind="list" mode="create" />;
}
