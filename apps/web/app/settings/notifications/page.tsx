import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { NotificationsSettingsClient } from "./NotificationsSettingsClient";

export default function SettingsNotificationsPage() {
  return (
    <ProtectedFamilyRoute>
      <NotificationsSettingsClient />
    </ProtectedFamilyRoute>
  );
}
