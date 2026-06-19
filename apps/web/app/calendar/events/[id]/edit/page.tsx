import type { Metadata } from "next";

import { CalendarProvider } from "../../../../../features/calendar/hooks/useCalendar";
import { CalendarEventEditClient } from "../../CalendarEventEditClient";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ occurrenceDate?: string; scope?: "occurrence" | "series" }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Rediger hendelse – Kalender"
  };
}

export default async function EditCalendarEventPage({ params, searchParams }: EditEventPageProps) {
  const { id } = await params;
  const { occurrenceDate, scope } = await searchParams;

  return (
    <CalendarProvider>
      <CalendarEventEditClient eventId={id} occurrenceDate={occurrenceDate} scope={scope} />
    </CalendarProvider>
  );
}
