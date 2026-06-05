import type { ReactNode } from "react";

export function SettingsCard({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="settings-card">{children}</div>;
}
