import { apiGet, apiPatch } from "./client";

export type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type NotificationUnreadCount = {
  count: number;
};

export type MarkAllNotificationsReadResponse = {
  ok: true;
  updatedCount: number;
};

export function fetchNotifications(token: string | null | undefined) {
  return apiGet<NotificationItem[]>("/notifications", { token });
}

export function fetchNotificationUnreadCount(token: string | null | undefined) {
  return apiGet<NotificationUnreadCount>("/notifications/unread-count", {
    token,
  });
}

export function markNotificationRead(
  token: string | null | undefined,
  notificationId: string,
) {
  return apiPatch<NotificationItem>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { token },
  );
}

export function markAllNotificationsRead(token: string | null | undefined) {
  return apiPatch<MarkAllNotificationsReadResponse>(
    "/notifications/read-all",
    { token },
  );
}
