import type { ReactNode } from "react";

export function SettingsSection({ children, title }: Readonly<{ children: ReactNode; title?: string }>) {
  return (
    <section className="settings-section" aria-label={title}>
      {title ? <h2 className="settings-section__title">{title}</h2> : null}
      {children}
    </section>
  );
}
