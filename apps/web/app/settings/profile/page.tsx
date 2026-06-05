import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { ProfileSettingsClient } from "./ProfileSettingsClient";

export default function SettingsProfilePage() {
  return (
    <ProtectedFamilyRoute>
      <ProfileSettingsClient />
    </ProtectedFamilyRoute>
  );
}
