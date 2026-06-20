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
  CalendarEventRecurrenceFrequency,
  CalendarViewMode,
  MealSummary,
  ReminderSummary,
} from "@familieappen/shared";

import {
  addCalendarEvent,
  deleteCalendarEvent as deleteBackendCalendarEvent,
  deleteCalendarEventOccurrence,
  getCalendarEvents,
  getSchoolWeekReminders,
  getTasks,
  updateCalendarEvent as updateBackendCalendarEvent,
  updateCalendarEventOccurrence,
  type CalendarEvent as BackendCalendarEvent,
  type SchoolWeekReminder as BackendSchoolWeekReminder,
  type Task,
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
  type: "event" | "meal" | "reminder" | "school-week" | "task";
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
  tasks: Task[];
  today: string;
  selectedDate: string;
  selectedView: CalendarViewMode;
  setSelectedDate: (date: string) => void;
  setSelectedView: (view: CalendarViewMode) => void;
  createEvent: (input: CalendarEventInput) => Promise<CalendarEvent>;
  updateEvent: (
    id: string,
    update: Partial<CalendarEvent>,
    scope?: "occurrence" | "series",
  ) => Promise<CalendarEvent>;
  deleteEvent: (id: string, scope?: "occurrence" | "series") => Promise<void>;
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

function toRecurrenceFrequency(recurrence: CalendarEvent["recurrence"] | undefined): CalendarEventRecurrenceFrequency | undefined {
  if (recurrence === undefined) return undefined;
  return recurrence?.frequency ?? "never";
}

function toBackendInput(input: CalendarEventInput) {
  const allDay = input.allDay ?? true;
  const endDate = input.endDate || input.date;

  return {
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    icon: input.icon ?? "family",
    reminderMinutesBefore: toReminderMinutes(input.reminder),
    startsAt: toBackendDateTime(input.date, input.startTime, allDay),
    endsAt: toBackendDateTime(endDate, allDay ? null : input.endTime, allDay),
    allDay,
    recurrenceFrequency: toRecurrenceFrequency(input.recurrence) ?? "never",
    recurrenceUntil: input.recurrence?.until ?? input.recurrenceUntil ?? null,
    participantFamilyMemberIds: input.participantIds ?? [],
  };
}

function toBackendUpdate(update: Partial<CalendarEvent>) {
  const hasDateOrTimeChange =
    update.date !== undefined ||
    update.startTime !== undefined ||
    update.endDate !== undefined ||
    update.allDay !== undefined;
  const allDay = update.allDay ?? false;
  const endDate = update.endDate || update.date;

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
    ...(update.endTime !== undefined || update.endDate !== undefined || update.allDay !== undefined
      ? {
          endsAt:
            update.date && endDate
              ? toBackendDateTime(endDate, allDay ? null : update.endTime, allDay)
              : undefined,
        }
      : {}),
    ...(update.allDay !== undefined ? { allDay: update.allDay } : {}),
    ...(update.recurrence !== undefined
      ? { recurrenceFrequency: toRecurrenceFrequency(update.recurrence), recurrenceUntil: update.recurrence?.until ?? update.recurrenceUntil ?? null }
      : {}),
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
    endDate: input.endDate ?? input.date,
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
    endDate: event.endDate ?? event.date,
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
    recurrence: event.recurrence,
    recurrenceUntil: event.recurrenceUntil ?? event.recurrence?.until ?? null,
    recurringEventId: event.recurringEventId,
    occurrenceDate: event.occurrenceDate,
    isRecurringOccurrence: event.isRecurringOccurrence,
    createdByMemberId: null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function isSavedRecurringOccurrenceNotFoundError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /Calendar occurrence was not found|forekomst.*ikke funnet|hendelsen finnes ikke/i.test(message);
}

function isSameRecurringOccurrence(
  event: CalendarEvent,
  identity: { id: string; recurringEventId: string; occurrenceDate?: string },
) {
  return (
    event.id === identity.id ||
    (Boolean(identity.occurrenceDate) &&
      event.recurringEventId === identity.recurringEventId &&
      event.occurrenceDate === identity.occurrenceDate)
  );
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
    endDate: date,
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
    recurrence: item.isRecurring ? { frequency: "weekly" } : null,
  };
}

