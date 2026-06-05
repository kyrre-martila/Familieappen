import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { SettingsPlaceholderPage } from "../../../components/settings";

export default function SettingsNotificationsPage() {
  return (
    <ProtectedFamilyRoute>
      <SettingsPlaceholderPage description="Velg hvilke varsler du vil motta." title="Varsler" />
    </ProtectedFamilyRoute>
  );
}
