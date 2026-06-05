import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { SettingsPlaceholderPage } from "../../../components/settings";

export default function SettingsAboutPage() {
  return (
    <ProtectedFamilyRoute>
      <SettingsPlaceholderPage description="Hjelp, kontakt og informasjon." title="App-info" />
    </ProtectedFamilyRoute>
  );
}
