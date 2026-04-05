import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../api/base";
import { fileUrl } from "../api/fileUrl";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import UserListCard from "../components/UserListCard";

import {
  getInitialTheme,
  setTheme,
  THEMES,
  type ThemeName,
} from "../theme/theme";
import PostCard from "../components/PostCard";
import CommentModal from "../components/CommentModal";

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
  visibility?: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  course: {
    id: string;
    name: string;
    lat: number;
    lon: number;
  };
  user: {
    id: string;
    handle: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  images?: PostImage[];
  likes?: { userId: string }[];
  comments?: unknown[];
  _count?: {
    likes?: number;
    comments?: number;
  };
};

type FollowUiStatus = "NONE" | "PENDING" | "ACCEPTED" | "SELF" | "UNKNOWN";

type ListUser = {
  id: string;
  handle: string;
  name?: string | null;
  avatarUrl?: string | null;
};

type FollowRelation = {
  followerId?: string;
  followingId?: string;
  follower?: ListUser;
  following?: ListUser;
};
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

function AvatarCircle({
  handle,
  avatarUrl,
}: {
  handle: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const letter = (handle || "?").slice(0, 1).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={fileUrl(avatarUrl)}
        alt="avatar"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid var(--border)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: "rgba(0,0,0,.18)",
        border: "1px solid var(--border)",
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
        color: "var(--text)",
      }}
      title="Avatar placeholder"
    >
      {letter}
    </div>
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
    <Card
      title="Theme"
      right={<span style={{ fontSize: 11, color: "var(--sub)" }}>{theme}</span>}
    >
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
                theme === tName ? "rgba(39,196,107,0.18)" : "rgba(0,0,0,0.14)",
              color: "var(--text)",
              borderRadius: 8,
              padding: "5px 8px",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 11,
              minWidth: 72,
            }}
          >
            {tName.toUpperCase()}
          </button>
        ))}
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
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [followingCourses, setFollowingCourses] = useState<any[]>([]);
  const [followingUsers, setFollowingUsers] = useState<FollowRelation[]>([]);
  const [followers, setFollowers] = useState<FollowRelation[]>([]);
  const [activeSection, setActiveSection] = useState<
    "posts" | "following" | "followers" | "courses"
  >("posts");
  const activeCommentPost = useMemo(() => {
    if (!activeCommentPostId) return null;
    return posts.find((p) => p.id === activeCommentPostId) ?? null;
  }, [activeCommentPostId, posts]);
  const [followRequests, setFollowRequests] = useState<FollowRelation[]>([]);
  const followingUsersRef = useRef<HTMLDivElement | null>(null);
  const followersRef = useRef<HTMLDivElement | null>(null);
  const postsRef = useRef<HTMLDivElement | null>(null);
  const [followReqBusy, setFollowReqBusy] = useState<string | null>(null);
  const [courseFollowBusyId, setCourseFollowBusyId] = useState<string | null>(
    null,
  );

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
    if (followStatus === "ACCEPTED") {
      return {
        background: "rgba(39,196,107,0.18)",
        border: "1px solid rgba(39,196,107,0.35)",
        color: "var(--text)",
      };
    }

    if (followStatus === "PENDING") {
      return {
        background: "var(--muted)",
        color: "var(--text)",
      };
    }

    return {
      background: "var(--card)",
      color: "var(--text)",
    };
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
        setPosts(
          Array.isArray(p)
            ? p.map((post) => ({
                ...post,
                user: {
                  ...post.user,
                  name: u.name ?? post.user.name ?? null,
                  avatarUrl: u.avatarUrl ?? post.user.avatarUrl ?? null,
                },
              }))
            : [],
        );
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
  }, [token]);

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

  useEffect(() => {
    if (mode !== "me") {
      setFollowers([]);
      return;
    }

    if (!token) {
      setFollowers([]);
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/users/me/followers`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setFollowers([]);
          return;
        }

        const data = await res.json();
        setFollowers(Array.isArray(data?.items) ? data.items : []);
      } catch {
        setFollowers([]);
      }
    };

    run();
  }, [mode, token]);

  const title = useMemo(() => {
    const rawName = profile?.name?.trim() ?? "";
    const rawHandle = profile?.handle?.trim() ?? targetHandle ?? "";

    if (
      rawName &&
      rawName.toLowerCase() !== rawHandle.toLowerCase() &&
      rawName.toLowerCase() !== `@${rawHandle}`.toLowerCase()
    ) {
      return rawName;
    }

    if (rawHandle) return `@${rawHandle}`;
    return "Profile";
  }, [profile?.name, profile?.handle, targetHandle]);

  const profileDisplayName = useMemo(() => {
    const rawName = profile?.name?.trim() ?? "";
    const rawHandle = profile?.handle?.trim() ?? targetHandle ?? "";

    if (!rawName) return "";
    if (!rawHandle) return rawName;

    if (rawName.toLowerCase() === rawHandle.toLowerCase()) {
      return "";
    }

    if (rawName.toLowerCase() === `@${rawHandle}`.toLowerCase()) {
      return "";
    }

    return rawName;
  }, [profile?.name, profile?.handle, targetHandle]);

  const handleToggleCourseFollow = useCallback(
    async (courseId: string) => {
      if (!token) return;
      if (courseFollowBusyId) return;

      const currentlyFollowed = followingCourses.some(
        (c: any) => c?.id === courseId,
      );

      try {
        setCourseFollowBusyId(courseId);

        const res = await fetch(`${API_BASE}/courses/${courseId}/follow`, {
          method: currentlyFollowed ? "DELETE" : "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`Course follow request failed: ${res.status}`);
        }

        const refresh = await fetch(`${API_BASE}/courses/me/following`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!refresh.ok) {
          throw new Error(
            `Failed to refresh followed courses: ${refresh.status}`,
          );
        }

        const data = await refresh.json();
        setFollowingCourses(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        console.error("Course follow toggle failed", err);
      } finally {
        setCourseFollowBusyId(null);
      }
    },
    [token, courseFollowBusyId, followingCourses],
  );

  const backTo = (loc.state as any)?.from || "/feed";

  const summaryButtonStyle = (
    section: "posts" | "following" | "followers" | "courses",
  ): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 4,
    width: "100%",
    minHeight: isMobile ? 72 : 78,
    padding: isMobile ? "12px 14px" : "14px 16px",
    borderRadius: 16,
    border:
      activeSection === section
        ? "1px solid rgba(39,196,107,0.6)"
        : "1px solid var(--border)",
    background:
      activeSection === section ? "rgba(39,196,107,0.22)" : "var(--card)",
    boxShadow:
      activeSection === section ? "0 0 0 1px rgba(39,196,107,0.25)" : "none",
    transition: "all 0.15s ease",
    color: "var(--text)",
    cursor: "pointer",
    textAlign: "left",
    boxSizing: "border-box",
  });

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
              style={{
                fontWeight: 900,
                fontSize: 16,
                color: "var(--text)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {profileDisplayName ||
                `@${profile?.handle ?? targetHandle ?? "unknown"}`}
            </div>

            {profileDisplayName ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--sub)",
                  lineHeight: 1.35,
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                @{profile?.handle ?? targetHandle ?? "unknown"}
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
                gap: 10,
                marginTop: 12,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveSection("posts")}
                style={summaryButtonStyle("posts")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>📝</span>
                  <span
                    style={{
                      fontSize: isMobile ? 20 : 22,
                      fontWeight: 900,
                      color: "var(--text)",
                      lineHeight: 1,
                    }}
                  >
                    {posts.length}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--sub)",
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  My Posts
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("following")}
                style={summaryButtonStyle("following")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🧑‍🤝‍🧑</span>
                  <span
                    style={{
                      fontSize: isMobile ? 20 : 22,
                      fontWeight: 900,
                      color: "var(--text)",
                      lineHeight: 1,
                    }}
                  >
                    {followingUsers.length}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--sub)",
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  Users I Follow
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("followers")}
                style={summaryButtonStyle("followers")}
              >
                <span
                  style={{
                    fontSize: isMobile ? 20 : 22,
                    fontWeight: 900,
                    color: "var(--text)",
                    lineHeight: 1,
                  }}
                >
                  {followers.length}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--sub)",
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  My Followers
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("courses")}
                style={summaryButtonStyle("courses")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>⛳</span>
                  <span
                    style={{
                      fontSize: isMobile ? 20 : 22,
                      fontWeight: 900,
                      color: "var(--text)",
                      lineHeight: 1,
                    }}
                  >
                    {followingCourses.length}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--sub)",
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  Courses I Follow
                </span>
              </button>
            </div>

            {profile?.createdAt ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--sub)",
                  lineHeight: 1.35,
                  marginTop: 6,
                }}
              >
                Member since {prettyDate(profile.createdAt)}
              </div>
            ) : null}
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

      {mode === "me" && activeSection === "courses" && (
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
                        padding: isMobile ? "10px 12px" : "10px 12px",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--text)",
                        cursor: "pointer",
                        textAlign: "left",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
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
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 800,
                            color: "var(--text)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.name}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--sub)" }}>
                          Golf course
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
            <span style={{ fontSize: 11, color: "var(--sub)" }}>
              {followRequests.length}
            </span>
          }
        >
          {followRequests.length === 0 ? (
            <div style={{ padding: 10, color: "var(--sub)", fontSize: 13 }}>
              No open requests
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {followRequests.map((x: any) => {
                const handle = x.followerHandle || x.followerId;
                const name = x.followerName || x.follower?.name || null;
                const busy = followReqBusy === x.followerId;

                return (
                  <div
                    key={x.followerId}
                    style={{
                      display: "flex",
                      alignItems: isMobile ? "stretch" : "center",
                      flexWrap: isMobile ? "wrap" : "nowrap",
                      gap: 8,
                      padding: isMobile ? "10px" : "8px 10px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        minWidth: 32,
                        minHeight: 32,
                        maxWidth: 32,
                        maxHeight: 32,
                        flexShrink: 0,
                      }}
                    >
                      <AvatarCircle
                        handle={handle}
                        avatarUrl={x.followerAvatarUrl}
                      />
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: isMobile ? "calc(100% - 66px)" : 0,
                        display: "grid",
                        gap: 2,
                      }}
                    >
                      {name ? (
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 13,
                            color: "var(--text)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {name}
                        </div>
                      ) : null}

                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--sub)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        @{handle}
                      </div>
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
                          padding: "6px 8px",
                          fontSize: 12,
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
                          padding: "6px 8px",
                          fontSize: 12,
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

      {mode === "me" && activeSection === "following" && (
        <div ref={followingUsersRef}>
          <UserListCard
            title="Following Users"
            count={followingUsers.length}
            users={followingUsers
              .map((row) => row.following)
              .filter((u): u is ListUser => Boolean(u))
              .map((u) => ({
                id: u.id,
                name: u.name,
                handle: u.handle,
                avatarUrl: u.avatarUrl ? fileUrl(u.avatarUrl) : null,
              }))}
            emptyText="No followed users yet."
            onUserClick={(user) => {
              if (!user.handle) return;
              nav(`/u/${user.handle}`);
            }}
          />
        </div>
      )}
      {mode === "me" && activeSection === "followers" && (
        <div ref={followersRef}>
          <UserListCard
            title="Followers"
            count={followers.length}
            users={followers
              .map((row) => row.follower)
              .filter((u): u is ListUser => Boolean(u))
              .map((u) => ({
                id: u.id,
                name: u.name,
                handle: u.handle,
                avatarUrl: u.avatarUrl ? fileUrl(u.avatarUrl) : null,
              }))}
            emptyText="No followers yet."
            onUserClick={(user) => {
              if (!user.handle) return;
              nav(`/u/${user.handle}`);
            }}
          />
        </div>
      )}
      {activeSection === "posts" && (
        <div ref={postsRef}>
          <Card
            title="Posts"
            right={
              <div style={{ fontSize: 12, color: "var(--sub)" }}>
                {loading ? "Loading..." : `${posts.length} posts`}
              </div>
            }
          >
            {!loading && posts.length === 0 && (
              <div style={{ padding: 12, color: "var(--sub)" }}>
                No posts yet.
              </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              {posts.map((p) => {
                const lat = Number(p.course.lat);
                const lon = Number(p.course.lon);
                const canSelectCourse =
                  Number.isFinite(lat) && Number.isFinite(lon);
                const isCourseFollowed = followingCourses.some(
                  (c: any) => c?.id === p.course.id,
                );
                const isCourseFollowBusy = courseFollowBusyId === p.course.id;

                return (
                  <PostCard
                    key={p.id}
                    post={p}
                    isMobile={isMobile}
                    onSelectCourse={
                      canSelectCourse
                        ? () => {
                            nav(`/courses/${p.course.id}`);
                          }
                        : undefined
                    }
                    onCommentClick={() => setActiveCommentPostId(p.id)}
                    onOpenPost={() => setActiveCommentPostId(p.id)}
                    courseFollowed={isCourseFollowed}
                    courseFollowBusy={isCourseFollowBusy}
                    onCourseFollowToggle={handleToggleCourseFollow}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      )}
      {activeCommentPost ? (
        <CommentModal
          post={activeCommentPost}
          isMobile={isMobile}
          onClose={() => setActiveCommentPostId(null)}
        />
      ) : null}
    </div>
  );
}
