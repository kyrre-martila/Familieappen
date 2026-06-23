import { AppShell } from "../../../components/AppShell";
import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { NotificationsSettingsClient } from "./NotificationsSettingsClient";

export default function SettingsNotificationsPage() {
  return (
    <ProtectedFamilyRoute>
      <AppShell title="Varsler">
        <NotificationsSettingsClient />
      </AppShell>
    </ProtectedFamilyRoute>
  );
}
