import { useAuth } from "../auth/AuthContext";
import { useNotificationPermission } from "../hooks/useNotificationPermission";

export default function NotificationPermissionPrompt() {
  const { isAuthenticated, loading } = useAuth();
  const { canShowPrompt, dismissPrompt, requestPermission } =
    useNotificationPermission(isAuthenticated && !loading);

  if (!canShowPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Notification permission"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(148px + env(safe-area-inset-bottom, 0px))",
        zIndex: 1190,
        display: "grid",
        gap: 12,
        width: "min(420px, calc(100vw - 24px))",
        maxWidth: "calc(100vw - 24px)",
        margin: "0 auto",
        padding: "14px",
        borderRadius: 20,
        border: "1px solid color-mix(in srgb, var(--green) 26%, var(--border))",
        background: "color-mix(in srgb, var(--card) 92%, transparent)",
        backdropFilter: "blur(18px)",
        boxShadow: "0 18px 42px rgba(0,0,0,0.24)",
        color: "var(--text)",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 950, lineHeight: 1.25 }}>
          Stay in the loop
        </div>
        <div style={{ color: "var(--sub)", fontSize: 12.5, lineHeight: 1.45 }}>
          Get notified when someone follows you or reacts to your golf moments.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => void requestPermission()}
          style={{
            minHeight: 38,
            padding: "0 14px",
            borderRadius: 999,
            border: "1px solid color-mix(in srgb, var(--green) 74%, var(--border))",
            background: "var(--green)",
            color: "#07110b",
            fontSize: 13,
            fontWeight: 900,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Enable notifications
        </button>

        <button
          type="button"
          onClick={dismissPrompt}
          style={{
            minHeight: 38,
            padding: "0 13px",
            borderRadius: 999,
            border: "1px solid color-mix(in srgb, var(--border) 84%, transparent)",
            background: "transparent",
            color: "var(--sub)",
            fontSize: 13,
            fontWeight: 850,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
