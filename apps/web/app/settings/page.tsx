import { Bell, CircleUserRound, Info, UsersRound } from "lucide-react";
import { ProtectedFamilyRoute } from "../../components/ProtectedFamilyRoute";
import { SettingsCard, SettingsRow, SettingsSection } from "../../components/settings";

const settingsItems = [
  {
    href: "/settings/profile",
    icon: <CircleUserRound />,
    title: "Profil",
    description: "Min konto og informasjon",
  },
  {
    href: "/settings/family",
    icon: <UsersRound />,
    title: "Familie",
    description: "Familie, medlemmer og invitasjoner",
  },
  {
    href: "/settings/notifications",
    icon: <Bell />,
    title: "Varsler",
    description: "Velg hvilke varsler du vil motta",
  },
  {
    href: "/settings/about",
    icon: <Info />,
    title: "App-info",
    description: "Hjelp, kontakt og informasjon",
  },
] as const;

export default function SettingsPage() {
  return (
    <ProtectedFamilyRoute>
      <main className="settings-shell" aria-labelledby="settings-title">
        <header className="settings-hero">
          <h1 id="settings-title">Innstillinger</h1>
          <p>Administrer din profil, familie og innstillinger for FamilieAppen.</p>
        </header>

        <SettingsSection>
          <SettingsCard>
            {settingsItems.map((item) => (
              <SettingsRow key={item.href} {...item} />
            ))}
          </SettingsCard>
        </SettingsSection>

        <footer className="settings-footer" aria-label="Juridiske lenker">
          <a href="/privacy">Personvern</a>
          <span aria-hidden="true">|</span>
          <a href="/terms">Vilkår</a>
        </footer>
      </main>
    </ProtectedFamilyRoute>
  );
}
