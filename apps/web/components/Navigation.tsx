"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { bottomNavigationItems, getCreateOptions, menuNavigationItems } from "./navigation-options";
import { logout } from "../lib/api";

type BottomNavigationItem = (typeof bottomNavigationItems)[number];
type MenuNavigationItem = (typeof menuNavigationItems)[number];
type NavigationIcon = BottomNavigationItem["icon"] | MenuNavigationItem["icon"] | "logout";


function useCurrentSearch(dependency: string) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(window.location.search);
  }, [dependency]);

  return search.startsWith("?") ? search.slice(1) : search;
}

function isActiveRoute(pathname: string, href: string, search = "") {
  if (href === "/menu" && (pathname.startsWith("/settings") || pathname === "/privacy" || pathname === "/terms")) {
    return true;
  }

  if (href.includes("?")) {
    const [hrefPathname, hrefSearch] = href.split("?");
    const hrefParams = new URLSearchParams(hrefSearch);
    const currentParams = new URLSearchParams(search);

    return pathname === hrefPathname && Array.from(hrefParams.entries()).every(([key, value]) => currentParams.get(key) === value);
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMenuItemActive(pathname: string, href: string, search: string) {
  if (href === "/husk") {
    const tab = new URLSearchParams(search).get("tab");

    if (tab === "lister" || tab === "skoleuka") {
      return false;
    }
  }

  return isActiveRoute(pathname, href, search);
}

function NavIcon({ icon, className = "bottom-nav__svg" }: { icon: NavigationIcon; className?: string }) {
  const commonProps = {
    "aria-hidden": true,
    className,
    fill: "none",
    viewBox: "0 0 24 24"
  } as const;

  if (icon === "home") {
    return (
      <svg {...commonProps}>
        <path d="M3.5 10.6 12 3.5l8.5 7.1" />
        <path d="M5.5 9.7v9.1h4.2v-5.1h4.6v5.1h4.2V9.7" />
      </svg>
    );
  }

  if (icon === "calendar") {
    return (
      <svg {...commonProps}>
        <path d="M7 3.8v3M17 3.8v3M4.5 9.2h15" />
        <rect height="15" rx="3" width="15" x="4.5" y="5.5" />
      </svg>
    );
  }

  if (icon === "check") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8.4" />
        <path d="m8.5 12.2 2.2 2.2 4.9-5" />
      </svg>
    );
  }

  if (icon === "list") {
    return (
      <svg {...commonProps}>
        <path d="M9 6.8h10.5M9 12h10.5M9 17.2h10.5" />
        <path d="m4.4 6.8.7.7 1.6-1.7M4.4 12l.7.7 1.6-1.7M4.4 17.2l.7.7 1.6-1.7" />
      </svg>
    );
  }

  if (icon === "school") {
    return (
      <svg {...commonProps}>
        <path d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z" />
        <path d="M6.5 9v5.2c1.4 1.4 3.2 2.1 5.5 2.1s4.1-.7 5.5-2.1V9" />
        <path d="M20 7.5v6" />
      </svg>
    );
  }

  if (icon === "gift") {
    return (
      <svg {...commonProps}>
        <path d="M4.5 10h15v9h-15v-9Z" />
        <path d="M3.8 7h16.4v3H3.8V7ZM12 7v12" />
        <path d="M12 7s-4.2.1-4.2-2.1C7.8 3.8 8.7 3 9.8 3 12 3 12 7 12 7Zm0 0s4.2.1 4.2-2.1C16.2 3.8 15.3 3 14.2 3 12 3 12 7 12 7Z" />
      </svg>
    );
  }

  if (icon === "settings") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M18.5 13.4a6.9 6.9 0 0 0 .1-2.8l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-2.4-1.4L13.5 2h-4l-.3 3.3a7.8 7.8 0 0 0-2.4 1.4l-2.4-1-2 3.4 2 1.5a6.9 6.9 0 0 0 .1 2.8l-2 1.5 2 3.4 2.4-1a7.8 7.8 0 0 0 2.4 1.4l.3 3.3h4l.3-3.3a7.8 7.8 0 0 0 2.4-1.4l2.4 1 2-3.4-2.2-1.5Z" />
      </svg>
    );
  }

  if (icon === "logout") {
    return (
      <svg {...commonProps}>
        <path d="M9.5 5H6.8A2.3 2.3 0 0 0 4.5 7.3v9.4A2.3 2.3 0 0 0 6.8 19h2.7" />
        <path d="M14 8.5 17.5 12 14 15.5M17.2 12H9" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />
    </svg>
  );
}

