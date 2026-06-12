"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CalendarMvpEventIcon,
  CalendarViewMode,
  MealSummary,
  ReminderSummary,
} from "@familieappen/shared";

import {
  addCalendarEvent,
  deleteCalendarEvent as deleteBackendCalendarEvent,
  getCalendarEvents,
  getSchoolWeekReminders,
  updateCalendarEvent as updateBackendCalendarEvent,
  type CalendarEvent as BackendCalendarEvent,
  type SchoolWeekReminder as BackendSchoolWeekReminder,
} from "../../../lib/api";
import { getUserFacingApiMessage } from "../../../lib/auth-family";
import { mockToday } from "../../../app/calendar/mockCalendarData";
import { remapLegacyMemberIds } from "../../family/familyMemberAdapters";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";
import { useReminders } from "../../husk/hooks/useReminders";
import { useMeals } from "../../meals/hooks/useMeals";
import type { CalendarEvent, CalendarFamilyMember } from "../../types";

export type CalendarEventInput = Partial<CalendarEvent> &
  Pick<CalendarEvent, "title" | "date">;

export type NormalizedCalendarItem = {
  id: string;
  type: "event" | "meal" | "reminder" | "school-week";
  date: string;
  title: string;
  icon: CalendarMvpEventIcon;
  participantIds: string[];
  sortTime: string;
};

export type CalendarContract = {
  events: CalendarEvent[];
  normalizedItems: NormalizedCalendarItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  ensureSchoolWeeksForRange: (
    fromDate: string,
    toDate: string,
  ) => Promise<void>;
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
  createEvent: (input: CalendarEventInput) => Promise<CalendarEvent>;
  updateEvent: (
    id: string,
    update: Partial<CalendarEvent>,
  ) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
};

const CalendarContext = createContext<CalendarContract | null>(null);
const CALENDAR_ERROR_COPY = "Kunne ikke hente kalenderen akkurat nå";

function getTodayString() {
  return formatLocalDateString(new Date());
}

function getCalendarRange(today: string) {
  const [year] = today.split("-").map(Number);

  return {
    from: `${year - 1}-01-01T00:00:00.000Z`,
    to: `${year + 1}-12-31T23:59:59.999Z`,
  };
}

function parseLocalDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addLocalDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + amount);

  return nextDate;
}

function startOfMondayWeek(date: Date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  return addLocalDays(date, mondayOffset);
}

function getWeekStartString(date: string) {
  return formatLocalDateString(startOfMondayWeek(parseLocalDateString(date)));
}

function getWeekStartsInRange(fromDate: string, toDate: string) {
  const weekStarts: string[] = [];
  let currentWeek = startOfMondayWeek(parseLocalDateString(fromDate));
  const endWeek = startOfMondayWeek(parseLocalDateString(toDate));

  while (currentWeek <= endWeek) {
    weekStarts.push(formatLocalDateString(currentWeek));
    currentWeek = addLocalDays(currentWeek, 7);
  }

  return weekStarts;
}

function toBackendDateTime(
  date: string,
  time: string | null | undefined,
  allDay: boolean,
) {
  return `${date}T${allDay || !time ? "00:00" : time}:00.000Z`;
}

function toReminderMinutes(
  reminder: CalendarEvent["reminder"] | undefined,
): number | null | undefined {
  if (reminder === undefined) {
    return undefined;
  }

  return reminder?.minutesBefore ?? null;
}

function toBackendInput(input: CalendarEventInput) {
  const allDay = input.allDay ?? true;

  return {
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    icon: input.icon ?? "family",
    reminderMinutesBefore: toReminderMinutes(input.reminder),
    startsAt: toBackendDateTime(input.date, input.startTime, allDay),
    endsAt:
      allDay || !input.endTime
        ? null
        : toBackendDateTime(input.date, input.endTime, allDay),
    allDay,
    participantFamilyMemberIds: input.participantIds ?? [],
  };
}

