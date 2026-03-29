import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../api/base";
import { fileUrl } from "../api/fileUrl";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import {
  getInitialTheme,
  setTheme,
  THEMES,
  type ThemeName,
} from "../theme/theme";
import PostCard from "../components/PostCard";

type PostImage = { id: string; url: string };

type ProfileUser = {
  id: string;
  handle: string;
  name: string | null;
  avatarUrl: string | null;
  privacy?: string | null;
  createdAt?: string;
};

type Post = {
  id: string;
  content: string;
  createdAt: string;
  visibility?: "PUBLIC" | "FOLLOWERS";
  course: {
    id: string;
    name: string;
    lat: number;
    lon: number;
  };
  user: {
    id: string;
    handle: string;
    avatarUrl?: string | null;
  };
  images?: PostImage[];
};

type FollowUiStatus = "NONE" | "PENDING" | "ACCEPTED" | "SELF" | "UNKNOWN";

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const isMobile = window.innerWidth <= 980;

  return (
    <div
      style={{
        background: isMobile ? "transparent" : "var(--card)",
        border: isMobile ? "none" : "1px solid var(--border)",
        borderRadius: isMobile ? 0 : 16,
        boxShadow: isMobile ? "none" : "0 10px 30px rgba(0,0,0,.35)",
        padding: isMobile ? 0 : 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
          padding: isMobile ? "6px 12px" : 0,
        }}
      >
        <div style={{ fontWeight: 900, color: "var(--text)" }}>{title}</div>
        <div style={{ marginLeft: "auto" }}>{right}</div>
      </div>
      <div style={{ padding: isMobile ? 0 : 0 }}>{children}</div>
    </div>
  );
}

function PillButton({
  children,
  onClick,
  disabled,
  title,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: disabled ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.18)",
        color: disabled ? "rgba(255,255,255,0.55)" : "var(--text)",
        cursor: disabled ? "default" : "pointer",
        fontWeight: 800,
        ...style,
      }}
      type="button"
    >
      {children}
    </button>
  );
}
function prettyDate(d?: string) {
  if (!d) return "";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleDateString();
}

/** Simple + reliable theme picker (buttons) */
function ThemePicker() {
  const [theme, setThemeState] = useState<ThemeName>(() => getInitialTheme());

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  return (
    <Card title="Theme">
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        {THEMES.map((tName) => (
          <button
            key={tName}
            type="button"
            onClick={() => setThemeState(tName)}
            style={{
              border: "1px solid var(--border)",
              background:
                theme === tName ? "rgba(39,196,107,0.22)" : "rgba(0,0,0,0.18)",
              color: "var(--text)",
              borderRadius: 10,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 12,
              minWidth: 86,
            }}
          >
            {tName.toUpperCase()}
          </button>
        ))}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--sub)",
          marginTop: 8,
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        Current: {theme}
      </div>
    </Card>
  );
}

