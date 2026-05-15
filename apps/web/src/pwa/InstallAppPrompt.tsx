import { useInstallPrompt } from "./useInstallPrompt";

export default function InstallAppPrompt() {
  const { canInstall, promptInstall, dismissPrompt } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 12px 12px 14px",
        borderRadius: 20,
        border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--border))",
        background: "color-mix(in srgb, var(--card) 88%, transparent)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 16px 36px rgba(0,0,0,0.22)",
        color: "var(--text)",
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 auto", display: "grid", gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 950 }}>Install Fairwayd</div>
        <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
          Add Fairwayd to your home screen for faster trip access.
        </div>
      </div>

      <button
        type="button"
        onClick={() => void promptInstall()}
        style={{
          height: 34,
          padding: "0 12px",
          borderRadius: 999,
          border: "1px solid var(--accent-strong)",
          background: "var(--accent)",
          color: "#f8fbf6",
          fontSize: 12,
          fontWeight: 900,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Install
      </button>

      <button
        type="button"
        onClick={dismissPrompt}
        aria-label="Dismiss install prompt"
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          border: "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
          background: "transparent",
          color: "var(--sub)",
          fontSize: 16,
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}
