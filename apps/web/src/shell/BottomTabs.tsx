import { useLocation, useNavigate } from "react-router-dom";

export default function BottomTabs() {
  const nav = useNavigate();
  const loc = useLocation();

  const Tab = (props: { to: string; label: string; icon: string }) => {
    const active = loc.pathname.startsWith(props.to);

    return (
      <button
        type="button"
        onClick={() => nav(props.to)}
        style={{
          flex: 1,
          border: 0,
          background: "transparent",
          padding: "10px 6px",
          fontWeight: active ? 900 : 700,
          opacity: active ? 1 : 0.75,
          cursor: "pointer",
          color: active ? "var(--text)" : "var(--sub)",
          display: "grid",
          placeItems: "center",
          gap: 4,
        }}
      >
        <div style={{ fontSize: 18, lineHeight: "18px" }}>{props.icon}</div>
        <div style={{ fontSize: 11 }}>{props.label}</div>

        {/* active underline */}
        <div
          style={{
            marginTop: 6,
            height: 3,
            width: 22,
            borderRadius: 999,
            background: active ? "var(--green)" : "transparent",
          }}
        />
      </button>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(10,14,11,0.92)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 2000,
      }}
    >
      <Tab to="/feed" label="Feed" icon="📰" />
      <Tab to="/map" label="Map" icon="🗺️" />
      <Tab to="/destinations" label="Explore" icon="🌍" />
      <Tab to="/profile" label="Me" icon="👤" />
    </div>
  );
}
