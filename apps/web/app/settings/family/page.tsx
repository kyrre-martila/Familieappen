import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { SettingsPlaceholderPage } from "../../../components/settings";

export default function SettingsFamilyPage() {
  return (
    <ProtectedFamilyRoute>
      <SettingsPlaceholderPage description="Familie, medlemmer og invitasjoner." title="Familie" />
    </ProtectedFamilyRoute>
  );
}
