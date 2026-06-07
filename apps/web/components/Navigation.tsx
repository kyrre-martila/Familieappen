"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { bottomNavigationItems, getCreateOptions } from "./navigation-options";

type BottomNavigationItem = (typeof bottomNavigationItems)[number];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/settings" && (pathname === "/privacy" || pathname === "/terms")) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ icon }: { icon: BottomNavigationItem["icon"] }) {
  const commonProps = {
    "aria-hidden": true,
    className: "bottom-nav__svg",
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

  return (
    <svg {...commonProps}>
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />
    </svg>
  );
}

function NavigationLink({ item }: { item: BottomNavigationItem }) {
  const pathname = usePathname();
  const isActive = isActiveRoute(pathname, item.href);

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
        <NavigationLink item={bottomNavigationItems[3]} />
      </nav>
      <CreateBottomSheet isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </>
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
    return () => document.removeEventListener("keydown", handleKeyDown);
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
