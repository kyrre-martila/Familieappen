import Link from "next/link";
import type { ReactNode } from "react";

interface SettingsRowProps {
  description: string;
  href: string;
  icon: ReactNode;
  title: string;
}

export function SettingsRow({ description, href, icon, title }: SettingsRowProps) {
  return (
    <Link className="settings-row" href={href}>
      <span className="settings-row__icon" aria-hidden="true">{icon}</span>
      <span className="settings-row__copy">
        <span className="settings-row__title">{title}</span>
        <span className="settings-row__description">{description}</span>
      </span>
      <span className="settings-row__chevron" aria-hidden="true">
        <svg fill="none" viewBox="0 0 24 24">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}
