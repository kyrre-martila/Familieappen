import type { ReactNode } from "react";
import { AppSectionHeader } from "../app-ui";

interface SettingsSectionProps {
  children: ReactNode;
  title?: string;
}

export function SettingsSection({ children, title }: Readonly<SettingsSectionProps>) {
  return (
    <section className="settings-section" aria-label={title}>
      {title ? <AppSectionHeader className="settings-section__header" title={title} /> : null}
      {children}
    </section>
  );
}
