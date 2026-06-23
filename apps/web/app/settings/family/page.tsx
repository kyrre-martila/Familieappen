import { AppShell } from "../../../components/AppShell";
import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { FamilySettingsClient } from "./FamilySettingsClient";

export default function SettingsFamilyPage() {
  return (
    <ProtectedFamilyRoute>
      <AppShell title="Familie">
        <FamilySettingsClient />
      </AppShell>
    </ProtectedFamilyRoute>
  );
}
