import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin/AdminShell";
import { getCurrentAdmin } from "../../../lib/admin-api";
import { AdminApiError } from "../../../lib/admin-shared";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin;
  try { admin = await getCurrentAdmin(); } catch (error) {
    if (error instanceof AdminApiError && error.status === 403) return <AdminAccessDenied />;
    redirect("/admin/login");
  }
  return <AdminShell admin={admin}>{children}</AdminShell>;
}

function AdminAccessDenied() {
  return <main className="admin-state"><h1>Access denied</h1><p>You do not have permission to view this admin area.</p></main>;
}
