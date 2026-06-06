import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { FamilySettingsClient } from "./FamilySettingsClient";

export default function SettingsFamilyPage() {
  return (
    <ProtectedFamilyRoute>
      <FamilySettingsClient />
    </ProtectedFamilyRoute>
  );
}
