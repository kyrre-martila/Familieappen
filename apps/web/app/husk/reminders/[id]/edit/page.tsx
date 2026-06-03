import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HuskFocusFormClient } from "../../../HuskFocusFormClient";
import { huskMockData } from "../../../mockHuskData";

interface EditHuskReminderPageProps {
  params: Promise<{ id: string }>;
}

function getReminder(id: string) {
  return huskMockData.reminders.find((reminder) => reminder.id === id) ?? null;
}

export async function generateMetadata({ params }: EditHuskReminderPageProps): Promise<Metadata> {
  const { id } = await params;
  const reminder = getReminder(id);

  return {
    title: reminder ? `Rediger ${reminder.title} – Husk` : "Rediger husk – Husk",
  };
}

export default async function EditHuskReminderPage({ params }: EditHuskReminderPageProps) {
  const { id } = await params;
  const reminder = getReminder(id);

  if (!reminder) {
    notFound();
  }

  return <HuskFocusFormClient kind="reminder" mode="edit" reminder={reminder} />;
}
