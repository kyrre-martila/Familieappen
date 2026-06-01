import { AppShell } from "../../components/AppShell";
import { PlaceholderPage } from "../../components/PlaceholderPage";
import { ProtectedFamilyRoute } from "../../components/ProtectedFamilyRoute";

export default function MenuPage() {
  return (
    <ProtectedFamilyRoute>
      <AppShell title="Meny">
        <PlaceholderPage description="Familie, profil, innstillinger og hjelp samles i menyen." label="Meny" title="Meny" />
      </AppShell>
    </ProtectedFamilyRoute>
  );
}
