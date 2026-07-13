"use client";

import { CalendarDays, CheckCircle2, Gift, Home, ListChecks, LogOut, Settings, ShoppingCart, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdvertisementPlacementCard } from "../../components/AdvertisementCard";
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
    href: "/husk?tab=paminnelser",
    icon: <CheckCircle2 />,
    title: "Husk",
    description: "Påminnelser og ting som må gjøres",
  },
  {
    href: "/shopping",
    icon: <ShoppingCart />,
    title: "Handleliste",
    description: "Dagligvarer og butikkrunde",
  },
  {
    href: "/lister",
    icon: <ListChecks />,
    title: "Lister",
    description: "Pakkelister, ferie, bursdag og sjekklister",
  },
  {
    href: "/meals",
    icon: <Utensils />,
    title: "Middag",
    description: "Planlegg familiens middager",
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

        <AdvertisementPlacementCard placement="MENU" />

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
