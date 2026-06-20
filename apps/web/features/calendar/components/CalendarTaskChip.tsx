"use client";

import Link from "next/link";
import { ListTodo } from "lucide-react";
import type { Task } from "../../../lib/api";

export function CalendarTaskChip({ task }: { task: Task }) {
  return (
    <Link
      aria-label={`Åpne oppgave i Husk: ${task.title || "Oppgave"}`}
      className="calendar-chip calendar-chip--reminder"
      href={`/husk?tab=tasks&detailId=${encodeURIComponent(task.id)}`}
    >
      <ListTodo aria-hidden="true" size={22} strokeWidth={2.3} />
      <span>{task.title || "Oppgave"}</span>
    </Link>
  );
}
