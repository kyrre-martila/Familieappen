"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppSidebar, BottomNavigation } from "./Navigation";
import { UserAvatar } from "./avatar/UserAvatar";
import { getCurrentUserProfile, logout, type UserProfile } from "../lib/api";
import { OnboardingRouteGuard } from "./OnboardingRouteGuard";
import { NotificationBell } from "../features/notifications/NotificationBell";
import { NotificationSheet } from "../features/notifications/NotificationSheet";
import { useNotifications } from "../features/notifications/useNotifications";

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

function useCurrentSearch(pathname: string) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  return search;
}

function isFocusRoute(pathname: string, search = "") {
  const searchParams = new URLSearchParams(search);
  const isSchoolWeekEdit =
    pathname === "/husk" &&
    searchParams.get("tab") === "skoleuka" &&
    searchParams.get("edit") === "1";
  return (
    isSchoolWeekEdit ||
    pathname.startsWith("/calendar/events/") ||
    pathname.startsWith("/husk/lister/") ||
    pathname.startsWith("/husk/reminders/") ||
    pathname === "/wishlist/new" ||
    (pathname.startsWith("/wishlist/") && pathname.endsWith("/edit"))
  );
}

export function RootAppFrame({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const search = useCurrentSearch(pathname);
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isImmersive = isAdminRoute || isImmersiveRoute(pathname);
  const isFocus = isFocusRoute(pathname, search);
  const shellClassName = [
    "root-app-frame",
    isImmersive ? "root-app-frame--immersive" : "",
    isFocus ? "root-app-frame--focus" : "",
    pathname === "/" ? "root-app-frame--splash" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      {!isImmersive && !isFocus ? (
        <OnboardingRouteGuard mode="app-shell" />
      ) : null}
      {!isImmersive && !isFocus ? <AppSidebar /> : null}
      <main className="root-app-frame__main">{children}</main>
      {!isImmersive && !isFocus ? <BottomNavigation /> : null}
    </div>
  );
}

function ProfileMenu({ profile }: { profile: UserProfile | null }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    firstItemRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Local session state is cleared by logout so a network error should not keep the user signed in.
    } finally {
      setIsOpen(false);
      router.replace("/login");
    }
  }

  return (
    <div className="app-shell__profile-menu-wrap">
      <button
        className="app-shell__profile"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Åpne profilmeny"
      >
        {profile ? (
          <UserAvatar
            identity={profile}
            avatarUrl={profile.avatarUrl}
            size="sm"
            decorative
          />
        ) : (
          <UserAvatar
            identity={{ displayName: "FamilieAppen" }}
            size="sm"
            decorative
          />
        )}
      </button>
      {isOpen ? (
        <>
          <button
            className="profile-action-menu__backdrop"
            type="button"
            aria-label="Lukk profilmeny"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="profile-action-menu profile-action-menu--open"
            role="menu"
          >
            <Link
              ref={firstItemRef}
              className="profile-action-menu__item"
              href="/settings/profile"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              Profil
            </Link>
            <button
              className="profile-action-menu__item profile-action-menu__item--danger"
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
            >
              Logg ut
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function AppShell({
  children,
  title,
  titleAction,
  hideTitleRow = false,
  mobileTitle,
}: Readonly<{
  children: React.ReactNode;
  title: string;
  titleAction?: React.ReactNode;
  hideTitleRow?: boolean;
  mobileTitle?: string;
}>) {
  const pathname = usePathname();
  const search = useCurrentSearch(pathname);
  const isFocus = isFocusRoute(pathname, search);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isNotificationSheetOpen, setIsNotificationSheetOpen] = useState(false);
  const notifications = useNotifications({ enabled: !isFocus });

  useEffect(() => {
    if (isFocus) return;
    let cancelled = false;
    getCurrentUserProfile()
      .then((userProfile) => {
        if (!cancelled) setProfile(userProfile);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isFocus]);

  return (
    <div className={`app-shell${isFocus ? " app-shell--focus" : ""}`}>
      {!isFocus ? (
        <header className="app-shell__header" aria-label="Felles toppfelt">
          <div className="app-shell__brand" aria-label="FamilieAppen">
            <span className="app-shell__logo" aria-hidden="true">
              <Image
                alt=""
                height={32}
                priority
                src="/assets/brand/familieappen-icon.svg"
                width={32}
              />
            </span>
            <span className="app-shell__brand-name">FamilieAppen</span>
          </div>
          <span className="app-shell__mobile-title" aria-hidden="true">
            {mobileTitle ?? title}
          </span>
          <div className="app-shell__header-actions">
            <NotificationBell
              unreadCount={notifications.unreadCount}
              onClick={() => {
                setIsNotificationSheetOpen(true);
                void notifications.loadNotifications();
              }}
            />
            <ProfileMenu profile={profile} />
          </div>
        </header>
      ) : null}
      {!isFocus && !hideTitleRow ? (
        <div className="app-shell__title-row">
          <h1 className="app-shell__title">{title}</h1>
          {titleAction ? (
            <div className="app-shell__title-action">{titleAction}</div>
          ) : null}
        </div>
      ) : null}
      {!isFocus ? (
        <NotificationSheet
          isOpen={isNotificationSheetOpen}
          notificationsState={notifications}
          onClose={() => setIsNotificationSheetOpen(false)}
        />
      ) : null}
      <div className="app-shell__content">{children}</div>
    </div>
  );
}
