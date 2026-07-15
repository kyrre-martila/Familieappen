const selectedDateFormatter = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", weekday: "long", year: "numeric" });
const monthTitleFormatter = new Intl.DateTimeFormat("nb-NO", { month: "long", year: "numeric" });
const shortWeekdayFormatter = new Intl.DateTimeFormat("nb-NO", { weekday: "short" });

export function parseDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + amount);
  return nextDate;
}

export function startOfMondayWeek(date: Date) {
  const day = date.getDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

export function buildWeekDates(selectedDate: string) {
  const weekStart = startOfMondayWeek(parseDateString(selectedDate));
  return Array.from({ length: 7 }, (_, index) => formatDateString(addDays(weekStart, index)));
}

export function getCalendarRange(today: string) {
  const [year] = today.split("-").map(Number);
  return { from: `${year - 1}-01-01T00:00:00.000Z`, to: `${year + 1}-12-31T23:59:59.999Z` };
}

export function getTodayString() {
  return formatDateString(new Date());
}

export function capitalizeDateLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatSelectedDate(date: string) {
  return capitalizeDateLabel(selectedDateFormatter.format(parseDateString(date)));
}

export function formatMonthTitle(date: string) {
  return capitalizeDateLabel(monthTitleFormatter.format(parseDateString(date)));
}

export function formatWeekday(date: string) {
  return shortWeekdayFormatter.format(parseDateString(date)).replace(".", "").toUpperCase();
}
