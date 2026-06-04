import type { Metadata } from "next";

import { CalendarProvider } from "../../../../features/calendar/hooks/useCalendar";
import { EventDetailClient } from "./EventDetailClient";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Hendelse – Kalender"
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;

  return (
    <CalendarProvider>
      <EventDetailClient eventId={id} />
    </CalendarProvider>
  );
}
