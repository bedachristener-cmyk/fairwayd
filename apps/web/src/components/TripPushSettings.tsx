import { useEffect, useState } from "react";
import {
  disableTripPush,
  enableTripPush,
  getTripPushPreferences,
  tripPushSupported,
  type TripPushPreferences,
} from "../api/tripPush";

export default function TripPushSettings({ token }: { token: string }) {
  const [settings, setSettings] = useState<TripPushPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSettings(null);
    setError(null);
    getTripPushPreferences(token)
      .then(value => { if (active) setSettings(value); })
      .catch(() => { if (active) setError("Push settings could not be loaded."); });
    return () => { active = false; };
  }, [token]);

  async function toggle() {
    if (!settings || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (settings.pushTripNotifications) await disableTripPush(token);
      else await enableTripPush(token, settings.publicKey || "");
      setSettings(await getTripPushPreferences(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update push settings.");
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return null;
  const supported = tripPushSupported();
  return (
    <section style={{
      padding: 16, borderRadius: 18, border: "1px solid var(--border)",
      background: "var(--card)", display: "grid", gap: 9,
    }}>
      <strong>Trip push notifications</strong>
      <span style={{ fontSize: 13, color: "var(--sub)" }}>
        Get notified about trip changes on this device. Only updates you are allowed to see will be sent.
      </span>
      {!supported ? (
        <span style={{ fontSize: 12, color: "var(--sub)" }}>
          Web push is not available here. On iPhone, add Fairwayd to your Home Screen and open it there.
        </span>
      ) : null}
      {!settings.available ? (
        <span style={{ fontSize: 12, color: "var(--sub)" }}>
          Push delivery is not yet enabled for this pilot.
        </span>
      ) : null}
      <button type="button" onClick={() => void toggle()}
        disabled={busy || (!settings.pushTripNotifications && (!settings.available || !supported))}
        style={{ padding: 11, borderRadius: 12, border: "1px solid var(--border)",
          background: "var(--bg)", color: "var(--text)", fontWeight: 700 }}>
        {busy ? "Updating…" : settings.pushTripNotifications ? "Disable trip push" : "Enable trip push"}
      </button>
      {error ? <span role="alert" style={{ fontSize: 12, color: "var(--danger, #c33)" }}>{error}</span> : null}
    </section>
  );
}
