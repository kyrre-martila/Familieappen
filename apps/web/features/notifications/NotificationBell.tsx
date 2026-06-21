"use client";

import { Bell } from "lucide-react";

interface NotificationBellProps {
  onClick: () => void;
  unreadCount: number;
}

export function NotificationBell({ onClick, unreadCount }: NotificationBellProps) {
  return (
    <button
      className="notification-bell"
      type="button"
      aria-label={unreadCount > 0 ? `Åpne varsler, ${unreadCount} uleste` : "Åpne varsler"}
      onClick={onClick}
    >
      <Bell aria-hidden="true" className="notification-bell__icon" size={20} strokeWidth={2.25} />
      {unreadCount > 0 ? (
        <span className="notification-bell__badge" aria-hidden="true">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
