import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { calendarEvents } from "../../mockCalendarData";
import { EventDetailClient } from "./EventDetailClient";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

function getEvent(id: string) {
  return calendarEvents.find((event) => event.id === id) ?? null;
}

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = getEvent(id);

  return {
    title: event ? `${event.title} – Kalender` : "Hendelse – Kalender"
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = getEvent(id);

  if (!event) {
    notFound();
  }

  return <EventDetailClient event={event} />;
}
