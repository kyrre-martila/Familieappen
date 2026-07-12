import { AdminFeedbackDetail } from "../../../../../components/admin/AdminFeedbackClient";
import { getAdminFeedbackSubmission } from "../../../../../lib/admin-api";
import { AdminApiError } from "../../../../../lib/admin-shared";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { return <AdminFeedbackDetail item={await getAdminFeedbackSubmission(id)} />; }
  catch (error) { return <AdminFeedbackDetail item={null} error={error instanceof AdminApiError && error.status === 403 ? "forbidden" : error instanceof AdminApiError && error.status === 404 ? "not-found" : "error"} />; }
}
