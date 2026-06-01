"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "./Navigation";
import { OnboardingRouteGuard } from "./OnboardingRouteGuard";

const immersiveRoutes = ["/", "/login", "/register", "/forgot-password", "/invite", "/onboarding"];

function isImmersiveRoute(pathname: string) {
  return immersiveRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function RootAppFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isImmersive = isImmersiveRoute(pathname);
  const shellClassName = ["root-app-frame", isImmersive ? "root-app-frame--immersive" : "", pathname === "/" ? "root-app-frame--splash" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      {!isImmersive ? <OnboardingRouteGuard mode="app-shell" /> : null}
      <main className="root-app-frame__main">{children}</main>
      {!isImmersive ? <BottomNavigation /> : null}
    </div>
  );
}

export function AppShell({ children, title }: Readonly<{ children: React.ReactNode; title: string }>) {
  return (
    <div className="app-shell">
      <header className="app-shell__header" aria-label="Felles toppfelt">
        <div className="app-shell__brand" aria-label="FamilieAppen">
          <span className="app-shell__logo" aria-hidden="true">
            <Image alt="" height={32} priority src="/assets/brand/familieappen-icon.svg" width={32} />
          </span>
          <span className="app-shell__brand-name">FamilieAppen</span>
        </div>
        <button className="app-shell__profile" onClick={() => undefined} type="button" aria-label="Åpne profil og innstillinger">
          <span className="app-shell__profile-initials" aria-hidden="true">EK</span>
        </button>
      </header>
      <div className="app-shell__title-row">
        <h1 className="app-shell__title">{title}</h1>
      </div>
      <div className="app-shell__content">{children}</div>
    </div>
  );
}
