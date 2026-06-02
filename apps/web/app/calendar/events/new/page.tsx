import type { Metadata } from "next";

import { CalendarEventFormClient } from "../EventFormClient";

export const metadata: Metadata = {
  title: "Ny hendelse – Kalender"
};

export default function NewCalendarEventPage() {
  return <CalendarEventFormClient mode="create" />;
}
