import { AppShell } from "../../components/AppShell";
import { PlaceholderPage } from "../../components/PlaceholderPage";
import { ProtectedFamilyRoute } from "../../components/ProtectedFamilyRoute";

export default function HuskPage() {
  return (
    <ProtectedFamilyRoute>
      <AppShell title="Husk">
        <PlaceholderPage description="Samlede husk, oppgaver og påminnelser kommer her." label="Husk" title="Husk" />
      </AppShell>
    </ProtectedFamilyRoute>
  );
}
