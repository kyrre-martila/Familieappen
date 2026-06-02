import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CalendarEventFormClient } from "../../EventFormClient";
import { calendarEvents } from "../../../mockCalendarData";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

function getEvent(id: string) {
  return calendarEvents.find((calendarEvent) => calendarEvent.id === id) ?? null;
}

export async function generateMetadata({ params }: EditEventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = getEvent(id);

  return {
    title: event ? `Rediger ${event.title} – Kalender` : "Rediger hendelse – Kalender"
  };
}

export default async function EditCalendarEventPage({ params }: EditEventPageProps) {
  const { id } = await params;
  const event = getEvent(id);

  if (!event) {
    notFound();
  }

  return <CalendarEventFormClient mode="edit" event={event} />;
}