function toBackendUpdate(update: Partial<CalendarEvent>) {
  const hasDateOrTimeChange =
    update.date !== undefined ||
    update.startTime !== undefined ||
    update.allDay !== undefined;
  const allDay = update.allDay ?? false;

  return {
    ...(update.title !== undefined ? { title: update.title } : {}),
    ...(update.description !== undefined
      ? { description: update.description ?? null }
      : {}),
    ...(update.location !== undefined
      ? { location: update.location ?? null }
      : {}),
    ...(update.icon !== undefined ? { icon: update.icon } : {}),
    ...(update.reminder !== undefined
      ? { reminderMinutesBefore: toReminderMinutes(update.reminder) }
      : {}),
    ...(hasDateOrTimeChange && update.date
      ? { startsAt: toBackendDateTime(update.date, update.startTime, allDay) }
      : {}),
    ...(update.endTime !== undefined || update.allDay !== undefined
      ? {
          endsAt:
            update.allDay || !update.endTime || !update.date
              ? null
              : toBackendDateTime(update.date, update.endTime, allDay),
        }
      : {}),
    ...(update.allDay !== undefined ? { allDay: update.allDay } : {}),
    ...(update.participantIds !== undefined
      ? { participantFamilyMemberIds: update.participantIds }
      : {}),
  };
}

function createOptimisticCalendarEvent(
  input: CalendarEventInput,
): CalendarEvent {
  const now = new Date().toISOString();

  return {
    id: input.id ?? `optimistic-event-${Date.now()}`,
    familyId: input.familyId,
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
    createdByMemberId: input.createdByMemberId ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    pending: true,
  };
}

