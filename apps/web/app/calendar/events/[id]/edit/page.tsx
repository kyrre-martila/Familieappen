import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { calendarEvents } from "../../../mockCalendarData";
import { Card, EmptyState, PageContainer } from "../../../../../components/ui";

interface EditEventPlaceholderPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditEventPlaceholderPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = calendarEvents.find((calendarEvent) => calendarEvent.id === id);

  return {
    title: event ? `Rediger ${event.title} – Kalender` : "Rediger hendelse – Kalender"
  };
}

export default async function EditEventPlaceholderPage({ params }: EditEventPlaceholderPageProps) {
  const { id } = await params;
  const event = calendarEvents.find((calendarEvent) => calendarEvent.id === id);

  return (
    <main className="event-edit-placeholder" aria-labelledby="event-edit-placeholder-title">
      <Link className="event-edit-placeholder__back" href={`/calendar/events/${id}`} aria-label="Tilbake til hendelsen">
        <ChevronLeft aria-hidden="true" size={28} strokeWidth={2.7} />
      </Link>
      <PageContainer>
        <Card tone="default">
          <EmptyState
            title={event ? `Rediger ${event.title}` : "Rediger hendelse"}
            description="Redigeringsskjema kommer senere. Denne siden er en midlertidig plassholder."
          />
          <h1 className="sr-only" id="event-edit-placeholder-title">Rediger hendelse</h1>
        </Card>
      </PageContainer>
    </main>
  );
}
