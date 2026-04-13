import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { fileUrl } from "../api/fileUrl";

type UserItem = {
  id: string;
  handle: string;
  name?: string | null;
  avatarUrl?: string | null;
};

export default function FriendsPage() {
  const nav = useNavigate();
  const auth = useAuth() as any;

  const [tab, setTab] = useState<"following" | "followers">("following");
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadFollowing() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/following`, {
        headers: { Authorization: `Bearer ${auth?.token}` },
      });

      if (!res.ok) {
        setItems([]);
        return;
      }

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadFollowing failed", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadFollowers() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/followers`, {
        headers: { Authorization: `Bearer ${auth?.token}` },
      });

      if (!res.ok) {
        setItems([]);
        return;
      }

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadFollowers failed", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!auth?.token) return;

    if (tab === "following") {
      loadFollowing();
    } else {
      loadFollowers();
    }
  }, [tab, auth?.token]);

  return (
    <div style={{ padding: 14, display: "grid", gap: 14 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Friends</div>
        <div style={{ fontSize: 13, color: "var(--sub)" }}>
          Your golf network
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "var(--bg)",
          padding: 4,
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => setTab("following")}
          style={{
            flex: 1,
            height: 36,
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 800,
            background: tab === "following" ? "var(--card)" : "transparent",
            color: "var(--text)",
          }}
        >
          Following
        </button>

        <button
          onClick={() => setTab("followers")}
          style={{
            flex: 1,
            height: 36,
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 800,
            background: tab === "followers" ? "var(--card)" : "transparent",
            color: "var(--text)",
          }}
        >
          Followers
        </button>
      </div>

      {/* List */}
      <div style={{ display: "grid", gap: 8 }}>
        {loading ? (
          <div style={{ color: "var(--sub)" }}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={{ color: "var(--sub)" }}>No users found</div>
        ) : (
          items.map((u) => (
            <div
              key={u.id}
              onClick={() => nav(`/u/${u.handle}`)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                cursor: "pointer",
              }}
            >
              {u.avatarUrl ? (
                <img
                  src={fileUrl(u.avatarUrl)}
                  alt={u.handle}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid var(--border)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--bg)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    color: "var(--text)",
                  }}
                >
                  {(u.name || u.handle).slice(0, 1).toUpperCase()}
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 800,
                    color: "var(--text)",
                  }}
                >
                  {u.name || u.handle}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--sub)",
                  }}
                >
                  @{u.handle}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
