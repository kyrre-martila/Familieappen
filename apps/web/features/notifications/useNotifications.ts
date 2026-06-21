"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getNotifications,
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "../../lib/api";

const PAGE_SIZE = 20;

export function useNotifications({ enabled = true }: { enabled?: boolean } = {}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    const result = await getNotificationUnreadCount();
    setUnreadCount(result.count);
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items] = await Promise.all([
        getNotifications({ limit: PAGE_SIZE }),
        refreshUnreadCount(),
      ]);
      setNotifications(items);
      setHasMore(items.length === PAGE_SIZE);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kunne ikke laste varsler.");
    } finally {
      setIsLoading(false);
    }
  }, [refreshUnreadCount]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || notifications.length === 0) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const cursor = notifications.at(-1)?.id;
      const items = await getNotifications({ limit: PAGE_SIZE, cursor });
      setNotifications((current) => [...current, ...items]);
      setHasMore(items.length === PAGE_SIZE);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kunne ikke laste flere varsler.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, notifications]);

  const markRead = useCallback(async (notificationId: string) => {
    const existing = notifications.find((notification) => notification.id === notificationId);
    const updated = await markNotificationRead(notificationId);
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? updated : notification,
      ),
    );
    if (!existing?.readAt) setUnreadCount((current) => Math.max(0, current - 1));
    void refreshUnreadCount();
    return updated;
  }, [notifications, refreshUnreadCount]);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
    await refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!enabled) return;
    void refreshUnreadCount().catch(() => setUnreadCount(0));
  }, [enabled, refreshUnreadCount]);

  return useMemo(() => ({
    error,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMore,
    loadNotifications,
    markAllRead,
    markRead,
    notifications,
    refreshUnreadCount,
    unreadCount,
  }), [error, hasMore, isLoading, isLoadingMore, loadMore, loadNotifications, markAllRead, markRead, notifications, refreshUnreadCount, unreadCount]);
}
