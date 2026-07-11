import { AdminUserDetailClient } from "../../../../../components/admin/AdminUserDetailClient";
import { getAdminUser } from "../../../../../lib/admin-api";
import { AdminApiError } from "../../../../../lib/admin-shared";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { return <AdminUserDetailClient userId={id} initialUser={await getAdminUser(id)} />; }
  catch (error) { const initialError = error instanceof AdminApiError && error.status === 403 ? "forbidden" : error instanceof AdminApiError && error.status === 404 ? "not-found" : "error"; return <AdminUserDetailClient userId={id} initialUser={null} initialError={initialError} />; }
}
