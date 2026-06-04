import Link from "next/link";
import { ClipboardList } from "lucide-react";

export function HuskReminderEmptyState({
  actionHref,
  actionLabel,
  title,
  description,
}: {
  actionHref?: string;
  actionLabel?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="husk-empty-state" role="status">
      <span className="husk-empty-state__icon" aria-hidden="true">
        <ClipboardList size={28} strokeWidth={2.25} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link className="husk-empty-state__action" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