function toCalendarEvent(event: BackendCalendarEvent): CalendarEvent {
  return {
    id: event.id,
    familyId: event.familyId,
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    allDay: event.allDay,
    location: event.location,
    description: event.description,
    icon: isCalendarIcon(event.icon) ? event.icon : "family",
    participantIds: event.participants.map(
      (participant) => participant.familyMemberId,
    ),
    source: event.source === "ics" ? "ics" : "manual",
    isImported: event.source === "ics",
    reminder: event.reminder,
    recurrence: null,
    createdByMemberId: null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function isCalendarIcon(icon: string): icon is CalendarEvent["icon"] {
  return [
    "sport",
    "school",
    "birthday",
    "health",
    "travel",
    "family",
    "meal",
  ].includes(icon);
}

function schoolWeekReminderToCalendarEvent(
  item: BackendSchoolWeekReminder,
): CalendarEvent | null {
  const date = item.occurrenceDate ?? item.date;

  if (!date) {
    return null;
  }

  return {
    id: `school-week-${item.id}-${date}`,
    familyId: item.familyId,
    title: item.title,
    date,
    startTime: null,
    endTime: null,
    allDay: true,
    location: "Skoleuka",
    description: item.note ?? null,
    icon: "school",
    participantIds: item.childFamilyMemberId ? [item.childFamilyMemberId] : [],
    source: "school-week",
    isImported: false,
    reminder: null,
    recurrence: item.isRecurring ? { rule: "FREQ=WEEKLY" } : null,
  };
}

function buildNormalizedItems(
  calendarEvents: CalendarEvent[],
  reminders: ReminderSummary[],
  mealSummaries: MealSummary[],
): NormalizedCalendarItem[] {
  return [
    ...calendarEvents.map((event) => ({
      id: event.id,
      type:
        event.source === "school-week"
          ? ("school-week" as const)
          : ("event" as const),
      date: event.date,
      title: event.title,
      icon: event.icon,
      participantIds: event.participantIds,
      sortTime: event.startTime ?? "00:00",
    })),
    ...reminders.map((reminder) => ({
      id: reminder.id,
      type: "reminder" as const,
      date: reminder.date,
      title: reminder.title,
      icon: isCalendarIcon(reminder.icon) ? reminder.icon : "family",
      participantIds: reminder.participantIds,
      sortTime: "23:58",
    })),
    ...mealSummaries.map((meal) => ({
      id: `meal-${meal.date}-${meal.title}`,
      type: "meal" as const,
      date: meal.date,
      title: meal.title,
      icon: "meal" as const,
      participantIds: [],
      sortTime: "23:59",
    })),
  ].sort(
    (first, second) =>
      first.date.localeCompare(second.date) ||
      first.sortTime.localeCompare(second.sortTime) ||
      first.title.localeCompare(second.title, "nb"),
  );
}

function useCalendarContractValue(): CalendarContract {
  const {
    family,
    familyMembers,
    loading: familyMembersLoading,
    error: familyMembersError,
    refresh: refreshFamilyMembers,
  } = useFamilyMembers();
  const today = useMemo(() => getTodayString(), []);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [backendSchoolWeekItems, setBackendSchoolWeekItems] = useState<
    BackendSchoolWeekReminder[]
  >([]);
  const [fetchedSchoolWeeks, setFetchedSchoolWeeks] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    reminders,
    error: remindersError,
    refresh: refreshReminders,
  } = useReminders();
  const { meals, error: mealsError, refresh: refreshMeals } = useMeals();
  const [selectedDate, setSelectedDate] = useState(today || mockToday);
  const [selectedView, setSelectedView] = useState<CalendarViewMode>("day");
  const [mealSummaries, setMealSummaries] = useState<MealSummary[]>([]);
  const activeFamilyId = family?.id ?? null;

  const refresh = useCallback(async () => {
    if (!activeFamilyId) {
      setEvents([]);
      setMealSummaries([]);
      setLoading(familyMembersLoading);
      setError(null);
      return;
    }

    setError(null);

    try {
      const range = getCalendarRange(today);
      const backendEvents = await getCalendarEvents(activeFamilyId, range);
      setEvents(backendEvents.map(toCalendarEvent));
      await Promise.all([refreshMeals(), refreshReminders()]);
    } catch (refreshError) {
      setError(getUserFacingApiMessage(refreshError, CALENDAR_ERROR_COPY));
    } finally {
      setLoading(false);
    }
  }, [
    activeFamilyId,
    familyMembersLoading,
    refreshMeals,
    refreshReminders,
    today,
  ]);

  const ensureSchoolWeeksForRange = useCallback(
    async (fromDate: string, toDate: string) => {
      if (!activeFamilyId) {
        setBackendSchoolWeekItems([]);
        setFetchedSchoolWeeks(new Set());
        return;
      }

      const missingWeekStarts = getWeekStartsInRange(fromDate, toDate).filter(
        (weekStart) => !fetchedSchoolWeeks.has(weekStart),
      );

      if (missingWeekStarts.length === 0) {
        return;
      }

      try {
        const results = await Promise.all(
          missingWeekStarts.map(async (weekStart) => ({
            weekStart,
            items: await getSchoolWeekReminders(activeFamilyId, weekStart),
          })),
        );

        setBackendSchoolWeekItems((currentItems) => {
          const nextByOccurrence = new Map(
            currentItems.map((item) => [
              `${item.id}:${item.occurrenceDate ?? item.date ?? ""}`,
              item,
            ]),
          );

          for (const result of results) {
            for (const item of result.items) {
              nextByOccurrence.set(
                `${item.id}:${item.occurrenceDate ?? item.date ?? ""}`,
                item,
              );
            }
          }

          return Array.from(nextByOccurrence.values());
        });
        setFetchedSchoolWeeks((currentWeeks) => {
          const nextWeeks = new Set(currentWeeks);
          missingWeekStarts.forEach((weekStart) => nextWeeks.add(weekStart));
          return nextWeeks;
        });
      } catch (schoolWeekError) {
        setError(
          getUserFacingApiMessage(
            schoolWeekError,
            "Kunne ikke hente skoleuka akkurat nå",
          ),
        );
      }
    },
    [activeFamilyId, fetchedSchoolWeeks],
  );

  useEffect(() => {
    void ensureSchoolWeeksForRange(
      getWeekStartString(today),
      formatLocalDateString(addLocalDays(parseLocalDateString(today), 34)),
    );
  }, [ensureSchoolWeeksForRange, today]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setMealSummaries(
      meals
        .filter((meal) => Boolean(meal.date))
        .map((meal) => ({ date: meal.date as string, title: meal.title })),
    );
  }, [meals]);

  useEffect(() => {
    const crossModuleError = remindersError ?? mealsError;

    if (crossModuleError && !error) {
      setError(crossModuleError);
    }
  }, [error, mealsError, remindersError]);

  const manualCalendarEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        participantIds: remapLegacyMemberIds(
          event.participantIds,
          familyMembers,
        ),
      })),
    [events, familyMembers],
  );
  const schoolWeekCalendarEvents = useMemo(
    () =>
      backendSchoolWeekItems
        .map(schoolWeekReminderToCalendarEvent)
        .filter((event): event is CalendarEvent => Boolean(event))
        .map((event) => ({
          ...event,
          participantIds: remapLegacyMemberIds(
            event.participantIds,
            familyMembers,
          ),
        })),
    [backendSchoolWeekItems, familyMembers],
  );
  const calendarEvents = useMemo(
    () =>
      [...manualCalendarEvents, ...schoolWeekCalendarEvents].sort(
        (firstEvent, secondEvent) =>
          firstEvent.date.localeCompare(secondEvent.date) ||
          (firstEvent.startTime ?? "00:00").localeCompare(
            secondEvent.startTime ?? "00:00",
          ) ||
          firstEvent.title.localeCompare(secondEvent.title, "nb"),
      ),
    [manualCalendarEvents, schoolWeekCalendarEvents],
  );
  const calendarReminders = useMemo(
    () =>
      reminders.map(
        (reminder) =>
          ({
            id: reminder.id,
            date: reminder.dueDate ?? today,
            title: reminder.title,
            icon:
              reminder.icon === "gift" || reminder.icon === "backpack"
                ? reminder.icon
                : "family",
            participantIds: remapLegacyMemberIds(
              reminder.memberIds,
              familyMembers,
            ),
          }) satisfies ReminderSummary,
      ),
    [familyMembers, reminders, today],
  );

  const normalizedItems = useMemo(
    () =>
      buildNormalizedItems(calendarEvents, calendarReminders, mealSummaries),
    [calendarEvents, calendarReminders, mealSummaries],
  );

  const createEvent = useCallback(
    async (input: CalendarEventInput) => {
      if (!activeFamilyId) {
        throw new Error("Choose a family before continuing.");
      }

      const optimisticEvent = createOptimisticCalendarEvent({
        ...input,
        familyId: activeFamilyId,
      });
      setEvents((currentEvents) => [...currentEvents, optimisticEvent]);

      try {
        const backendEvent = await addCalendarEvent(
          activeFamilyId,
          toBackendInput(input),
        );
        const savedEvent = toCalendarEvent(backendEvent);
        setEvents((currentEvents) =>
          currentEvents.map((event) =>
            event.id === optimisticEvent.id ? savedEvent : event,
          ),
        );
        return savedEvent;
      } catch (createError) {
        setEvents((currentEvents) =>
          currentEvents.filter((event) => event.id !== optimisticEvent.id),
        );
        setError(
          getUserFacingApiMessage(
            createError,
            "Kunne ikke lagre hendelsen akkurat nå",
          ),
        );
        throw createError;
      }
    },
    [activeFamilyId],
  );

  const updateEvent = useCallback(
    async (id: string, update: Partial<CalendarEvent>) => {
      if (!activeFamilyId) {
        throw new Error("Choose a family before continuing.");
      }

      const previousEvents = events;
      const previousEvent = previousEvents.find((event) => event.id === id);

      if (!previousEvent) {
        throw new Error("Calendar event was not found");
      }

      const optimisticEvent = { ...previousEvent, ...update, pending: true };
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === id ? optimisticEvent : event,
        ),
      );

      try {
        const backendEvent = await updateBackendCalendarEvent(
          activeFamilyId,
          id,
          toBackendUpdate({ ...previousEvent, ...update }),
        );
        const savedEvent = toCalendarEvent(backendEvent);
        setEvents((currentEvents) =>
          currentEvents.map((event) => (event.id === id ? savedEvent : event)),
        );
        return savedEvent;
      } catch (updateError) {
        setEvents(previousEvents);
        setError(
          getUserFacingApiMessage(
            updateError,
            "Kunne ikke lagre hendelsen akkurat nå",
          ),
        );
        throw updateError;
      }
    },
    [activeFamilyId, events],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!activeFamilyId) {
        throw new Error("Choose a family before continuing.");
      }

      const previousEvents = events;
      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== id),
      );

      try {
        await deleteBackendCalendarEvent(activeFamilyId, id);
      } catch (deleteError) {
        setEvents(previousEvents);
        setError(
          getUserFacingApiMessage(
            deleteError,
            "Kunne ikke slette hendelsen akkurat nå",
          ),
        );
        throw deleteError;
      }
    },
    [activeFamilyId, events],
  );

  return useMemo(
    () => ({
      events: calendarEvents,
      normalizedItems,
      loading,
      error,
      refresh,
      ensureSchoolWeeksForRange,
      reminders: calendarReminders,
      mealSummaries,
      familyMembers,
      familyMembersLoading,
      familyMembersError,
      refreshFamilyMembers,
      today,
      selectedDate,
      selectedView,
      setSelectedDate,
      setSelectedView,
      createEvent,
      updateEvent,
      deleteEvent,
    }),
    [
      calendarEvents,
      calendarReminders,
      createEvent,
      deleteEvent,
      ensureSchoolWeeksForRange,
      error,
      familyMembers,
      familyMembersError,
      familyMembersLoading,
      loading,
      mealSummaries,
      normalizedItems,
      refresh,
      refreshFamilyMembers,
      selectedDate,
      selectedView,
      today,
      updateEvent,
    ],
  );
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const value = useCalendarContractValue();

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);

  if (!context) {
    throw new Error("useCalendar must be used within CalendarProvider");
  }

  return context;
}
