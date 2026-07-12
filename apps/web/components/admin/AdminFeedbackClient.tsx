import Link from "next/link";
import { adminFeedbackTypeLabel, type AdminFeedbackListResponse, type AdminFeedbackSubmission } from "../../lib/admin-shared";

export function AdminFeedbackClient({ data, error }: { data: AdminFeedbackListResponse | null; error?: "forbidden" | "error" }) {
  return <section className="admin-data-page" aria-labelledby="feedback-title">
    <div className="admin-page-header"><p>FEEDBACK</p><h1 id="feedback-title">Feedback</h1><span>Review user feedback and reported bugs submitted from the app.</span></div>
    {error === "forbidden" ? <AdminState title="Access denied" message="You do not have permission to view feedback submissions." /> : null}
    {error === "error" ? <div className="admin-alert" role="alert"><p>Feedback submissions could not be loaded. Please try again.</p></div> : null}
    {!error && data ? <div className="admin-feedback-sections">
      <FeedbackSection title="BUG REPORTS" emptyTitle="No bug reports yet" emptyMessage="Great news — there are no reported bugs to review right now." items={data.bugReports} />
      <FeedbackSection title="GENERAL FEEDBACK" emptyTitle="No general feedback yet" emptyMessage="User feedback will appear here once families submit it from the app." items={data.generalFeedback} />
    </div> : null}
  </section>;
}

function FeedbackSection({ title, emptyTitle, emptyMessage, items }: { title: string; emptyTitle: string; emptyMessage: string; items: AdminFeedbackSubmission[] }) {
  return <section className="admin-card admin-feedback-section" aria-labelledby={`${title.toLowerCase().replace(/\s+/g, "-")}-title`}>
    <div className="admin-section-heading"><h2 id={`${title.toLowerCase().replace(/\s+/g, "-")}-title`}>{title}</h2><span>{items.length} submissions</span></div>
    {items.length ? <div className="admin-card-list admin-feedback-list">{items.map((item) => <FeedbackCard key={item.id} item={item} />)}</div> : <AdminState title={emptyTitle} message={emptyMessage} />}
  </section>;
}

function FeedbackCard({ item }: { item: AdminFeedbackSubmission }) {
  const submittedDate = formatDate(item.createdAt);
  const status = item.status || "New";

  return <Link className="admin-feedback-row" href={`/admin/feedback/${encodeURIComponent(item.id)}`} aria-label={`Open feedback submission: ${item.title}`}>
    <span className="admin-feedback-row__main">
      <span className="admin-feedback-row__title">{item.title}</span>
      <span className="admin-feedback-row__meta">{item.userName?.trim() ? <>{item.userName.trim()} <span aria-hidden="true">·</span> </> : null}{submittedDate}</span>
    </span>
    <span className="admin-status admin-status--active admin-feedback-row__status">{status}</span>
  </Link>;
}

export function AdminFeedbackDetail({ item, error }: { item: AdminFeedbackSubmission | null; error?: "forbidden" | "error" | "not-found" }) {
  return <section className="admin-data-page" aria-labelledby="feedback-detail-title">
    <div className="admin-page-header"><p>{item ? adminFeedbackTypeLabel(item.type).toUpperCase() : "FEEDBACK"}</p><h1 id="feedback-detail-title">{item?.title ?? "Feedback submission"}</h1><span>Read-only support details for a submitted app message.</span></div>
    <Link className="admin-button" href="/admin/feedback">← Back to feedback</Link>
    {error ? <AdminState title={error === "forbidden" ? "Access denied" : error === "not-found" ? "Submission not found" : "Could not load submission"} message={error === "forbidden" ? "You do not have permission to view feedback submissions." : error === "not-found" ? "This feedback submission could not be found." : "Please try again later."} /> : null}
    {item ? <article className="admin-card admin-feedback-detail"><dl>
      <Meta label="Type" value={adminFeedbackTypeLabel(item.type)} /><Meta label="Title" value={item.title} /><Meta label="Submitted" value={formatDateTime(item.createdAt)} /><Meta label="User" value={item.userName} /><Meta label="Email" value={item.email} /><Meta label="Family" value={item.familyName} /><Meta label="App version" value={item.appVersion} /><Meta label="Browser / OS" value={item.userAgent} /><Meta label="Status" value={item.status || "New"} />
    </dl><div className="admin-feedback-message"><h2>Full message</h2><p>{item.message}</p></div></article> : null}
  </section>;
}

function Meta({ label, value }: { label: string; value?: string | null }) { return <div><dt>{label}</dt><dd>{value?.trim() || "Not provided"}</dd></div>; }
function AdminState({ title, message }: { title: string; message: string }) { return <div className="admin-state admin-state--inline"><h2>{title}</h2><p>{message}</p></div>; }
function formatDate(v: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(v)); }
function formatDateTime(v: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)); }
