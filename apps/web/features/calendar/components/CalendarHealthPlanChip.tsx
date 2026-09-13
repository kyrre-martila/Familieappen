"use client";

import Link from "next/link";
import { HeartPulse } from "lucide-react";

import { healthPlanChipLabel, type HealthPlanOccurrenceSummary } from "../../health-plan/occurrence-summary";

export function CalendarHealthPlanChip({ summary }: { summary: HealthPlanOccurrenceSummary }) {
  const label = healthPlanChipLabel(summary);
  if (!label) return null;

  return (
    <Link className="calendar-chip calendar-chip--reminder" href="/health-plans" aria-label={`Åpne ${label}`}>
      <HeartPulse aria-hidden="true" size={22} strokeWidth={2.3} />
      <span>{label}</span>
    </Link>
  );
}
