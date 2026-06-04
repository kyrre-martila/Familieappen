"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CalendarViewMode, MealSummary, ReminderSummary } from "@familieappen/shared";

import {
  calendarEvents as mockCalendarEvents,
  mockToday,
  reminders as mockReminders,
} from "../../../app/calendar/mockCalendarData";
import { getMockMealSummariesFromStartDate } from "../../../app/meals/mockMealPlanData";
import { remapLegacyMemberIds } from "../../family/familyMemberAdapters";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";
import type { CalendarEvent, CalendarFamilyMember } from "../../types";

export type CalendarEventInput = Partial<CalendarEvent> & Pick<CalendarEvent, "title" | "date">;

export type CalendarContract = {
  events: CalendarEvent[];
  reminders: ReminderSummary[];
  mealSummaries: MealSummary[];
  familyMembers: CalendarFamilyMember[];
  familyMembersLoading: boolean;
  familyMembersError: string | null;
  refreshFamilyMembers: () => Promise<void>;
  today: string;
  selectedDate: string;
  selectedView: CalendarViewMode;
  setSelectedDate: (date: string) => void;
  setSelectedView: (view: CalendarViewMode) => void;
  createEvent: (input: CalendarEventInput) => CalendarEvent;
  updateEvent: (id: string, update: Partial<CalendarEvent>) => void;
};

const CalendarContext = createContext<CalendarContract | null>(null);

function createCalendarEvent(input: CalendarEventInput): CalendarEvent {
  return {
    id: input.id ?? `mock-event-${Date.now()}`,
    title: input.title,
    date: input.date,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    allDay: input.allDay ?? true,
    location: input.location ?? null,
    description: input.description ?? null,
    icon: input.icon ?? "family",
    participantIds: input.participantIds ?? [],
    source: input.source ?? "manual",
    isImported: input.isImported ?? false,
    reminder: input.reminder ?? null,
    recurrence: input.recurrence ?? null,
  };
}

function useCalendarContractValue(): CalendarContract {
  const { familyMembers, loading: familyMembersLoading, error: familyMembersError, refresh: refreshFamilyMembers } = useFamilyMembers();
  const [events, setEvents] = useState<CalendarEvent[]>(mockCalendarEvents);
  const [reminders] = useState<ReminderSummary[]>(mockReminders);
  const [selectedDate, setSelectedDate] = useState(mockToday);
  const [selectedView, setSelectedView] = useState<CalendarViewMode>("day");
  const mealSummaries = useMemo(
    () => getMockMealSummariesFromStartDate(mockToday),
    [],
  );
  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        participantIds: remapLegacyMemberIds(event.participantIds, familyMembers),
      })),
    [events, familyMembers],
  );
  const calendarReminders = useMemo(
    () =>
      reminders.map((reminder) => ({
        ...reminder,
        participantIds: remapLegacyMemberIds(reminder.participantIds, familyMembers),
      })),
    [familyMembers, reminders],
  );

  function createEvent(input: CalendarEventInput) {
    const event = createCalendarEvent(input);
    setEvents((currentEvents) => [...currentEvents, event]);
    return event;
  }

  function updateEvent(id: string, update: Partial<CalendarEvent>) {
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === id ? { ...event, ...update } : event,
      ),
    );
  }

  return useMemo(
    () => ({
      events: calendarEvents,
      reminders: calendarReminders,
      mealSummaries,
      familyMembers,
      familyMembersLoading,
      familyMembersError,
      refreshFamilyMembers,
      today: mockToday,
      selectedDate,
      selectedView,
      setSelectedDate,
      setSelectedView,
      createEvent,
      updateEvent,
    }),
    [calendarEvents, calendarReminders, familyMembers, familyMembersError, familyMembersLoading, mealSummaries, selectedDate, selectedView, refreshFamilyMembers],
  );
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const value = useCalendarContractValue();

  return (
    <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  const fallbackContext = useCalendarContractValue();

  return context ?? fallbackContext;
}
