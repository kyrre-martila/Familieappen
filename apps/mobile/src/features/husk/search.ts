import type { SchoolWeekReminderViewModel } from "./models";
import type { TaskViewModel } from "./taskModel";

function normalizeSearchQuery(query: string) {
  return query.trim().toLocaleLowerCase("nb-NO");
}

function matchesQuery(query: string, values: Array<string | null | undefined>) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;
  return values
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLocaleLowerCase("nb-NO").includes(normalized));
}

export function filterTasksByQuery(tasks: TaskViewModel[], query: string) {
  return tasks.filter((task) =>
    matchesQuery(query, [
      task.title,
      task.description,
      task.assigneeLabel,
      task.dueLabel,
    ]),
  );
}

export function filterSchoolWeekByQuery(
  items: SchoolWeekReminderViewModel[],
  query: string,
) {
  return items.filter((item) =>
    matchesQuery(query, [
      item.title,
      item.note,
      item.childLabel,
      item.dayLabel,
    ]),
  );
}