function NavigationLink({ item, isMenuOpen = false, onMenuOpen }: { item: BottomNavigationItem; isMenuOpen?: boolean; onMenuOpen?: () => void }) {
  const pathname = usePathname();
  const isActive = isActiveRoute(pathname, item.href);

  if (item.href === "/menu") {
    return (
      <button aria-expanded={isMenuOpen} className={`bottom-nav__link bottom-nav__link--button${isActive || isMenuOpen ? " bottom-nav__link--active" : ""}`} title={item.label} type="button" onClick={onMenuOpen}>
        <span className="bottom-nav__link-icon">
          <NavIcon icon={item.icon} />
        </span>
        <span className="bottom-nav__link-label">{item.label}</span>
      </button>
    );
  }

  return (
    <Link aria-current={isActive ? "page" : undefined} className={`bottom-nav__link${isActive ? " bottom-nav__link--active" : ""}`} href={item.href} title={item.label}>
      <span className="bottom-nav__link-icon">
        <NavIcon icon={item.icon} />
      </span>
      <span className="bottom-nav__link-label">{item.label}</span>
    </Link>
  );
}

export function BottomNavigation() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav aria-label="Hovednavigasjon" className="bottom-nav">
        <div className="bottom-nav__surface" aria-hidden="true" />
        <NavigationLink item={bottomNavigationItems[0]} />
        <NavigationLink item={bottomNavigationItems[1]} />
        <button className="bottom-nav__create" type="button" aria-label="Opprett ny" onClick={() => setIsCreateOpen(true)}>
          <svg aria-hidden="true" className="bottom-nav__create-icon" fill="none" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <NavigationLink item={bottomNavigationItems[2]} />
        <NavigationLink item={bottomNavigationItems[3]} isMenuOpen={isMenuOpen} onMenuOpen={() => setIsMenuOpen(true)} />
      </nav>
      <CreateBottomSheet isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <MobileMenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const search = useCurrentSearch(pathname);

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
    <aside className="app-sidebar" aria-label="Hovednavigasjon">
      <Link className="app-sidebar__brand" href="/dashboard" aria-label="FamilieAppen hjem">
        <span className="app-sidebar__logo" aria-hidden="true">
          <Image alt="" height={32} priority src="/assets/brand/familieappen-icon.svg" width={32} />
        </span>
        <span className="app-sidebar__brand-copy">
          <span className="app-sidebar__brand-name">FamilieAppen</span>
          <span className="app-sidebar__brand-tagline">Familieliv med ro</span>
        </span>
      </Link>

      <Link className="app-sidebar__create" href="/calendar/events/new">
        <span className="app-sidebar__create-icon" aria-hidden="true">+</span>
        <span>Opprett ny</span>
      </Link>

      <nav className="app-sidebar__nav" aria-label="Sider">
        {menuNavigationItems.map((item) => {
          const isActive = isMenuItemActive(pathname, item.href, search);
          return (
            <Link aria-current={isActive ? "page" : undefined} className={`app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`} href={item.href} key={item.href}>
              <span className="app-sidebar__link-icon"><NavIcon className="app-sidebar__svg" icon={item.icon} /></span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button className="app-sidebar__logout" type="button" onClick={handleLogout}>
        <span className="app-sidebar__link-icon"><NavIcon className="app-sidebar__svg" icon="logout" /></span>
        <span>Logg ut</span>
      </button>
    </aside>
  );
}

function MobileMenuOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const titleId = useId();
  const pathname = usePathname();
  const router = useRouter();
  const search = useCurrentSearch(pathname);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("has-modal-open");
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("has-modal-open");
    };
  }, [isOpen, onClose]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Local session state is cleared by logout so a network error should not keep the user signed in.
    } finally {
      onClose();
      router.replace("/login");
    }
  }

  function handlePointerMove(clientY: number) {
    if (dragStart === null) {
      return;
    }

    setDragOffset(Math.max(0, clientY - dragStart));
  }

  function handlePointerEnd() {
    const shouldClose = dragOffset > window.innerHeight * 0.08;
    setDragStart(null);
    setDragOffset(0);

    if (shouldClose) {
      onClose();
    }
  }

  return (
    <div aria-hidden={!isOpen} className={`mobile-menu${isOpen ? " mobile-menu--open" : ""}`}>
      <button className="mobile-menu__backdrop" type="button" aria-label="Lukk meny" onClick={onClose} />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="mobile-menu__panel"
        role="dialog"
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined }}
        onPointerCancel={handlePointerEnd}
        onPointerDown={(event) => setDragStart(event.clientY)}
        onPointerMove={(event) => handlePointerMove(event.clientY)}
        onPointerUp={handlePointerEnd}
      >
        <div className="mobile-menu__handle" aria-hidden="true" />
        <header className="mobile-menu__header">
          <div>
            <p className="mobile-menu__eyebrow">FamilieAppen</p>
            <h2 className="mobile-menu__title" id={titleId}>Meny</h2>
          </div>
          <button className="mobile-menu__close" type="button" aria-label="Lukk meny" onClick={onClose}>×</button>
        </header>

        <nav className="mobile-menu__nav" aria-label="Meny">
          {menuNavigationItems.map((item) => {
            const isActive = isMenuItemActive(pathname, item.href, search);
            return (
              <Link aria-current={isActive ? "page" : undefined} className={`mobile-menu__link${isActive ? " mobile-menu__link--active" : ""}`} href={item.href} key={item.href} onClick={onClose}>
                <span className="mobile-menu__icon"><NavIcon className="mobile-menu__svg" icon={item.icon} /></span>
                <span className="mobile-menu__copy">
                  <span className="mobile-menu__label">{item.label}</span>
                  <span className="mobile-menu__description">{item.description}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <button className="mobile-menu__logout" type="button" onClick={handleLogout}>
          <span className="mobile-menu__icon"><NavIcon className="mobile-menu__svg" icon="logout" /></span>
          <span>Logg ut</span>
        </button>
      </section>
    </div>
  );
}

function CreateBottomSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const titleId = useId();
  const pathname = usePathname();
  const options = getCreateOptions(pathname === "/husk" || pathname.startsWith("/husk/"));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("has-modal-open");
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("has-modal-open");
    };
  }, [isOpen, onClose]);

  return (
    <div aria-hidden={!isOpen} className={`create-sheet${isOpen ? " create-sheet--open" : ""}`}>
      <button className="create-sheet__backdrop" type="button" aria-label="Lukk opprett ny" onClick={onClose} />
      <section aria-labelledby={titleId} aria-modal="true" className="create-sheet__panel" role="dialog">
        <div className="create-sheet__handle" aria-hidden="true" />
        <h2 className="create-sheet__title" id={titleId}>Opprett ny</h2>
        <div className="create-sheet__options">
          {options.map((option) => (
            <Link className="create-sheet__option" href={option.href} key={option.label} onClick={onClose}>
              <span className={`create-sheet__option-icon create-sheet__option-icon--${option.tone}`} aria-hidden="true">{option.emoji}</span>
              <span className="create-sheet__option-copy">
                <span className="create-sheet__option-title">{option.label}</span>
                <span className="create-sheet__option-description">{option.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