export default function ProfilePage({ mode }: { mode: "me" | "handle" }) {
  const isMobile = window.innerWidth <= 980;
  const nav = useNavigate();
  const loc = useLocation();
  const params = useParams();

  const auth = useAuth() as any;
  const tokenFromContext: string =
    (auth?.token as string) ||
    (auth?.jwt as string) ||
    (auth?.accessToken as string) ||
    "";

  const tokenFromStorage =
    localStorage.getItem("fairwayd_token") ||
    sessionStorage.getItem("fairwayd_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    "";

  const token = tokenFromContext || tokenFromStorage;

  const { me, loading: meLoading, err: meErr } = useMe(true);

  const targetHandle = useMemo(() => {
    if (mode === "handle") return (params.handle ?? "").trim().toLowerCase();
    return (me?.handle ?? "").trim().toLowerCase();
  }, [mode, params.handle, me?.handle]);

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [followingCourses, setFollowingCourses] = useState<any[]>([]);
  const [followingUsers, setFollowingUsers] = useState<any[]>([]);
  const [followRequests, setFollowRequests] = useState<any[]>([]);
  const [followReqBusy, setFollowReqBusy] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "me") {
      setFollowRequests([]);
      return;
    }

    if (!token) {
      setFollowRequests([]);
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/users/me/follow-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setFollowRequests([]);
          return;
        }

        const data = await res.json();
        setFollowRequests(Array.isArray(data?.items) ? data.items : []);
      } catch {
        setFollowRequests([]);
      }
    };

    run();
  }, [mode, token]);
  // -------------------------
  // Follow state (only on handle profile, not self)
  // -------------------------
  const [followStatus, setFollowStatus] = useState<FollowUiStatus>("UNKNOWN");
  const [followBusy, setFollowBusy] = useState(false);
  const handleAccept = async (userId: string) => {
    if (!token) return;
    setFollowReqBusy(userId);

    try {
      await fetch(`${API_BASE}/users/me/follow-requests/${userId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setFollowRequests((prev) => prev.filter((x) => x.followerId !== userId));
    } catch (err) {
      console.error("Accept failed", err);
    } finally {
      setFollowReqBusy(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!token) return;
    setFollowReqBusy(userId);

    try {
      await fetch(`${API_BASE}/users/me/follow-requests/${userId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setFollowRequests((prev) => prev.filter((x) => x.followerId !== userId));
    } catch (err) {
      console.error("Reject failed", err);
    } finally {
      setFollowReqBusy(null);
    }
  };

  const isSelf = useMemo(() => {
    if (mode !== "handle") return true;
    if (!me?.id || !profile?.id) return false;
    return me.id === profile.id;
  }, [mode, me?.id, profile?.id]);

  const loadFollowStatus = useCallback(async () => {
    if (!token) {
      setFollowStatus("UNKNOWN");
      return;
    }
    if (mode !== "handle") {
      setFollowStatus("SELF");
      return;
    }
    if (!profile?.id) return;
    if (me?.id && profile.id === me.id) {
      setFollowStatus("SELF");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/users/id/${encodeURIComponent(profile.id)}/following-status`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        setFollowStatus("UNKNOWN");
        return;
      }
      const data = await res.json();
      const s = String(data?.status ?? "").toUpperCase();

      if (s === "ACCEPTED") setFollowStatus("ACCEPTED");
      else if (s === "PENDING") setFollowStatus("PENDING");
      else if (s === "NONE") setFollowStatus("NONE");
      else if (s === "SELF") setFollowStatus("SELF");
      else setFollowStatus("UNKNOWN");
    } catch {
      setFollowStatus("UNKNOWN");
    }
  }, [API_BASE, token, mode, profile?.id, me?.id]);

  const toggleFollow = useCallback(async () => {
    if (!token) {
      setErr("Missing auth token. Please login again.");
      return;
    }
    if (mode !== "handle") return;
    if (!profile?.id) return;
    if (me?.id && profile.id === me.id) return;
    if (followBusy) return;

    const currently = followStatus;
    const isActive = currently === "ACCEPTED" || currently === "PENDING";
    const nextOptimistic: FollowUiStatus = isActive ? "NONE" : "PENDING";

    setFollowBusy(true);
    setErr(null);
    setFollowStatus(nextOptimistic);

    try {
      const res = await fetch(
        `${API_BASE}/follows/${encodeURIComponent(profile.id)}`,
        {
          method: isActive ? "DELETE" : "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        // revert
        setFollowStatus(currently);
        const t = await res.text().catch(() => "");
        throw new Error(
          `Follow request failed. HTTP ${res.status} ${res.statusText} ${t}`.trim(),
        );
      }

      // POST returns { status }, DELETE returns { ok:true }.
      // After POST, status may be ACCEPTED for public accounts.
      if (!isActive) {
        const data = await res.json().catch(() => null);
        const s = String(data?.status ?? "").toUpperCase();
        if (s === "ACCEPTED") setFollowStatus("ACCEPTED");
        else if (s === "PENDING") setFollowStatus("PENDING");
        else setFollowStatus("PENDING");
      } else {
        setFollowStatus("NONE");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Follow action failed");
    } finally {
      setFollowBusy(false);
    }
  }, [token, mode, profile?.id, me?.id, followBusy, followStatus]);

  const followLabel = useMemo(() => {
    if (isSelf) return null;
    if (followStatus === "ACCEPTED") return "✓ Following";
    if (followStatus === "PENDING") return "Requested";
    if (followStatus === "NONE") return "+ Follow";
    if (followStatus === "UNKNOWN") return "+ Follow";
    return null;
  }, [followStatus, isSelf]);

  const followDisabled = useMemo(() => {
    if (!token) return true;
    if (followBusy) return true;
    if (mode !== "handle") return true;
    if (!profile?.id) return true;
    if (isSelf) return true;
    return false;
  }, [token, followBusy, mode, profile?.id, isSelf]);

  const followButtonStyle: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = {};
    if (followStatus === "ACCEPTED") {
      base.background = "rgba(39,196,107,0.22)";
    } else if (followStatus === "PENDING") {
      base.background = "rgba(255,255,255,0.08)";
    } else {
      base.background = "rgba(0,0,0,0.18)";
    }
    return base;
  }, [followStatus]);

  const loadProfile = useCallback(async () => {
    if (!targetHandle) return;

    if (mode === "me") {
      if (meLoading) return;
      if (meErr) {
        setErr(`Failed to load /users/me ${meErr}`);
        return;
      }
      if (!me) return;

      setProfile({
        id: me.id,
        handle: me.handle ?? "",
        name: me.name ?? null,
        avatarUrl: me.avatarUrl ?? null,
        privacy: (me as any).privacy ?? null,
        createdAt: (me as any).createdAt,
      });
    }

    if (!token) {
      setErr("Missing auth token. Please login again.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };

      if (mode === "handle") {
        const [uRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/users/${encodeURIComponent(targetHandle)}`, {
            headers,
          }),
          fetch(`${API_BASE}/users/${encodeURIComponent(targetHandle)}/posts`, {
            headers,
          }),
        ]);

        if (!uRes.ok) {
          const t = await uRes.text().catch(() => "");
          throw new Error(
            `Profile endpoint failed. Expected GET /users/:handle. HTTP ${uRes.status} ${uRes.statusText} ${t}`.trim(),
          );
        }
        if (!pRes.ok) {
          const t = await pRes.text().catch(() => "");
          throw new Error(
            `Posts endpoint failed. Expected GET /users/:handle/posts. HTTP ${pRes.status} ${pRes.statusText} ${t}`.trim(),
          );
        }

        const u = (await uRes.json()) as ProfileUser;
        const p = (await pRes.json()) as Post[];

        setProfile(u);
        setPosts(Array.isArray(p) ? p : []);
      } else {
        const pRes = await fetch(
          `${API_BASE}/users/${encodeURIComponent(targetHandle)}/posts`,
          {
            headers,
          },
        );

        if (pRes.ok) {
          const p = (await pRes.json()) as Post[];
          setPosts(Array.isArray(p) ? p : []);
        } else {
          setPosts([]);
        }
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [mode, targetHandle, token, me, meLoading, meErr]);

  useEffect(() => {
    setProfile(null);
    setPosts([]);
    setErr(null);
    setFollowStatus("UNKNOWN");
    if (!targetHandle) return;
    loadProfile();
  }, [targetHandle, loadProfile]);

  useEffect(() => {
    // once profile id is known, load follow status
    if (mode !== "handle") return;
    if (!profile?.id) return;
    if (!token) return;
    loadFollowStatus();
  }, [mode, profile?.id, token, loadFollowStatus]);

  useEffect(() => {
    if (mode !== "me") {
      setFollowingCourses([]);
      return;
    }

    if (!token) {
      setFollowingCourses([]);
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/courses/me/following`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setFollowingCourses([]);
          return;
        }

        const data = await res.json();
        setFollowingCourses(Array.isArray(data?.items) ? data.items : []);
      } catch {
        setFollowingCourses([]);
      }
    };

    run();
  }, [mode, token]);

  useEffect(() => {
    if (mode !== "me") {
      setFollowingUsers([]);
      return;
    }

    if (!token) {
      setFollowingUsers([]);
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/users/me/following`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setFollowingUsers([]);
          return;
        }

        const data = await res.json();
        setFollowingUsers(Array.isArray(data?.items) ? data.items : []);
      } catch {
        setFollowingUsers([]);
      }
    };

    run();
  }, [mode, token]);

  const title = useMemo(() => {
    if (profile?.handle) return `@${profile.handle}`;
    return targetHandle ? `@${targetHandle}` : "Profile";
  }, [profile?.handle, targetHandle]);

  const backTo = (loc.state as any)?.from || "/feed";

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      {err && (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: "rgba(255,80,80,0.12)",
            border: "1px solid rgba(255,80,80,0.25)",
            fontFamily: "system-ui",
            fontSize: 13,
            color: "var(--text)",
          }}
        >
          <strong>Error:</strong> {err}
        </div>
      )}

      <Card
        title={title}
        right={
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
              maxWidth: "100%",
            }}
          >
            <PillButton onClick={() => nav(backTo)} disabled={loading}>
              Back
            </PillButton>

            {mode === "me" ? (
              <PillButton
                onClick={() => nav("/onboarding/profile")}
                disabled={loading}
              >
                Edit
              </PillButton>
            ) : (
              <PillButton
                onClick={() => nav("/profile")}
                disabled={loading || !me?.handle}
              >
                My Profile
              </PillButton>
            )}
          </div>
        }
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: isMobile ? "stretch" : "center",
            flexWrap: isMobile ? "wrap" : "nowrap",
            paddingLeft: isMobile ? 12 : 0,
            paddingRight: isMobile ? 12 : 0,
          }}
        >
          {profile?.avatarUrl ? (
            <div
              style={{
                width: isMobile ? 40 : 56,
                height: isMobile ? 40 : 56,
                minWidth: isMobile ? 40 : 56,
                minHeight: isMobile ? 40 : 56,
                maxWidth: isMobile ? 40 : 56,
                maxHeight: isMobile ? 40 : 56,
                borderRadius: "50%",
                overflow: "hidden",
                clipPath: "circle(50% at 50% 50%)",
                WebkitClipPath: "circle(50% at 50% 50%)",
                border: "1px solid var(--border)",
                backgroundImage: `url(${fileUrl(profile.avatarUrl)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                flexShrink: 0,
                display: "block",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <div
              style={{
                width: isMobile ? 40 : 56,
                height: isMobile ? 40 : 56,
                minWidth: isMobile ? 40 : 56,
                minHeight: isMobile ? 40 : 56,
                maxWidth: isMobile ? 40 : 56,
                maxHeight: isMobile ? 40 : 56,
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
              {(profile?.handle ?? targetHandle ?? "?")
                .slice(0, 1)
                .toUpperCase()}
            </div>
          )}

          <div
            style={{
              minWidth: 0,
              flex: 1,
              width: isMobile ? "calc(100% - 68px)" : "auto",
            }}
          >
            <div
              style={{ fontWeight: 900, fontSize: 16, color: "var(--text)" }}
            >
              {profile?.name?.trim() ? profile.name : "—"}
            </div>

            <div style={{ fontSize: 12, color: "var(--sub)" }}>
              {profile?.createdAt
                ? `Member since ${prettyDate(profile.createdAt)}`
                : ""}
            </div>
          </div>

          {/* Follow Button (only when viewing someone else) */}
          {mode === "handle" && !isSelf && followLabel ? (
            <div
              style={{
                width: isMobile ? "100%" : "auto",
                marginTop: isMobile ? 4 : 0,
              }}
            >
              <PillButton
                onClick={toggleFollow}
                disabled={followDisabled}
                title={
                  followStatus === "PENDING"
                    ? "Follow request sent (click to cancel)"
                    : followStatus === "ACCEPTED"
                      ? "Following (click to unfollow)"
                      : "Follow"
                }
                style={{
                  ...followButtonStyle,
                  minWidth: isMobile ? undefined : 120,
                  width: isMobile ? "100%" : undefined,
                  textAlign: "center",
                }}
              >
                {followBusy ? "..." : followLabel}
              </PillButton>
            </div>
          ) : null}
        </div>
      </Card>

      {/* ✅ Theme selection only in own profile (/profile) */}
      {mode === "me" ? <ThemePicker /> : null}

      {mode === "me" && (
        <Card title="Following Courses">
          <div style={{ padding: 12 }}>
            <div
              style={{ fontSize: 12, color: "var(--sub)", marginBottom: 10 }}
            >
              {followingCourses.length} courses
            </div>

            {followingCourses.length === 0 ? (
              <div style={{ padding: 12, color: "var(--sub)" }}>
                No followed courses yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {followingCourses.map((row: any) => {
                  const c = row;
                  if (!c) return null;

                  return (
                    <button
                      key={c.id}
                      onClick={() => nav(`/courses/${c.id}`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        padding: isMobile ? "12px" : "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        cursor: "pointer",
                        textAlign: "left",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 999,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          flexShrink: 0,
                          fontSize: 16,
                        }}
                      >
                        ⛳
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          paddingLeft: isMobile ? 12 : 0,
                          paddingRight: isMobile ? 12 : 0,
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{c.name}</span>
                        <span style={{ fontSize: 12, color: "var(--sub)" }}>
                          golf course
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}
      {mode === "me" && (
        <Card
          title="Follow Requests"
          right={
            <div style={{ fontSize: 12, color: "var(--sub)" }}>
              {followRequests.length} pending
            </div>
          }
        >
          {followRequests.length === 0 ? (
            <div style={{ padding: 12, color: "var(--sub)" }}>
              No open requests.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {followRequests.map((x: any) => {
                const handle = x.followerHandle || x.followerId;
                const busy = followReqBusy === x.followerId;

                return (
                  <div
                    key={x.followerId}
                    style={{
                      display: "flex",
                      alignItems: isMobile ? "stretch" : "center",
                      flexWrap: isMobile ? "wrap" : "nowrap",
                      gap: 10,
                      padding: isMobile ? "12px" : "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      boxSizing: "border-box",
                    }}
                  >
                    <AvatarCircle
                      handle={handle}
                      avatarUrl={x.followerAvatarUrl}
                    />

                    <div
                      style={{
                        flex: 1,
                        minWidth: isMobile ? "calc(100% - 66px)" : 0,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>@{handle}</div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        width: isMobile ? "100%" : "auto",
                        marginLeft: isMobile ? 0 : "auto",
                        marginTop: isMobile ? 4 : 0,
                      }}
                    >
                      <button
                        disabled={busy}
                        onClick={() => handleReject(x.followerId)}
                        style={{
                          flex: isMobile ? 1 : undefined,
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        Reject
                      </button>

                      <button
                        disabled={busy}
                        onClick={() => handleAccept(x.followerId)}
                        style={{
                          flex: isMobile ? 1 : undefined,
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--text)",
                          color: "var(--bg)",
                          cursor: "pointer",
                        }}
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {mode === "me" && (
        <Card title="Following Users">
          <div
            style={{
              fontSize: 12,
              color: "var(--sub)",
              marginBottom: 8,
              padding: "0 12px",
            }}
          >
            {followingUsers.length} users
          </div>

          {followingUsers.length === 0 ? (
            <div style={{ padding: 12, color: "var(--sub)" }}>
              No followed users yet.
            </div>
          ) : (
            <div
              style={{ display: "grid", gap: 8, padding: "0 12px 12px 12px" }}
            >
              {followingUsers.map((row: any) => {
                const u = row.following ?? row;
                if (!u) return null;

                return (
                  <button
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
                      textAlign: "left",
                    }}
                  >
                    {/* Avatar */}
                    {u.avatarUrl ? (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          overflow: "hidden",
                          clipPath: "circle(50% at 50% 50%)",
                          WebkitClipPath: "circle(50% at 50% 50%)",
                          border: "1px solid var(--border)",
                          backgroundImage: `url(${fileUrl(u.avatarUrl)})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
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
                        {(u.handle ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    {/* Text rechts */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 700, color: "var(--text)" }}>
                        {u.name?.trim() ? u.name : `@${u.handle}`}
                      </span>

                      <span style={{ fontSize: 12, color: "var(--sub)" }}>
                        @{u.handle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}
      <Card
        title="Posts"
        right={
          <div style={{ fontSize: 12, color: "var(--sub)" }}>
            {loading ? "Loading..." : `${posts.length} posts`}
          </div>
        }
      >
        {!loading && posts.length === 0 && (
          <div style={{ padding: 12, color: "var(--sub)" }}>No posts yet.</div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} isMobile={isMobile} />
          ))}
        </div>
      </Card>
    </div>
  );
}
