import type { Metadata } from "next";

import { HuskFocusFormClient } from "../../../HuskFocusFormClient";

interface EditHuskReminderPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Rediger husk – Husk",
  };
}

export default async function EditHuskReminderPage({ params }: EditHuskReminderPageProps) {
  const { id } = await params;

  return <HuskFocusFormClient kind="reminder" mode="edit" reminderId={id} />;
}
