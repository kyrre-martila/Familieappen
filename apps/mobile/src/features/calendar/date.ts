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

export function getCalendarDayRange(date: string) {
  return { from: `${date}T00:00:00.000Z`, to: `${date}T23:59:59.999Z` };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
  return asUtc - date.getTime();
}

function zonedLocalTimeToUtcIso(input: { date: string; hour: number; minute: number; second: number; millisecond: number; timeZone: string }) {
  const [year, month, day] = input.date.split("-").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, input.hour, input.minute, input.second, input.millisecond);
  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), input.timeZone);
  const firstUtc = utcGuess - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(new Date(firstUtc), input.timeZone);
  return new Date(utcGuess - secondOffset).toISOString();
}

export function getCalendarDayRangeForTimeZone(date: string, timeZone = "Europe/Oslo") {
  const nextDate = formatDateString(addDays(parseDateString(date), 1));
  const from = zonedLocalTimeToUtcIso({ date, hour: 0, minute: 0, second: 0, millisecond: 0, timeZone });
  const nextMidnight = zonedLocalTimeToUtcIso({ date: nextDate, hour: 0, minute: 0, second: 0, millisecond: 0, timeZone });
  return { from, to: new Date(Date.parse(nextMidnight) - 1).toISOString() };
}


export function getCalendarMonthRangeForTimeZone(date: string, timeZone = "Europe/Oslo") {
  const value = parseDateString(date);
  const first = formatDateString(new Date(value.getFullYear(), value.getMonth(), 1));
  const afterLast = formatDateString(new Date(value.getFullYear(), value.getMonth() + 1, 1));
  const from = zonedLocalTimeToUtcIso({ date: first, hour: 0, minute: 0, second: 0, millisecond: 0, timeZone });
  const nextMidnight = zonedLocalTimeToUtcIso({ date: afterLast, hour: 0, minute: 0, second: 0, millisecond: 0, timeZone });
  return { from, to: new Date(Date.parse(nextMidnight) - 1).toISOString() };
}

export function buildMonthDates(date: string) {
  const value = parseDateString(date);
  const days = new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) => formatDateString(new Date(value.getFullYear(), value.getMonth(), index + 1)));
}
