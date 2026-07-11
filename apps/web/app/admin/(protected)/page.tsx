import { getAdminDashboard } from "../../../lib/admin-api";
import { AdminApiError } from "../../../lib/admin-shared";
import { AdminDashboardClient } from "../../../components/admin/AdminDashboardClient";

export default async function AdminDashboardPage() {
  try {
    const dashboard = await getAdminDashboard();
    return <AdminDashboardClient initialDashboard={dashboard} />;
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 403) return <div className="admin-state"><h1>Access denied</h1><p>You do not have permission to view dashboard data.</p></div>;
    throw error;
  }
}
