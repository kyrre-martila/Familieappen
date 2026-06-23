import packageJson from "../../../package.json";
import { AppShell } from "../../../components/AppShell";
import { ProtectedFamilyRoute } from "../../../components/ProtectedFamilyRoute";
import { AppInfoSettingsClient } from "./AppInfoSettingsClient";

const fallbackVersion = "0.1.0";

export default function SettingsAboutPage() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "kyrre@martila.no";
  const version = typeof packageJson.version === "string" && packageJson.version.trim() ? packageJson.version : fallbackVersion;

  return (
    <ProtectedFamilyRoute>
      <AppShell title="Innstillinger">
        <AppInfoSettingsClient supportEmail={supportEmail} version={version} />
      </AppShell>
    </ProtectedFamilyRoute>
  );
}
