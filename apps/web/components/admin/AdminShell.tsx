"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { adminLogout } from "../../lib/admin-client-api";
import { adminRoleLabel, type AdminRole, type AdminUser } from "../../lib/admin-shared";

const NAV_ITEMS: Array<{ href: string; label: string; roles: AdminRole[] }> = [
  { href: "/admin", label: "Overview", roles: ["SUPER_ADMIN", "SUPPORT", "ANALYST", "AD_MANAGER"] },
  { href: "/admin/users", label: "Users", roles: ["SUPER_ADMIN", "SUPPORT"] },
  { href: "/admin/statistics", label: "Statistics", roles: ["SUPER_ADMIN", "ANALYST"] },
  { href: "/admin/advertisements", label: "Advertisements", roles: ["SUPER_ADMIN", "AD_MANAGER"] },
  { href: "/admin/admin-users", label: "Administrators", roles: ["SUPER_ADMIN"] },
  { href: "/admin/audit-log", label: "Audit log", roles: ["SUPER_ADMIN"] }
];

export function AdminShell({ admin, children }: { admin: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const visibleNav = useMemo(() => NAV_ITEMS.filter((item) => item.roles.includes(admin.role)), [admin.role]);

  async function handleLogout() {
    setLoggingOut(true);
    try { await adminLogout(); } catch { /* Expired sessions are handled by leaving the admin area. */ }
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav className="admin-nav" aria-label="Admin navigation">
      {visibleNav.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return <Link key={item.href} className={`admin-nav__link${active ? " admin-nav__link--active" : ""}`} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>{item.label}</Link>;
      })}
    </nav>
  );

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span className="admin-brand__mark">F</span><span>FamilieAppen Admin</span></div>
        {nav}
        <AdminAccount admin={admin} loggingOut={loggingOut} onLogout={() => void handleLogout()} />
      </aside>
      <div className="admin-main-wrap">
        <header className="admin-topbar">
          <button className="admin-menu-button" type="button" aria-label="Toggle admin navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>☰</button>
          <div className="admin-topbar__identity"><strong>FamilieAppen Admin</strong><span>{admin.name} · {adminRoleLabel(admin.role)}</span></div>
          <button className="admin-logout admin-logout--top" type="button" disabled={loggingOut} onClick={() => void handleLogout()}>{loggingOut ? "Signing out…" : "Sign out"}</button>
        </header>
        {menuOpen ? <div className="admin-mobile-panel">{nav}<AdminAccount admin={admin} loggingOut={loggingOut} onLogout={() => void handleLogout()} /></div> : null}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

function AdminAccount({ admin, loggingOut, onLogout }: { admin: AdminUser; loggingOut: boolean; onLogout: () => void }) {
  return <section className="admin-account" aria-label="Admin account"><p className="admin-account__name">{admin.name}</p><p>{adminRoleLabel(admin.role)}</p><p>{admin.email}</p><button className="admin-logout" type="button" disabled={loggingOut} onClick={onLogout}>{loggingOut ? "Signing out…" : "Sign out"}</button></section>;
}
