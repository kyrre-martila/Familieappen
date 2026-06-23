import { AppShell } from "../../../../components/AppShell";
import { ProtectedFamilyRoute } from "../../../../components/ProtectedFamilyRoute";
import { CalendarExportSettingsClient } from "./CalendarExportSettingsClient";

export default function CalendarExportSettingsPage() {
  return (
    <ProtectedFamilyRoute>
      <AppShell title="Innstillinger">
        <CalendarExportSettingsClient />
      </AppShell>
    </ProtectedFamilyRoute>
  );
}