function buildNormalizedItems(
  calendarEvents: CalendarEvent[],
  reminders: ReminderSummary[],
  mealSummaries: MealSummary[],
  tasks: Task[],
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
    ...tasks
      .filter((task) => Boolean(task.dueDate))
      .map((task) => ({
        id: task.id,
        type: "task" as const,
        date: task.dueDate!.slice(0, 10),
        title: task.title,
        icon: "family" as const,
        participantIds: task.assignedMemberIds ?? (task.assignedFamilyMemberId ? [task.assignedFamilyMemberId] : []),
        sortTime: "23:57",
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const activeFamilyId = family?.id ?? null;

  const refresh = useCallback(async () => {
    if (!activeFamilyId) {
      setEvents([]);
      setMealSummaries([]);
      setTasks([]);
      setLoading(familyMembersLoading);
      setError(null);
      return;
    }

    setError(null);

    try {
      const range = getCalendarRange(today);
      const backendEvents = await getCalendarEvents(activeFamilyId, range);
      setEvents(backendEvents.map(toCalendarEvent));
      const [taskItems] = await Promise.all([getTasks(activeFamilyId), refreshMeals(), refreshReminders()]);
      setTasks(Array.isArray(taskItems) ? taskItems : []);
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
      buildNormalizedItems(calendarEvents, calendarReminders, mealSummaries, tasks),
    [calendarEvents, calendarReminders, mealSummaries, tasks],
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
    async (id: string, update: Partial<CalendarEvent>, scope: "occurrence" | "series" = "series") => {
      if (!activeFamilyId) {
        throw new Error("Choose a family before continuing.");
      }

      const previousEvents = events;
      const previousEvent = previousEvents.find((event) => event.id === id);

      if (!previousEvent) {
        throw new Error("Calendar event was not found");
      }

      const seriesEventId = previousEvent.recurringEventId ?? id;
      const occurrenceIdentity = {
        id,
        recurringEventId: seriesEventId,
        occurrenceDate: previousEvent.occurrenceDate,
      };
      const optimisticEvent = { ...previousEvent, ...update, pending: true };
      setEvents((currentEvents) =>
        currentEvents.map((event) => {
          if (scope === "occurrence") {
            return isSameRecurringOccurrence(event, occurrenceIdentity)
              ? optimisticEvent
              : event;
          }

          return event.id === id ||
            event.recurringEventId === seriesEventId ||
            event.id === seriesEventId
            ? { ...event, ...update, pending: true }
            : event;
        }),
      );

      try {
        const payload = toBackendUpdate({ ...previousEvent, ...update });
        const backendEvent = scope === "occurrence" && previousEvent.occurrenceDate
          ? await updateCalendarEventOccurrence(activeFamilyId, seriesEventId, previousEvent.occurrenceDate, payload)
          : await updateBackendCalendarEvent(activeFamilyId, seriesEventId, payload);
        const savedEvent = toCalendarEvent(backendEvent);
        const canReplaceOccurrence =
          scope !== "occurrence" ||
          events.some((event) => isSameRecurringOccurrence(event, occurrenceIdentity));
        setEvents((currentEvents) => {
          const nextEvents = currentEvents.map((event) => {
            if (scope === "occurrence") {
              if (isSameRecurringOccurrence(event, occurrenceIdentity)) {
                return savedEvent;
              }

              return event;
            }

            if (
              event.id === id ||
              event.recurringEventId === seriesEventId ||
              event.id === seriesEventId
            ) {
              return {
                ...event,
                ...savedEvent,
                id: event.id,
                date: event.date,
                endDate: event.endDate,
                recurringEventId: event.recurringEventId,
                occurrenceDate: event.occurrenceDate,
                isRecurringOccurrence: event.isRecurringOccurrence,
                pending: false,
              };
            }

            return event;
          });

          return nextEvents;
        });
        if (scope === "occurrence" && !canReplaceOccurrence) {
          void refresh();
        }
        if (scope === "series") {
          void refresh();
        }

        return scope === "series" && previousEvent.isRecurringOccurrence
          ? {
              ...previousEvent,
              ...savedEvent,
              id: previousEvent.id,
              date: previousEvent.date,
              endDate: previousEvent.endDate,
              recurringEventId: seriesEventId,
              occurrenceDate: previousEvent.occurrenceDate,
              isRecurringOccurrence: true,
              pending: false,
            }
          : savedEvent;
      } catch (updateError) {
        if (scope === "occurrence" && isSavedRecurringOccurrenceNotFoundError(updateError)) {
          const savedOccurrence = { ...optimisticEvent, pending: false };

          setEvents((currentEvents) =>
            currentEvents.map((event) =>
              isSameRecurringOccurrence(event, occurrenceIdentity)
                ? savedOccurrence
                : event,
            ),
          );
          void refresh();

          return savedOccurrence;
        }

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
    [activeFamilyId, events, refresh],
  );

  const deleteEvent = useCallback(
    async (id: string, scope: "occurrence" | "series" = "series") => {
      if (!activeFamilyId) {
        throw new Error("Choose a family before continuing.");
      }

      const previousEvents = events;
      const previousEvent = previousEvents.find((event) => event.id === id);
      const seriesEventId = previousEvent?.recurringEventId ?? id;
      setEvents((currentEvents) =>
        scope === "occurrence"
          ? currentEvents.filter((event) => event.id !== id)
          : currentEvents.filter((event) => event.id !== id && event.recurringEventId !== seriesEventId && event.id !== seriesEventId),
      );

      try {
        if (scope === "occurrence" && previousEvent?.occurrenceDate) {
          await deleteCalendarEventOccurrence(activeFamilyId, seriesEventId, previousEvent.occurrenceDate);
        } else {
          await deleteBackendCalendarEvent(activeFamilyId, seriesEventId);
        }
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
      tasks,
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
      tasks,
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
