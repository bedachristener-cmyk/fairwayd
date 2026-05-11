import { CalendarDays, Globe, Home, Map, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { t } from "../i18n/strings";

export default function BottomTabs() {
  const nav = useNavigate();
  const loc = useLocation();

  const Tab = (props: {
    to: string;
    label: string;
    icon: React.ReactNode;
  }) => {
    const active = loc.pathname.startsWith(props.to);

    return (
      <button
        type="button"
        onClick={() => nav(props.to)}
        style={{
          flex: "1 1 0",
          minWidth: 0,
          border: 0,
          background: "transparent",
          padding: "9px 4px 7px",
          fontWeight: active ? 900 : 750,
          opacity: active ? 1 : 0.78,
          cursor: "pointer",
          color: active ? "var(--text)" : "var(--sub)",
          display: "grid",
          justifyItems: "center",
          alignContent: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            display: "grid",
            placeItems: "center",
          }}
        >
          {props.icon}
        </div>
        <div
          style={{
            fontSize: 10,
            lineHeight: 1,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {props.label}
        </div>

        <div
          style={{
            marginTop: 4,
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
      <Tab to="/feed" label={t("feed")} icon={<Home size={20} />} />
      <Tab to="/map" label={t("map")} icon={<Map size={20} />} />
      <Tab to="/destinations" label={t("explore")} icon={<Globe size={20} />} />
      <Tab to="/trips" label="Trips" icon={<CalendarDays size={20} />} />
      <Tab to="/profile" label={t("me")} icon={<User size={20} />} />
    </div>
  );
}
