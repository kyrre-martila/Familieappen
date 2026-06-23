import { AppShell } from "../../../components/AppShell";
import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { ProfileSettingsClient } from "./ProfileSettingsClient";

export default function SettingsProfilePage() {
  return (
    <ProtectedFamilyRoute>
      <AppShell title="Innstillinger">
        <ProfileSettingsClient />
      </AppShell>
    </ProtectedFamilyRoute>
  );
}
