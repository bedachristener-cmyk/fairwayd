import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, Users } from "lucide-react";
import { API_BASE } from "../api/base";
import { fetchSentFollowRequests } from "../api/followRequests";
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
          className="fw-avatar-img"
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
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());
  const [sentRequestsLoaded, setSentRequestsLoaded] = useState(false);
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
      setSentRequestsLoaded(false);
      const [followingRes, followersRes, sentRequests] = await Promise.all([
        fetch(`${API_BASE}/users/me/following`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
        fetch(`${API_BASE}/users/me/followers`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
        fetchSentFollowRequests(auth.token).catch(() => null),
      ]);
      if (sentRequests !== null) {
        setSentRequestIds(new Set(readItems(sentRequests).map((request: any) => request.followingId).filter((id): id is string => typeof id === "string")));
        setSentRequestsLoaded(true);
      }

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
      setSentRequestsLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [auth?.token]);

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

  async function handleFollowBack(user: UserItem) {
    if (!auth?.token || followBackBusyId || !sentRequestsLoaded || sentRequestIds.has(user.id)) return;

    setFollowBackBusyId(user.id);
    try {
      const res = await fetch(`${API_BASE}/users/id/${encodeURIComponent(user.id)}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (!res.ok) {
        throw new Error(`Follow back failed: ${res.status}`);
      }

      const result = (await res.json()) as { status?: string };
      if (result.status === "PENDING") {
        setSentRequestIds((prev) => new Set([...prev, user.id]));
      } else if (result.status === "ACCEPTED") {
        setFollowing((prev) => prev.some((item) => item.id === user.id) ? prev : [user, ...prev]);
      } else {
        await loadFriends();
      }
    } catch (err) {
      console.error("followBack failed", err);
    } finally {
      setFollowBackBusyId(null);
    }
  }

  return (
    <div
      className="fw-connect-page"
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

      <section className="fw-connect-hero" aria-labelledby="connect-title">
        <div className="fw-connect-hero__eyebrow">FAIRWAYD COMMUNITY</div>
        <h2 id="connect-title">Connect with golfers</h2>
        <p>Keep in touch with the golfers you meet along the way.</p>
        <div className="fw-connect-hero__actions">
          <button type="button" onClick={() => nav("/users")}>
            <Search size={16} aria-hidden="true" /> Find golfers
          </button>
          <button type="button" onClick={() => nav("/follow-requests")}>
            <UserPlus size={16} aria-hidden="true" /> Follow requests
          </button>
        </div>
      </section>

      {!loading && following.length > 0 ? (
        <section className="fw-connect-network" aria-labelledby="connect-network-title">
          <div className="fw-connect-network__heading">
            <div><span>YOUR COMMUNITY</span><h2 id="connect-network-title">Golfers you follow</h2></div>
            <Users size={19} aria-hidden="true" />
          </div>
          <div className="fw-connect-network__people">
            {following.map((person) => (
              <button type="button" key={person.id} className="fw-connect-person" onClick={() => nav(`/u/${person.handle}`)}>
                <UserAvatar user={person} />
                <span>{person.name || person.handle}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}


      <div
        className="fw-connect-tabs"
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
          aria-pressed={tab === "following"}
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
          aria-pressed={tab === "followers"}
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
        className="fw-connect-list"
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
            const requested = sentRequestIds.has(user.id);
            const detail =
              user.location || user.homeGolfClub || user.bio?.slice(0, 80) || "";

            return (
              <div
                key={user.id}
                className="fw-connect-list__item"
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
                ) : requested || !sentRequestsLoaded ? (
                  <span className="fw-pill fw-pill--meta">{requested ? "Requested" : "Checking..."}</span>
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
