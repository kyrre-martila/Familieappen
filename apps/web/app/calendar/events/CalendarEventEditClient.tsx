"use client";

import { Button, Card, EmptyState, PageContainer } from "../../../components/ui";
import { useCalendar } from "../../../features/calendar/hooks/useCalendar";
import { CalendarEventFormClient } from "./EventFormClient";

function resolveCalendarEvent(events: ReturnType<typeof useCalendar>["events"], eventId: string, occurrenceDate?: string) {
  if (occurrenceDate) {
    const occurrence = events.find(
      (calendarEvent) =>
        calendarEvent.recurringEventId === eventId &&
        calendarEvent.occurrenceDate === occurrenceDate,
    );

    if (occurrence) {
      return occurrence;
    }
  }

  const directEvent = events.find((calendarEvent) => calendarEvent.id === eventId);

  if (directEvent) {
    return directEvent;
  }

  return events.find((calendarEvent) => calendarEvent.recurringEventId === eventId) ?? null;
}

export function CalendarEventEditClient({ eventId, occurrenceDate, scope }: { eventId: string; occurrenceDate?: string; scope?: "occurrence" | "series" }) {
  const { events, loading, error, refresh } = useCalendar();
  const event = resolveCalendarEvent(events, eventId, occurrenceDate);

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
              title={error ?? "Hendelsen finnes ikke lenger"}
              description="Prøv igjen, eller gå tilbake til kalenderen."
            />
            <Button onClick={() => void refresh()} variant="primary">Prøv igjen</Button>
          </Card>
        </PageContainer>
      </main>
    );
  }

  return <CalendarEventFormClient mode="edit" event={event} scope={scope} />;
}
