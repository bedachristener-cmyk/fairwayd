import { useCallback, useEffect, useState } from "react";

const DISMISSED_KEY = "fairwayd.notificationPermissionPrompt.dismissedAt";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const PROMPT_DELAY_MS = 2500;

function supportsNotificationPermission() {
  return typeof window !== "undefined" && "Notification" in window;
}

function recentlyDismissed() {
  if (typeof window === "undefined") return true;

  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;

    const dismissedAt = Number(raw);
    return (
      Number.isFinite(dismissedAt) &&
      Date.now() - dismissedAt < DISMISS_TTL_MS
    );
  } catch {
    return false;
  }
}

export function useNotificationPermission(enabled: boolean) {
  const [canShowPrompt, setCanShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );

  useEffect(() => {
    setCanShowPrompt(false);

    if (!enabled || !supportsNotificationPermission()) {
      setPermission(null);
      return;
    }

    const currentPermission = window.Notification.permission;
    setPermission(currentPermission);

    if (currentPermission !== "default" || recentlyDismissed()) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (window.Notification.permission === "default" && !recentlyDismissed()) {
        setCanShowPrompt(true);
      }
    }, PROMPT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [enabled]);

  const dismissPrompt = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Best-effort only.
    }

    setCanShowPrompt(false);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supportsNotificationPermission()) {
      setCanShowPrompt(false);
      return null;
    }

    try {
      const nextPermission = await window.Notification.requestPermission();
      setPermission(nextPermission);
      setCanShowPrompt(false);
      return nextPermission;
    } catch {
      setCanShowPrompt(false);
      return null;
    }
  }, []);

  return {
    canShowPrompt,
    permission,
    dismissPrompt,
    requestPermission,
  };
}
