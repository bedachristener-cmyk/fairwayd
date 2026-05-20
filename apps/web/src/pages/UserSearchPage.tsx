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
      } catch (err) {
        console.error("User search failed", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query, token]);

  function getFollowLabel(status?: UserItem["followStatus"], isBusy?: boolean) {
    if (isBusy) {
      if (status === "ACCEPTED" || status === "PENDING") return "Updating...";
      return "Requesting...";
    }

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
      className="fw-page-shell"
      style={{
        padding: "12px 14px calc(96px + env(safe-area-inset-bottom, 0px))",
        display: "grid",
        gap: 14,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 26,
          border: "1px solid color-mix(in srgb, var(--border) 46%, transparent)",
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--card) 94%, var(--green) 6%), color-mix(in srgb, var(--card) 98%, var(--bg)))",
          boxShadow: "0 14px 38px rgba(0,0,0,0.10)",
          padding: 16,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 16% 0%, color-mix(in srgb, var(--green) 18%, transparent), transparent 38%), radial-gradient(circle at 86% 8%, color-mix(in srgb, var(--muted) 72%, transparent), transparent 42%)",
            opacity: 0.72,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gap: 14,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 10px",
                borderRadius: 999,
                border:
                  "1px solid color-mix(in srgb, var(--border) 46%, transparent)",
                background: "color-mix(in srgb, var(--muted) 58%, transparent)",
                color: "var(--sub)",
                fontSize: 11,
                fontWeight: 800,
                marginBottom: 9,
              }}
            >
              Social discovery
            </div>

            <div
              style={{
                fontWeight: 850,
                fontSize: 26,
                lineHeight: 1.08,
                letterSpacing: -0.45,
                color: "var(--text)",
              }}
            >
              Find golfers
            </div>

            <div
              style={{
                marginTop: 5,
                color: "var(--sub)",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              Discover players, friends and golf travel companions.
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minHeight: 48,
              padding: "0 14px",
              borderRadius: 999,
              border:
                "1px solid color-mix(in srgb, var(--border) 52%, transparent)",
              background: "color-mix(in srgb, var(--muted) 64%, transparent)",
              boxSizing: "border-box",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                color: "var(--sub)",
                fontSize: 15,
                lineHeight: 1,
              }}
            >
              Search
            </span>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or handle..."
              style={{
                width: "100%",
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--text)",
                fontSize: 15,
                fontWeight: 650,
                boxSizing: "border-box",
              }}
            />
          </label>
        </div>
      </section>

      {loading && (
        <div
          style={{
            padding: "13px 14px",
            borderRadius: 20,
            border: "1px solid color-mix(in srgb, var(--border) 42%, transparent)",
            background: "color-mix(in srgb, var(--muted) 52%, transparent)",
            color: "var(--sub)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Searching for golfers...
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {results.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => nav(`/u/${u.handle}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              width: "100%",
              maxWidth: "100%",
              padding: "12px",
              borderRadius: 22,
              border: "1px solid color-mix(in srgb, var(--border) 46%, transparent)",
              background: "color-mix(in srgb, var(--card) 96%, var(--bg))",
              color: "var(--text)",
              cursor: "pointer",
              textAlign: "left",
              boxSizing: "border-box",
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            {u.avatarUrl ? (
              <img
                src={fileUrl(u.avatarUrl)}
                alt={u.handle}
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  minHeight: 44,
                  maxWidth: 44,
                  maxHeight: 44,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid color-mix(in srgb, var(--card) 88%, transparent)",
                  boxShadow:
                    "0 8px 20px rgba(0,0,0,0.12), 0 0 0 1px color-mix(in srgb, var(--border) 54%, transparent)",
                  flexShrink: 0,
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  minHeight: 44,
                  maxWidth: 44,
                  maxHeight: 44,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--green) 18%, var(--muted)), var(--muted))",
                  border:
                    "1px solid color-mix(in srgb, var(--green) 42%, var(--border))",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 850,
                  color: "var(--text)",
                  flexShrink: 0,
                  boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
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
                gap: 3,
              }}
            >
              <span
                style={{
                  fontWeight: 850,
                  fontSize: 14,
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
                  fontWeight: 650,
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
                minWidth: 96,
                minHeight: 36,
                padding: "0 13px",
                borderRadius: 999,
                border:
                  u.followStatus === "ACCEPTED"
                    ? "1px solid color-mix(in srgb, var(--green) 52%, var(--border))"
                    : u.followStatus === "PENDING"
                      ? "1px solid color-mix(in srgb, var(--border) 54%, transparent)"
                      : u.followStatus === "SELF"
                        ? "1px solid color-mix(in srgb, var(--border) 54%, transparent)"
                        : "1px solid color-mix(in srgb, var(--green) 72%, var(--border))",
                background:
                  u.followStatus === "ACCEPTED"
                    ? "color-mix(in srgb, var(--green) 14%, var(--card))"
                    : u.followStatus === "PENDING"
                      ? "color-mix(in srgb, var(--muted) 62%, transparent)"
                      : u.followStatus === "SELF"
                        ? "color-mix(in srgb, var(--muted) 52%, transparent)"
                        : "var(--green)",
                color:
                  u.followStatus === "ACCEPTED" ||
                  u.followStatus === "PENDING" ||
                  u.followStatus === "SELF"
                    ? "var(--text)"
                    : "white",
                fontWeight: 850,
                fontSize: 11,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor:
                  u.followStatus === "SELF" || followBusyId === u.id
                    ? "default"
                    : "pointer",
                opacity: followBusyId === u.id ? 0.62 : 1,
                whiteSpace: "nowrap",
                flexShrink: 0,
                boxShadow:
                  u.followStatus === "NONE" || !u.followStatus
                    ? "0 10px 22px color-mix(in srgb, var(--green) 20%, transparent)"
                    : "none",
                transition:
                  "background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
              }}
              title={
                u.followStatus === "SELF"
                  ? "This is you"
                  : u.followStatus === "PENDING"
                    ? "Follow request sent"
                    : u.followStatus === "ACCEPTED"
                      ? "Following"
                      : "Follow this user"
              }
            >
              {getFollowLabel(u.followStatus, followBusyId === u.id)}
            </button>
          </button>
        ))}
      </div>

      {!loading && results.length === 0 && query.trim().length >= 2 && (
        <div
          style={{
            padding: "18px 16px",
            borderRadius: 22,
            border: "1px solid color-mix(in srgb, var(--border) 42%, transparent)",
            background: "color-mix(in srgb, var(--muted) 52%, transparent)",
            color: "var(--sub)",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          No golfers found for "{query.trim()}". Try a name or handle.
        </div>
      )}
    </div>
  );
}
