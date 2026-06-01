"use client";

import { usePathname } from "next/navigation";
import { BottomNavigation, SidebarNavigation } from "./Navigation";
import { OnboardingRouteGuard } from "./OnboardingRouteGuard";

const immersiveRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/invite",
  "/onboarding",
];

function isImmersiveRoute(pathname: string) {
  return immersiveRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isImmersive = isImmersiveRoute(pathname);
  const shellClassName = [
    "app-shell",
    isImmersive ? "app-shell--immersive" : "",
    pathname === "/" ? "app-shell--splash" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      {!isImmersive ? <OnboardingRouteGuard mode="approved-family" /> : null}
      {!isImmersive ? (
        <aside className="app-shell__sidebar">
          <div className="brand" aria-label="FamilieAppen">
            <p className="brand__name">
              Familie<span className="brand__mark">Appen</span>
            </p>
            <p className="brand__tagline">Family logistics, kept simple.</p>
          </div>
          <SidebarNavigation />
        </aside>
      ) : null}
      <main className="app-shell__main">
        <div className="app-shell__content">{children}</div>
      </main>
      {!isImmersive ? <BottomNavigation /> : null}
    </div>
  );
}
