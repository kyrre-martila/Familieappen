import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { AppCard } from "../app-ui";

interface SettingsCardProps extends ComponentPropsWithoutRef<"article"> {
  children: ReactNode;
}

export function SettingsCard({ children, className, ...props }: SettingsCardProps) {
  return (
    <AppCard
      className={["settings-card", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </AppCard>
  );
}
