"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems, utilityNavigationItems } from "./navigation";

type NavigationItem = (typeof navigationItems)[number] | (typeof utilityNavigationItems)[number];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({ item, variant }: { item: NavigationItem; variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const isActive = isActiveRoute(pathname, item.href);
  const baseClass = variant === "sidebar" ? "nav-list__link" : "bottom-nav__link";
  const activeClass = isActive ? ` ${baseClass}--active` : "";

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={`${baseClass}${activeClass}`}
      href={item.href}
      title={item.label}
    >
      <span aria-hidden="true" className={`${baseClass}-icon`}>
        {item.icon}
      </span>
      <span className={`${baseClass}-label`}>{variant === "sidebar" ? item.label : item.shortLabel}</span>
    </Link>
  );
}

export function SidebarNavigation() {
  return (
    <nav aria-label="Main navigation" className="sidebar-nav">
      <ul className="nav-list">
        {navigationItems.map((item) => (
          <li key={item.href} className="nav-list__item">
            <NavigationLink item={item} variant="sidebar" />
          </li>
        ))}
      </ul>
      <ul className="nav-list nav-list--utility">
        {utilityNavigationItems.map((item) => (
          <li key={item.href} className="nav-list__item">
            <NavigationLink item={item} variant="sidebar" />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function BottomNavigation() {
  return (
    <nav aria-label="Compact navigation" className="bottom-nav">
      {[...navigationItems, ...utilityNavigationItems].map((item) => (
        <NavigationLink item={item} key={item.href} variant="bottom" />
      ))}
    </nav>
  );
}
