import { BottomNavigation, SidebarNavigation } from "./Navigation";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="brand" aria-label="FamilieAppen">
          <p className="brand__name">Familie<span className="brand__mark">Appen</span></p>
          <p className="brand__tagline">Family logistics, kept simple.</p>
        </div>
        <SidebarNavigation />
      </aside>
      <main className="app-shell__main">
        <div className="app-shell__content">{children}</div>
      </main>
      <BottomNavigation />
    </div>
  );
}
