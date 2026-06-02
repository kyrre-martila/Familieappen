import { AppShell } from "../../../components/AppShell";
import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { CalendarSettingsClient } from "./CalendarSettingsClient";

export default function CalendarSettingsPage() {
  return (
    <ProtectedFamilyRoute>
      <AppShell title="Innstillinger">
        <CalendarSettingsClient />
      </AppShell>
    </ProtectedFamilyRoute>
  );
}
