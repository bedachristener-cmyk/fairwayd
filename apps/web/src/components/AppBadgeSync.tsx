import { useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { fetchNotificationUnreadCount } from "../api/notifications";

type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** Sync the installed PWA icon badge with unread notifications when supported. */
export default function AppBadgeSync() {
  const { token } = useAuth() as { token?: string | null };

  useEffect(() => {
    const badge = navigator as BadgeNavigator;
    if (!badge.setAppBadge && !badge.clearAppBadge) return;

    let active = true;
    const refresh = async () => {
      if (!token) {
        await badge.clearAppBadge?.().catch(() => undefined);
        return;
      }
      try {
        const result = await fetchNotificationUnreadCount(token);
        if (!active) return;
        const count = Math.max(0, Number(result?.count) || 0);
        if (count > 0) await badge.setAppBadge?.(count);
        else await badge.clearAppBadge?.();
      } catch {
        // Keep the last known badge on transient network failures.
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 60000);
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("notifications:updated", onFocus);
    window.addEventListener("notification-read", onFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("notifications:updated", onFocus);
      window.removeEventListener("notification-read", onFocus);
    };
  }, [token]);

  return null;
}
