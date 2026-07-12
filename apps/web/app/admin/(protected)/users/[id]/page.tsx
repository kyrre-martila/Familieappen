import { AdminUserDetailClient } from "../../../../../components/admin/AdminUserDetailClient";
import { getAdminUser, getCurrentAdmin } from "../../../../../lib/admin-api";
import { AdminApiError } from "../../../../../lib/admin-shared";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await getCurrentAdmin();
  try { return <AdminUserDetailClient userId={id} adminRole={admin.role} initialUser={await getAdminUser(id)} />; }
  catch (error) { const initialError = error instanceof AdminApiError && error.status === 403 ? "forbidden" : error instanceof AdminApiError && error.status === 404 ? "not-found" : "error"; return <AdminUserDetailClient userId={id} adminRole={admin.role} initialUser={null} initialError={initialError} />; }
}
