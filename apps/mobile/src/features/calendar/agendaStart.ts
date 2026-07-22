export type AgendaEventLike = { date: string; startTime?: string | null; startsAt?: string | null };

export function getAgendaStartIndex<T extends AgendaEventLike>(events: T[], today: string) {
  if (events.length === 0) return -1;
  const sorted = [...events].sort((a, b) => `${a.date}T${a.startTime ?? ""}`.localeCompare(`${b.date}T${b.startTime ?? ""}`));
  const todayIndex = sorted.findIndex((event) => event.date === today);
  if (todayIndex >= 0) return todayIndex;
  const futureIndex = sorted.findIndex((event) => event.date > today);
  return futureIndex >= 0 ? futureIndex : sorted.length - 1;
}

export function getAgendaStartDate<T extends AgendaEventLike>(events: T[], today: string) {
  const sorted = [...events].sort((a, b) => `${a.date}T${a.startTime ?? ""}`.localeCompare(`${b.date}T${b.startTime ?? ""}`));
  const index = getAgendaStartIndex(sorted, today);
  return index >= 0 ? sorted[index]?.date ?? null : null;
}


export function shouldRunInitialAgendaScroll({ view, targetDate, didScroll, hasMeasuredTarget }: { view: "day" | "month" | "list"; targetDate: string | null; didScroll: boolean; hasMeasuredTarget: boolean }) {
  return view === "list" && Boolean(targetDate) && !didScroll && hasMeasuredTarget;
}
