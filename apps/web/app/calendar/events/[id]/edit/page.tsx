import type { Metadata } from "next";

import { CalendarProvider } from "../../../../../features/calendar/hooks/useCalendar";
import { CalendarEventEditClient } from "../../CalendarEventEditClient";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Rediger hendelse – Kalender"
  };
}

export default async function EditCalendarEventPage({ params }: EditEventPageProps) {
  const { id } = await params;

  return (
    <CalendarProvider>
      <CalendarEventEditClient eventId={id} />
    </CalendarProvider>
  );
}
