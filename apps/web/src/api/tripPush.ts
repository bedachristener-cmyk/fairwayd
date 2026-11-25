import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export type TripPushPreferences = {
  pushTripNotifications: boolean;
  available: boolean;
  publicKey: string | null;
};

export function getTripPushPreferences(token: string) {
  return apiGet<TripPushPreferences>("/notifications/push-preferences", { token });
}

export function setTripPushPreferences(token: string, enabled: boolean) {
  return apiPatch<{ pushTripNotifications: boolean }>("/notifications/push-preferences", {
    token,
    body: { pushTripNotifications: enabled },
  });
}

function decodeVapidKey(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function tripPushSupported() {
  return typeof window !== "undefined" && window.isSecureContext &&
    "serviceWorker" in navigator && "PushManager" in window &&
    "Notification" in window;
}

/** Call directly from a user click, never on initial page load. */
export async function enableTripPush(token: string, publicKey: string) {
  if (!tripPushSupported()) throw new Error("This device does not support web push.");
  if (!publicKey) throw new Error("Push is not configured on the server.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(publicKey),
    });
  }
  // Persist first; only opt in after registration succeeds.
  await apiPost<{ ok: true }>("/notifications/push-subscriptions", {
    token, body: subscription.toJSON(),
  });
  await setTripPushPreferences(token, true);
}

export async function disableTripPush(token: string) {
  // Turn off delivery preference even if the device subscription is unavailable.
  await setTripPushPreferences(token, false);
  if (!tripPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription?.endpoint) {
    await apiDelete<{ ok: true }>("/notifications/push-subscriptions", {
      token, body: { endpoint: subscription.endpoint },
    });
    await subscription.unsubscribe();
  }
}

/**
 * Detach the browser's device subscription on logout/account switch.
 * Unlike disableTripPush, this leaves the user's preference on other devices intact.
 * Always unsubscribe locally even when the old session has expired.
 */
export async function detachTripPushDevice(token: string | null) {
  if (!tripPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    if (token) {
      await apiDelete<{ ok: true }>("/notifications/push-subscriptions", {
        token, body: { endpoint: subscription.endpoint },
      });
    }
  } finally {
    await subscription.unsubscribe();
  }
}
