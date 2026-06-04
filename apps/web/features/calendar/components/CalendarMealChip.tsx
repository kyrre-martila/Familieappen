"use client";

import Link from "next/link";
import { Utensils } from "lucide-react";
import type { MealSummary } from "@familieappen/shared";

import { formatSelectedDate } from "./calendarFormatters";

export function CalendarMealChip({
  date,
  label,
  meal,
}: {
  date: string;
  label?: string;
  meal: MealSummary;
}) {
  const formattedDate = label ?? formatSelectedDate(date);

  return (
    <Link
      className="calendar-chip calendar-chip--meal"
      href={`/meals?date=${date}`}
      aria-label={`Åpne måltidsplan for ${formattedDate}: ${meal.title}`}
    >
      <Utensils aria-hidden="true" size={22} strokeWidth={2.3} />
      <span>{meal.title}</span>
    </Link>
  );
}
