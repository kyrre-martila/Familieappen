import { AppShell } from "../../../components/AppShell";
import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { CalendarProvider } from "../../../features/calendar/hooks/useCalendar";
import { CalendarSettingsClient } from "./CalendarSettingsClient";

export default function CalendarSettingsPage() {
  return (
    <ProtectedFamilyRoute>
      <AppShell title="Innstillinger">
        <CalendarProvider>
          <CalendarSettingsClient />
        </CalendarProvider>
      </AppShell>
    </ProtectedFamilyRoute>
  );
}
