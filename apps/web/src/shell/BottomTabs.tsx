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
          opacity: active ? 1 : 0.7,
          cursor: "pointer",
        }}
      >
        <div style={{ fontSize: 18 }}>{props.icon}</div>
        <div style={{ fontSize: 11 }}>{props.label}</div>
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
        background: "white",
        borderTop: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <Tab to="/feed" label="Feed" icon="📰" />
      <Tab to="/map" label="Map" icon="🗺️" />
      <Tab to="/profile" label="Me" icon="👤" />
    </div>
  );
}
