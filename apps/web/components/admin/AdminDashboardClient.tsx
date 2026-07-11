"use client";

import { useState } from "react";
import { fetchAdminDashboard } from "../../lib/admin-client-api";
import { AdminApiError, type AdminDashboard } from "../../lib/admin-shared";

const METRICS: Array<{ key: keyof AdminDashboard; label: string; description: string }> = [
  { key: "totalUsers", label: "Total users", description: "Registered FamilieAppen users" },
  { key: "totalFamilies", label: "Total families", description: "Created family workspaces" },
  { key: "newUsersLast7Days", label: "New users, 7 days", description: "Registrations in the last week" },
  { key: "newUsersLast30Days", label: "New users, 30 days", description: "Registrations in the last month" },
  { key: "activeCalendarImports", label: "Active calendar imports", description: "Enabled ICS import sources" },
  { key: "activeAdvertisements", label: "Active advertisements", description: "Currently active ad placements" }
];

export function AdminDashboardClient({ initialDashboard }: { initialDashboard: AdminDashboard }) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setIsLoading(true); setError(null);
    try { setDashboard(await fetchAdminDashboard()); } catch (err) {
      setError(err instanceof AdminApiError && err.status === 403 ? "You do not have permission to view dashboard data." : "Dashboard data could not be loaded. Please try again.");
    } finally { setIsLoading(false); }
  }

  return <section className="admin-dashboard" aria-labelledby="admin-dashboard-title">
    <div className="admin-page-header"><p>Overview</p><h1 id="admin-dashboard-title">Dashboard</h1><span>Live operational metrics from the admin API.</span></div>
    {error ? <div className="admin-alert" role="alert"><p>{error}</p><button className="admin-button" type="button" onClick={() => void retry()}>Retry</button></div> : null}
    {isLoading ? <div className="admin-state admin-state--inline" role="status">Loading dashboard…</div> : null}
    <div className="admin-metrics" aria-label="Dashboard metrics">
      {METRICS.map((metric) => {
        const value = Number(dashboard[metric.key] ?? 0);
        return <article className="admin-metric-card" key={metric.key}><p>{metric.label}</p><strong>{new Intl.NumberFormat("en").format(value)}</strong><span>{value === 0 ? "No records currently" : metric.description}</span></article>;
      })}
    </div>
    {dashboard.recentAuditActions?.length ? <section className="admin-activity"><h2>Recent activity</h2><ul>{dashboard.recentAuditActions.map((action) => <li key={action.id}>{action.action} · {new Date(action.createdAt).toLocaleString("en")}</li>)}</ul></section> : null}
  </section>;
}
