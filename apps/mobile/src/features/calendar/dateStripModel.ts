import { addDays, formatDateString, parseDateString } from "./date";

const MOMENTUM_MS = 260;
const MIN_SNAP_DISTANCE_RATIO = 0.28;
const HORIZONTAL_DOMINANCE_RATIO = 1.25;

export function buildDateStripDates(centerDate: string, before = 180, after = 180) {
  const center = parseDateString(centerDate);
  return Array.from({ length: before + after + 1 }, (_, index) =>
    formatDateString(addDays(center, index - before)),
  );
}

export function getDateStripInitialIndex(before = 180) { return before; }

export function shouldActivateHorizontalDateStrip(dx: number, dy: number) {
  return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * HORIZONTAL_DOMINANCE_RATIO;
}

export function getSnappedDateOffset(input: { dx: number; dy?: number; vx?: number; itemWidth: number }) {
  const { dx, dy = 0, vx = 0, itemWidth } = input;
  if (itemWidth <= 0) return 0;
  if (Math.abs(dx) <= Math.abs(dy) * HORIZONTAL_DOMINANCE_RATIO) return 0;
  const projected = dx + vx * MOMENTUM_MS;
  const rawDays = -projected / itemWidth;
  if (Math.abs(rawDays) < MIN_SNAP_DISTANCE_RATIO) return 0;
  return Math.round(rawDays);
}

export function applyDateOffset(date: string, offset: number) {
  return formatDateString(addDays(parseDateString(date), offset));
}

export function getArrowDateOffset(direction: "back" | "forward") {
  return direction === "forward" ? 1 : -1;
}

export function selectDateAfterSettledStrip(input: { previousSelectedDate: string; firstVisibleDate: string; visibleDates: string[] }) {
  if (input.visibleDates.includes(input.previousSelectedDate)) return input.previousSelectedDate;
  return input.visibleDates[Math.floor(input.visibleDates.length / 2)] ?? input.firstVisibleDate;
}
