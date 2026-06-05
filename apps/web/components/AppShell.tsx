"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNavigation } from "./Navigation";
import { OnboardingRouteGuard } from "./OnboardingRouteGuard";

const immersiveRoutes = ["/", "/login", "/register", "/forgot-password", "/invite", "/onboarding"];

function isImmersiveRoute(pathname: string) {
  return immersiveRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function useCurrentSearch(pathname: string) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  return search;
}

function isFocusRoute(pathname: string, search = "") {
  const searchParams = new URLSearchParams(search);
  const isSchoolWeekEdit = pathname === "/husk" && searchParams.get("tab") === "skoleuka" && searchParams.get("edit") === "1";
  return isSchoolWeekEdit || pathname.startsWith("/calendar/events/") || pathname.startsWith("/husk/lister/") || pathname.startsWith("/husk/reminders/") || pathname === "/wishlist/new" || (pathname.startsWith("/wishlist/") && pathname.endsWith("/edit"));
}

export function RootAppFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const search = useCurrentSearch(pathname);
  const isImmersive = isImmersiveRoute(pathname);
  const isFocus = isFocusRoute(pathname, search);
  const shellClassName = ["root-app-frame", isImmersive ? "root-app-frame--immersive" : "", isFocus ? "root-app-frame--focus" : "", pathname === "/" ? "root-app-frame--splash" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      {!isImmersive && !isFocus ? <OnboardingRouteGuard mode="app-shell" /> : null}
      <main className="root-app-frame__main">{children}</main>
      {!isImmersive && !isFocus ? <BottomNavigation /> : null}
    </div>
  );
}

export function AppShell({ children, title, titleAction }: Readonly<{ children: React.ReactNode; title: string; titleAction?: React.ReactNode }>) {
  const pathname = usePathname();
  const search = useCurrentSearch(pathname);
  const isFocus = isFocusRoute(pathname, search);

  return (
    <div className={`app-shell${isFocus ? " app-shell--focus" : ""}`}>
      {!isFocus ? (
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
      ) : null}
      {!isFocus ? (
        <div className="app-shell__title-row">
          <h1 className="app-shell__title">{title}</h1>
          {titleAction ? <div className="app-shell__title-action">{titleAction}</div> : null}
        </div>
      ) : null}
      <div className="app-shell__content">{children}</div>
    </div>
  );
}
