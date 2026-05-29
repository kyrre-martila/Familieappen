"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "./navigation";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation">
      <ul className="nav-list">
        {navigationItems.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);

          return (
            <li key={item.href} className="nav-list__item">
              <Link
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "nav-list__link nav-list__link--active" : "nav-list__link"}
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Compact navigation" className="bottom-nav">
      {navigationItems.map((item) => {
        const isActive = isActiveRoute(pathname, item.href);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "bottom-nav__link bottom-nav__link--active" : "bottom-nav__link"}
            href={item.href}
            key={item.href}
            title={item.label}
          >
            <span className="bottom-nav__link-label">{item.shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
