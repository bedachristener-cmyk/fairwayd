import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function FeedBadge() {
  const nav = useNavigate();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <div
      onClick={() => nav("/feed")}
      style={{
        position: "absolute",
        top: 12,
        right: 140, // links vom LoggedInBadge
        zIndex: 1000,
        background: "white",
        padding: "8px 12px",
        borderRadius: 999,
        boxShadow: "0 2px 12px rgba(0,0,0,.15)",
        fontFamily: "system-ui",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        userSelect: "none",
      }}
      title="Open feed"
    >
      Feed
    </div>
  );
}
