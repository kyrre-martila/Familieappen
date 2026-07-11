import { AdminStatisticsClient } from "../../../../components/admin/AdminStatisticsClient";
import { getAdminStatistics } from "../../../../lib/admin-api";
import { AdminApiError } from "../../../../lib/admin-shared";

export default async function Page() {
  try { return <AdminStatisticsClient initialStatistics={await getAdminStatistics()} />; }
  catch (error) { return <AdminStatisticsClient initialStatistics={null} initialError={error instanceof AdminApiError && error.status === 403 ? "forbidden" : "error"} />; }
}
