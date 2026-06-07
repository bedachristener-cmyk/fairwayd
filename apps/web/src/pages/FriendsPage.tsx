import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { fileUrl } from "../api/fileUrl";
import MobilePageHeader from "../components/MobilePageHeader";
import { EmptyState } from "../components/PolishStates";

type UserItem = {
  id: string;
  handle: string;
  name?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  homeGolfClub?: string | null;
  location?: string | null;
};

type FriendsTab = "following" | "followers";

function readItems(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as any)?.items)) return (data as any).items;
  return [];
}

function normalizeUser(row: any, key: "following" | "follower"): UserItem | null {
  const user = row?.[key] ?? row;
  const id = user?.id ?? row?.[`${key}Id`];
  const handle = user?.handle ?? row?.[`${key}Handle`];

  if (typeof id !== "string" || typeof handle !== "string") {
    return null;
  }

  return {
    id,
    handle,
    name: user?.name ?? row?.[`${key}Name`] ?? null,
    avatarUrl: user?.avatarUrl ?? row?.[`${key}AvatarUrl`] ?? null,
    bio: user?.bio ?? row?.bio ?? null,
    homeGolfClub: user?.homeGolfClub ?? row?.homeGolfClub ?? null,
    location: user?.location ?? row?.location ?? null,
  };
}

function UserAvatar({ user }: { user: UserItem }) {
  const label = user.name || user.handle;

  if (user.avatarUrl) {
    return (
      <div
        style={{
          width: 44,
          height: 44,
          minWidth: 44,
          minHeight: 44,
          maxWidth: 44,
          maxHeight: 44,
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid white",
          background: "var(--bg)",
          flexShrink: 0,
          boxSizing: "border-box",
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        }}
      >
        <img
          src={fileUrl(user.avatarUrl)}
          alt={label}
          style={{
            width: "100%",
            height: "100%",
            minWidth: "100%",
            minHeight: "100%",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: 44,
        height: 44,
        minWidth: 44,
        minHeight: 44,
        maxWidth: 44,
        maxHeight: 44,
        aspectRatio: "1 / 1",
        borderRadius: "50%",
        background: "var(--bg)",
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
        color: "var(--text)",
        border: "2px solid white",
        flexShrink: 0,
        boxSizing: "border-box",
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      }}
    >
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function FriendsPage() {
  const nav = useNavigate();
  const auth = useAuth() as any;

  const [tab, setTab] = useState<FriendsTab>("following");
  const [following, setFollowing] = useState<UserItem[]>([]);
  const [followers, setFollowers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [followBackBusyId, setFollowBackBusyId] = useState<string | null>(null);

  const followingIds = useMemo(
    () => new Set(following.map((user) => user.id)),
    [following],
  );

  const items = tab === "following" ? following : followers;

  const loadFriends = useCallback(async () => {
    if (!auth?.token) return;

    setLoading(true);
    try {
      const [followingRes, followersRes] = await Promise.all([
        fetch(`${API_BASE}/users/me/following`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
        fetch(`${API_BASE}/users/me/followers`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
      ]);

      if (followingRes.ok) {
        const data = await followingRes.json();
        setFollowing(
          readItems(data)
            .map((row) => normalizeUser(row, "following"))
            .filter((user): user is UserItem => Boolean(user)),
        );
      } else {
        setFollowing([]);
      }

      if (followersRes.ok) {
        const data = await followersRes.json();
        setFollowers(
          readItems(data)
            .map((row) => normalizeUser(row, "follower"))
            .filter((user): user is UserItem => Boolean(user)),
        );
      } else {
        setFollowers([]);
      }
    } catch (err) {
      console.error("loadFriends failed", err);
      setFollowing([]);
      setFollowers([]);
    } finally {
      setLoading(false);
    }
  }, [auth?.token]);

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

  async function handleFollowBack(user: UserItem) {
    if (!auth?.token || followBackBusyId) return;

    setFollowBackBusyId(user.id);
    try {
      const res = await fetch(`${API_BASE}/users/id/${encodeURIComponent(user.id)}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (!res.ok) {
        throw new Error(`Follow back failed: ${res.status}`);
      }

      setFollowing((prev) =>
        prev.some((item) => item.id === user.id) ? prev : [user, ...prev],
      );
    } catch (err) {
      console.error("followBack failed", err);
    } finally {
      setFollowBackBusyId(null);
    }
  }

  return (
    <div
      style={{
        padding: "14px 14px 100px",
        display: "grid",
        gap: 14,
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <MobilePageHeader title="Friends" subtitle="Your golf network" />

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
          type="button"
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
          Following ({following.length})
        </button>

        <button
          type="button"
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
          Followers ({followers.length})
        </button>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "14px 12px",
              color: "var(--sub)",
              fontSize: 13,
            }}
          >
            Loading...
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={
              tab === "following"
                ? "You are not following anyone yet"
                : "No followers yet"
            }
            body={
              tab === "following"
                ? "Find golfers and follow players you meet on trips and courses."
                : "When golfers follow you, they will appear here."
            }
            action={
              tab === "following" ? (
                <button
                  type="button"
                  onClick={() => nav("/users")}
                  style={{
                    minHeight: 40,
                    padding: "0 14px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "var(--text)",
                    color: "var(--bg)",
                    fontSize: 13,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  Find golfers
                </button>
              ) : null
            }
            style={{ margin: 12 }}
          />
        ) : (
          items.map((user, index) => {
            const followsBack = followingIds.has(user.id);
            const detail =
              user.location || user.homeGolfClub || user.bio?.slice(0, 80) || "";

            return (
              <div
                key={user.id}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  overflow: "hidden",
                  borderBottom:
                    index === items.length - 1 ? "none" : "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                <button
                  type="button"
                  onClick={() => nav(`/u/${user.handle}`)}
                  style={{
                    minWidth: 0,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    color: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <UserAvatar user={user} />

                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                      display: "grid",
                      gap: 3,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 850,
                        color: "var(--text)",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user.name || user.handle}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--sub)",
                        lineHeight: 1.35,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      @{user.handle}
                    </div>

                    {detail ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--sub)",
                          lineHeight: 1.35,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {detail}
                      </div>
                    ) : null}
                  </div>
                </button>

                {tab === "following" ? (
                  <div
                    style={{
                      minHeight: 30,
                      padding: "0 10px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--sub)",
                      fontSize: 11,
                      fontWeight: 850,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    Following
                  </div>
                ) : followsBack ? (
                  <div
                    style={{
                      minHeight: 30,
                      padding: "0 10px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--sub)",
                      fontSize: 11,
                      fontWeight: 850,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    Following
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleFollowBack(user)}
                    disabled={followBackBusyId === user.id}
                    style={{
                      minHeight: 32,
                      padding: "0 11px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "var(--text)",
                      color: "var(--bg)",
                      fontSize: 11,
                      fontWeight: 850,
                      cursor:
                        followBackBusyId === user.id ? "default" : "pointer",
                      opacity: followBackBusyId === user.id ? 0.7 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {followBackBusyId === user.id ? "..." : "Follow back"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
