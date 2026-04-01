import React, { useEffect, useState } from "react";
import { API_BASE } from "../api/base";
import { fileUrl } from "../api/fileUrl";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

type UserItem = {
  id: string;
  handle: string;
  name?: string | null;
  avatarUrl?: string | null;
  followStatus?: "NONE" | "PENDING" | "ACCEPTED" | "SELF" | "UNKNOWN";
};

export default function UserSearchPage() {
  const { token } = useAuth();
  const nav = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${API_BASE}/users/search?q=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) {
          throw new Error("Search failed");
        }

        const data = await res.json();
        const baseItems = Array.isArray(data) ? data : [];

        const itemsWithStatus: UserItem[] = await Promise.all(
          baseItems.map(async (item): Promise<UserItem> => {
            try {
              const statusRes = await fetch(
                `${API_BASE}/users/id/${item.id}/following-status`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );

              if (!statusRes.ok) {
                return {
                  ...item,
                  followStatus: "UNKNOWN",
                };
              }

              const statusData = await statusRes.json();
              const rawStatus = String(
                statusData?.status ?? "UNKNOWN",
              ).toUpperCase();

              let followStatus: UserItem["followStatus"] = "UNKNOWN";

              if (rawStatus === "ACCEPTED") followStatus = "ACCEPTED";
              else if (rawStatus === "PENDING") followStatus = "PENDING";
              else if (rawStatus === "SELF") followStatus = "SELF";
              else if (rawStatus === "NONE") followStatus = "NONE";

              return {
                ...item,
                followStatus,
              };
            } catch {
              return {
                ...item,
                followStatus: "UNKNOWN",
              };
            }
          }),
        );

        setResults(itemsWithStatus);

        setResults(itemsWithStatus);
      } catch (err) {
        console.error("User search failed", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query, token]);

  function getFollowLabel(status?: UserItem["followStatus"]) {
    if (status === "ACCEPTED") return "Following";
    if (status === "PENDING") return "Requested";
    if (status === "SELF") return "You";
    return "Follow";
  }

  async function handleToggleFollow(
    e: React.MouseEvent<HTMLButtonElement>,
    user: UserItem,
  ) {
    e.stopPropagation();

    if (!token) return;
    if (user.followStatus === "SELF") return;
    if (followBusyId) return;

    const current = user.followStatus ?? "NONE";
    const isActive = current === "ACCEPTED" || current === "PENDING";

    setFollowBusyId(user.id);

    setResults((prev) =>
      prev.map((item) =>
        item.id === user.id
          ? {
              ...item,
              followStatus: isActive ? "NONE" : "PENDING",
            }
          : item,
      ),
    );

    try {
      const res = await fetch(`${API_BASE}/users/id/${user.id}/follow`, {
        method: isActive ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Follow request failed: ${res.status}`);
      }

      if (!isActive) {
        const data = await res.json().catch(() => null);
        const status = String(data?.status ?? "PENDING").toUpperCase();

        setResults((prev) =>
          prev.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  followStatus:
                    status === "ACCEPTED"
                      ? "ACCEPTED"
                      : status === "PENDING"
                        ? "PENDING"
                        : "NONE",
                }
              : item,
          ),
        );
      } else {
        setResults((prev) =>
          prev.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  followStatus: "NONE",
                }
              : item,
          ),
        );
      }
    } catch (err) {
      console.error("Follow toggle failed", err);

      setResults((prev) =>
        prev.map((item) =>
          item.id === user.id
            ? {
                ...item,
                followStatus: current,
              }
            : item,
        ),
      );
    } finally {
      setFollowBusyId(null);
    }
  }

  return (
    <div
      style={{
        padding: 12,
        display: "grid",
        gap: 12,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18, color: "var(--text)" }}>
        🔍 Find golfers
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or handle..."
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)",
          fontSize: 14,
          boxSizing: "border-box",
        }}
      />

      {loading && (
        <div style={{ fontSize: 13, color: "var(--sub)" }}>Searching...</div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {results.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => nav(`/u/${u.handle}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              maxWidth: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              cursor: "pointer",
              textAlign: "left",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {u.avatarUrl ? (
              <img
                src={fileUrl(u.avatarUrl)}
                alt={u.handle}
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  minHeight: 40,
                  maxWidth: 40,
                  maxHeight: 40,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  minHeight: 40,
                  maxWidth: 40,
                  maxHeight: 40,
                  borderRadius: "50%",
                  background: "rgba(39,196,107,0.18)",
                  border: "1px solid rgba(39,196,107,0.35)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  color: "var(--text)",
                  flexShrink: 0,
                }}
              >
                {(u.name || u.handle).slice(0, 1).toUpperCase()}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                flex: 1,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: "var(--text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {u.name || u.handle}
              </span>

              <span
                style={{
                  fontSize: 12,
                  color: "var(--sub)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                @{u.handle}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => handleToggleFollow(e, u)}
              disabled={u.followStatus === "SELF" || followBusyId === u.id}
              style={{
                padding: "7px 10px",
                borderRadius: 999,
                border:
                  u.followStatus === "ACCEPTED"
                    ? "1px solid rgba(39,196,107,0.35)"
                    : "1px solid var(--border)",
                background:
                  u.followStatus === "ACCEPTED"
                    ? "rgba(39,196,107,0.16)"
                    : "var(--bg)",
                color: "var(--text)",
                fontWeight: 800,
                fontSize: 11,
                cursor:
                  u.followStatus === "SELF" || followBusyId === u.id
                    ? "default"
                    : "pointer",
                opacity: followBusyId === u.id ? 0.6 : 1,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {followBusyId === u.id ? "..." : getFollowLabel(u.followStatus)}
            </button>
          </button>
        ))}
      </div>

      {!loading && results.length === 0 && query.trim().length >= 2 && (
        <div style={{ padding: 16, color: "var(--sub)" }}>No users found</div>
      )}
    </div>
  );
}
