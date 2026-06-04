"use client";

import { Button, Card, EmptyState, PageContainer } from "../../../components/ui";
import { useCalendar } from "../../../features/calendar/hooks/useCalendar";
import { CalendarEventFormClient } from "./EventFormClient";

export function CalendarEventEditClient({ eventId }: { eventId: string }) {
  const { events, loading, error, refresh } = useCalendar();
  const event = events.find((calendarEvent) => calendarEvent.id === eventId) ?? null;

  if (loading) {
    return (
      <main className="event-form-screen" aria-live="polite">
        <PageContainer>
          <Card tone="default">
            <EmptyState title="Henter hendelsen" description="Vent litt mens vi åpner kalenderhendelsen." />
          </Card>
        </PageContainer>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="event-form-screen" aria-live="polite">
        <PageContainer>
          <Card tone="default">
            <EmptyState
              title={error ?? "Kunne ikke hente kalenderen akkurat nå"}
              description="Prøv igjen, eller gå tilbake til kalenderen."
            />
            <Button onClick={() => void refresh()} variant="primary">Prøv igjen</Button>
          </Card>
        </PageContainer>
      </main>
    );
  }

  return <CalendarEventFormClient mode="edit" event={event} />;
}
