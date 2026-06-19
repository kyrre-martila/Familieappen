import type { Metadata } from "next";

import { CalendarProvider } from "../../../../features/calendar/hooks/useCalendar";
import { EventDetailClient } from "./EventDetailClient";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ occurrenceDate?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Hendelse – Kalender"
  };
}

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { id } = await params;
  const { occurrenceDate } = await searchParams;

  return (
    <CalendarProvider>
      <EventDetailClient eventId={id} occurrenceDate={occurrenceDate} />
    </CalendarProvider>
  );
}
