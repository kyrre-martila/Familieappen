import { AppShell } from "../../../components/AppShell";
import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { ProfileSettingsClient } from "./ProfileSettingsClient";

export default function SettingsProfilePage() {
  return (
    <ProtectedFamilyRoute>
      <AppShell title="Profil">
        <ProfileSettingsClient />
      </AppShell>
    </ProtectedFamilyRoute>
  );
}
