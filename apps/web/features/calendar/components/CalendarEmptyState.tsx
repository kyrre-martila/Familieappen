"use client";

import { EmptyState } from "../../../components/ui";

export function CalendarEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <EmptyState title={title} description={description} />;
}
