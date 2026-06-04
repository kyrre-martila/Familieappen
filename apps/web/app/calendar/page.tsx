"use client";

import { useState } from "react";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Button, Card, EmptyState, PageContainer } from "../../components/ui";
import { CalendarDateStrip } from "../../features/calendar/components/CalendarDateStrip";
import { CalendarDayView } from "../../features/calendar/components/CalendarDayView";
import { CalendarHeader } from "../../features/calendar/components/CalendarHeader";
import { CalendarListView } from "../../features/calendar/components/CalendarListView";
import { CalendarMonthView } from "../../features/calendar/components/CalendarMonthView";
import { parseDateString } from "../../features/calendar/components/calendarFormatters";
import { CalendarProvider, useCalendar } from "../../features/calendar/hooks/useCalendar";

function CalendarPageContent() {
  const familyAccess = useFamilyAccess();
  const { error, loading, refresh, selectedDate, selectedView, setSelectedDate, setSelectedView, today } = useCalendar();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    parseDateString(today),
  );

  function handleChangeMonth(direction: "previous" | "next") {
    setVisibleMonth(
      (currentMonth) =>
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + (direction === "next" ? 1 : -1),
          1,
        ),
    );
  }

  function handleMonthDateSelect(date: string) {
    setSelectedDate(date);
    setVisibleMonth(parseDateString(date));
    setSelectedView("day");
  }

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Kalender">
        <PageContainer>
          <Card tone="default">
            <EmptyState
              title="Sjekker familietilgang"
              description="Vent litt mens vi bekrefter familietilknytningen din."
            />
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Kalender"
      titleAction={
        <CalendarHeader
          selectedView={selectedView}
          onSelectView={setSelectedView}
        />
      }
    >
      <PageContainer>
        {error ? (
          <Card tone="default">
            <EmptyState title="Kunne ikke hente kalenderen akkurat nå" description="Kalenderen kan prøves på nytt uten at noe går tapt." />
            <Button onClick={() => void refresh()} variant="primary">Prøv igjen</Button>
          </Card>
        ) : null}
        {loading && !error ? (
          <Card tone="default">
            <EmptyState title="Henter kalender" description="Vent litt mens vi finner hendelsene deres." />
          </Card>
        ) : null}
        {selectedView === "day" ? (
          <>
            <CalendarDateStrip
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            <CalendarDayView selectedDate={selectedDate} />
          </>
        ) : null}
        {selectedView === "month" ? (
          <CalendarMonthView
            selectedDate={selectedDate}
            visibleMonth={visibleMonth}
            onChangeMonth={handleChangeMonth}
            onSelectDate={handleMonthDateSelect}
          />
        ) : null}
        {selectedView === "list" ? <CalendarListView /> : null}
      </PageContainer>
    </AppShell>
  );
}

export default function CalendarPage() {
  return (
    <CalendarProvider>
      <CalendarPageContent />
    </CalendarProvider>
  );
}
