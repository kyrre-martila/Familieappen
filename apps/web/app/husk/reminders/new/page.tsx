import type { Metadata } from "next";

import { HuskFocusFormClient } from "../../HuskFocusFormClient";

export const metadata: Metadata = {
  title: "Ny husk – Husk",
};

export default function NewHuskReminderPage() {
  return <HuskFocusFormClient kind="reminder" mode="create" />;
}
