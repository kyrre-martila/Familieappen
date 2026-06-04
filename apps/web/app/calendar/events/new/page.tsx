import type { Metadata } from "next";

import { CalendarProvider } from "../../../../features/calendar/hooks/useCalendar";
import { CalendarEventFormClient } from "../EventFormClient";

export const metadata: Metadata = {
  title: "Ny hendelse – Kalender"
};

export default function NewCalendarEventPage() {
  return (
    <CalendarProvider>
      <CalendarEventFormClient mode="create" />
    </CalendarProvider>
  );
}
