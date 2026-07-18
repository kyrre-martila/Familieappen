export const schoolWeekChangedEvent = "familieappen:school-week-changed";

export type SchoolWeekChangedDetail = {
  familyId: string;
  weekStart?: string;
};

export function notifySchoolWeekChanged(detail: SchoolWeekChangedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SchoolWeekChangedDetail>(schoolWeekChangedEvent, { detail }));
}
