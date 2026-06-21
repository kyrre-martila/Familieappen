"use client";

import { CalendarDays, CheckCircle2, Gift, ListChecks, MailPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppActionFooter, AppCard, AppSheet } from "../../components/app-ui";
import type { AppNotification } from "../../lib/api";
import { useNotifications } from "./useNotifications";

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  notificationsState: ReturnType<typeof useNotifications>;
}

function relativeTime(value: string) {
  const diffSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("nb-NO", { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) return formatter.format(Math.round(diffSeconds / seconds), unit);
  }
  return formatter.format(diffSeconds, "second");
}

function normalizeNotificationDeepLink(notification: AppNotification) {
  const deepLink = notification.deepLink ?? "";
  const legacyShoppingListMatch = deepLink.match(/^\/shopping\/([^/?#]+)\/?$/);
  if (legacyShoppingListMatch) {
    return `/shopping?${new URLSearchParams({ listId: legacyShoppingListMatch[1] }).toString()}`;
  }

  if (notification.type === "wishlist_item_added" && deepLink === "/wishlist") {
    return "/wishlist?tab=shared";
  }

  return deepLink;
}

function NotificationIcon({ notification }: { notification: AppNotification }) {
  const props = { "aria-hidden": true, size: 20, strokeWidth: 2.2 } as const;
  if (notification.type.includes("calendar")) return <CalendarDays {...props} />;
  if (notification.type.includes("task")) return <CheckCircle2 {...props} />;
  if (notification.type.includes("wishlist")) return <Gift {...props} />;
  if (notification.type.includes("invite") || notification.type.includes("access")) return <MailPlus {...props} />;
  if (notification.type.includes("reminder") || notification.type.includes("shopping")) return <ListChecks {...props} />;
  return <Users {...props} />;
}

export function NotificationSheet({ isOpen, onClose, notificationsState }: NotificationSheetProps) {
  const router = useRouter();
  const { error, hasMore, isLoading, isLoadingMore, loadMore, markAllRead, markRead, notifications, unreadCount } = notificationsState;

  async function handleNotificationClick(notification: AppNotification) {
    await markRead(notification.id);
    if (notification.deepLink) {
      onClose();
      router.push(normalizeNotificationDeepLink(notification));
    }
  }

  return (
    <AppSheet
      actions={
        <button className="button button--secondary" type="button" onClick={() => void markAllRead()} disabled={unreadCount === 0}>
          Marker alle som lest
        </button>
      }
      className="notification-sheet"
      contentClassName="notification-sheet__content"
      isOpen={isOpen}
      labelledBy="notification-sheet-title"
      onClose={onClose}
    >
      <header className="notification-sheet__header">
        <h2 id="notification-sheet-title">Varsler</h2>
      </header>

      {error ? <p className="notification-sheet__error" role="alert">{error}</p> : null}
      {isLoading ? <p className="notification-sheet__status">Laster varsler …</p> : null}

      {!isLoading && notifications.length === 0 ? (
        <AppCard className="notification-empty">
          <h3>Ingen varsler</h3>
          <p>Du har ingen varsler akkurat nå.</p>
        </AppCard>
      ) : null}

      {notifications.length > 0 ? (
        <ul className="notification-list" aria-label="Varsler">
          {notifications.map((notification) => {
            const isUnread = !notification.readAt;
            return (
              <li key={notification.id}>
                <button
                  className={`notification-row${isUnread ? " notification-row--unread" : ""}`}
                  type="button"
                  onClick={() => void handleNotificationClick(notification)}
                >
                  <span className="notification-row__icon"><NotificationIcon notification={notification} /></span>
                  <span className="notification-row__content">
                    <span className="notification-row__title">{notification.title}</span>
                    <span className="notification-row__body">{notification.body}</span>
                    <span className="notification-row__time">{relativeTime(notification.createdAt)}</span>
                  </span>
                  {isUnread ? <span className="notification-row__unread" aria-label="Ulest" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {hasMore ? (
        <AppActionFooter className="notification-sheet__load-more">
          <button className="button button--secondary" type="button" onClick={() => void loadMore()} disabled={isLoadingMore}>
            {isLoadingMore ? "Laster …" : "Last flere"}
          </button>
        </AppActionFooter>
      ) : null}
    </AppSheet>
  );
}
