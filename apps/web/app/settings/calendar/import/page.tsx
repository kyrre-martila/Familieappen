import { AppShell } from "../../../../components/AppShell";
import { ProtectedFamilyRoute } from "../../../../components/ProtectedFamilyRoute";
import { PageContainer } from "../../../../components/ui";
import { CalendarProvider } from "../../../../features/calendar/hooks/useCalendar";
import { CalendarImportSettingsPageClient } from "../CalendarImportSettingsClient";

export default function CalendarImportSettingsPage() {
  return (
    <ProtectedFamilyRoute>
      <AppShell title="Innstillinger">
        <CalendarProvider>
          <PageContainer>
            <CalendarImportSettingsPageClient />
          </PageContainer>
        </CalendarProvider>
      </AppShell>
    </ProtectedFamilyRoute>
  );
}
