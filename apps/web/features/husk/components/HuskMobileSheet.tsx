import type { ReactNode } from "react";

import { AppSheet } from "../../../components/app-ui";

export function HuskMobileSheet({
  children,
  isOpen,
  labelledBy,
  onClose,
}: {
  children: ReactNode;
  isOpen: boolean;
  labelledBy: string;
  onClose: () => void;
}) {
  return (
    <AppSheet
      baseClassName="calendar-filter-sheet"
      isOpen={isOpen}
      labelledBy={labelledBy}
      onClose={onClose}
      wrapContent={false}
    >
      {children}
    </AppSheet>
  );
}
