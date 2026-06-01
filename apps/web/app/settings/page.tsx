import { PlaceholderPage } from "../../components/PlaceholderPage";
import { ProtectedFamilyRoute } from "../../components/ProtectedFamilyRoute";

export default function SettingsPage() {
  return (
    <ProtectedFamilyRoute>
      <PlaceholderPage
        description="Keep future family, preference and account settings organized when they are introduced."
        label="Settings"
        title="Settings"
      />
    </ProtectedFamilyRoute>
  );
}
