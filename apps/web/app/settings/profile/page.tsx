import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { SettingsPlaceholderPage } from "../../../components/settings";

export default function SettingsProfilePage() {
  return (
    <ProtectedFamilyRoute>
      <SettingsPlaceholderPage description="Min konto og informasjon." title="Profil" />
    </ProtectedFamilyRoute>
  );
}
