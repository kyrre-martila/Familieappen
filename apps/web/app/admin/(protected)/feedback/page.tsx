import { AdminFeedbackClient } from "../../../../components/admin/AdminFeedbackClient";
import { getAdminFeedback } from "../../../../lib/admin-api";
import { AdminApiError } from "../../../../lib/admin-shared";

export default async function Page() {
  try { return <AdminFeedbackClient data={await getAdminFeedback()} />; }
  catch (error) { return <AdminFeedbackClient data={null} error={error instanceof AdminApiError && error.status === 403 ? "forbidden" : "error"} />; }
}
