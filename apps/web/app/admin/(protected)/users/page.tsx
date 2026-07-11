import { AdminUsersClient } from "../../../../components/admin/AdminUsersClient";
import { getAdminUsers } from "../../../../lib/admin-api";
import { AdminApiError } from "../../../../lib/admin-shared";

const PAGE_SIZES = [20, 50, 100];

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = parseQuery(params);
  try {
    const users = await getAdminUsers({ search: query.search || undefined, status: query.status === "all" ? undefined : query.status, sort: query.sort, page: query.page, pageSize: query.pageSize });
    return <AdminUsersClient initialData={users} initialQuery={query} />;
  } catch (error) {
    return <AdminUsersClient initialData={null} initialError={error instanceof AdminApiError && error.status === 403 ? "forbidden" : "error"} initialQuery={query} />;
  }
}
function value(v: string | string[] | undefined) { return Array.isArray(v) ? v[0] : v; }
function parseQuery(params: Record<string, string | string[] | undefined>) { const status = value(params.status); const sort = value(params.sort); const pageSize = Number(value(params.pageSize)); return { search: (value(params.search) ?? "").trim(), status: (status === "active" || status === "inactive" ? status : "all") as "active" | "inactive" | "all", sort: sort === "oldest" || sort === "asc" ? "asc" as const : "desc" as const, page: Math.max(1, Number(value(params.page) ?? 1) || 1), pageSize: PAGE_SIZES.includes(pageSize) ? pageSize : 20 }; }
