import type { Metadata } from "next";
import { Suspense } from "react";

import { IconPickerClient } from "./IconPickerClient";

export const metadata: Metadata = {
  title: "Velg ikon – Kalender"
};

export default function CalendarEventIconPickerPage() {
  return (
    <Suspense fallback={null}>
      <IconPickerClient />
    </Suspense>
  );
}
