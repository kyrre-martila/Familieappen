"use client";

import { CalendarDays, CheckCircle2, Gift, Home, ListChecks, LogOut, School, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProtectedFamilyRoute } from "../../components/ProtectedFamilyRoute";
import { SettingsCard, SettingsRow, SettingsSection } from "../../components/settings";
import { logout } from "../../lib/api";

const menuItems = [
  {
    href: "/dashboard",
    icon: <Home />,
    title: "Hjem",
    description: "Gå til familiens oversikt",
  },
  {
    href: "/calendar",
    icon: <CalendarDays />,
    title: "Kalender",
    description: "Se planer, avtaler og aktiviteter",
  },
  {
    href: "/husk?tab=husk",
    icon: <CheckCircle2 />,
    title: "Husk",
    description: "Påminnelser og ting som må gjøres",
  },
  {
    href: "/husk?tab=lister",
    icon: <ListChecks />,
    title: "Lister",
    description: "Handlelister og familiens lister",
  },
  {
    href: "/husk?tab=skoleuka",
    icon: <School />,
    title: "Skoleuka",
    description: "Planlegg og se skoleuka",
  },
  {
    href: "/wishlist",
    icon: <Gift />,
    title: "Ønskeliste",
    description: "Gaver og ønsker familien deler",
  },
  {
    href: "/settings",
    icon: <Settings />,
    title: "Innstillinger",
    description: "Profil, familie, varsler og app-info",
  },
] as const;

export default function MenuPage() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Local session state is cleared by logout so a network error should not keep the user signed in.
    } finally {
      router.replace("/login");
    }
  }

  return (
    <ProtectedFamilyRoute>
      <main className="settings-shell menu-shell" aria-labelledby="menu-title">
        <header className="settings-hero">
          <h1 id="menu-title">Meny</h1>
          <p>Snarveier til FamilieAppens viktigste områder.</p>
        </header>

        <SettingsSection>
          <SettingsCard>
            {menuItems.map((item) => (
              <SettingsRow key={item.href} {...item} />
            ))}
          </SettingsCard>
        </SettingsSection>

        <footer className="menu-footer">
          <button className="button button--secondary menu-logout-button" type="button" onClick={handleLogout}>
            <LogOut aria-hidden="true" />
            <span>Logg ut</span>
          </button>
        </footer>
      </main>
    </ProtectedFamilyRoute>
  );
}
