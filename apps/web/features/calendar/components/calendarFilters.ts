import type { CalendarMvpEvent, MealSummary, ReminderSummary, Task } from "@familieappen/shared";

import { defaultListFilters } from "./calendarConfig";
import type {
  CalendarCategoryFilter,
  CalendarContentTypeFilter,
  CalendarListDayGroup,
  CalendarListFilters,
} from "./calendarTypes";

export function countActiveListFilters(filters: CalendarListFilters) {
  return (
    Number(filters.contentType !== defaultListFilters.contentType) +
    Number(filters.familyMemberId !== defaultListFilters.familyMemberId) +
    Number(filters.category !== defaultListFilters.category)
  );
}

function contentTypeAllows(
  filters: CalendarListFilters,
  contentType: Exclude<CalendarContentTypeFilter, "all">,
) {
  return filters.contentType === "all" || filters.contentType === contentType;
}

function matchesFamilyMember(participantIds: string[], familyMemberId: string) {
  return (
    familyMemberId === "all" ||
    participantIds.length === 0 ||
    participantIds.includes(familyMemberId)
  );
}

function eventMatchesCategory(
  event: CalendarMvpEvent,
  category: CalendarCategoryFilter,
) {
  if (category === "all") {
    return true;
  }

  if (category === "general") {
    return false;
  }

  if (category === "music") {
    return false;
  }

  return event.icon === category;
}

function reminderMatchesCategory(
  reminder: ReminderSummary,
  category: CalendarCategoryFilter,
) {
  if (category === "all") {
    return true;
  }

  if (category === "general") {
    return ["backpack", "flame", "gift", "meal"].includes(reminder.icon);
  }

  if (category === "music") {
    return false;
  }

  return reminder.icon === category;
}

export function buildListDayGroups(
  filters: CalendarListFilters,
  calendarEvents: CalendarMvpEvent[],
  reminders: ReminderSummary[],
  mealPlannerMeals: MealSummary[],
  tasks: Task[] = [],
): CalendarListDayGroup[] {
  const dates = new Set<string>();

  mealPlannerMeals.forEach((meal) => dates.add(meal.date));
  reminders.forEach((reminder) => dates.add(reminder.date));
  calendarEvents.forEach((event) => dates.add(event.date));
  tasks.filter((task) => task.dueDate).forEach((task) => dates.add(task.dueDate!.slice(0, 10)));

  return Array.from(dates)
    .sort((firstDate, secondDate) => firstDate.localeCompare(secondDate))
    .map((date) => {
      const events = contentTypeAllows(filters, "events")
        ? calendarEvents
            .filter((event) => event.date === date)
            .filter((event) =>
              matchesFamilyMember(event.participantIds, filters.familyMemberId),
            )
            .filter((event) => eventMatchesCategory(event, filters.category))
            .sort((firstEvent, secondEvent) =>
              (firstEvent.startTime ?? "00:00").localeCompare(
                secondEvent.startTime ?? "00:00",
              ),
            )
        : [];
      const meal =
        contentTypeAllows(filters, "meals") && filters.category === "all"
          ? mealPlannerMeals.find((item) => item.date === date)
          : undefined;
      const filteredReminders = contentTypeAllows(filters, "reminders")
        ? reminders
            .filter((reminder) => reminder.date === date)
            .filter((reminder) =>
              matchesFamilyMember(
                reminder.participantIds,
                filters.familyMemberId,
              ),
            )
            .filter((reminder) =>
              reminderMatchesCategory(reminder, filters.category),
            )
        : [];

      const filteredTasks = contentTypeAllows(filters, "reminders")
        ? tasks
            .filter((task) => task.dueDate?.slice(0, 10) === date)
            .filter((task) =>
              matchesFamilyMember(
                task.assignedMemberIds ?? (task.assignedFamilyMemberId ? [task.assignedFamilyMemberId] : []),
                filters.familyMemberId,
              ),
            )
        : [];

      return { date, events, meal, reminders: filteredReminders, tasks: filteredTasks };
    })
    .filter(
      (group) =>
        group.meal || group.reminders.length > 0 || group.tasks.length > 0 || group.events.length > 0,
    );
}
