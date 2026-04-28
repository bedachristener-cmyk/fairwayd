import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
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
import BackToTopButton from "../components/BackToTopButton";
import { getLang, setLang, t, type Lang } from "../i18n/strings";

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

type PendingFollowRequest = {
  followerId?: string;
  followerHandle?: string;
  followerName?: string | null;
  followerAvatarUrl?: string | null;
  follower?: ListUser;
};

type SentFollowRequest = {
  followingId?: string;
  followingHandle?: string;
  followingName?: string | null;
  followingAvatarUrl?: string | null;
  following?: ListUser;
};

type FollowedCourse = {
  id: string;
  name: string;
};

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
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
      <div>{children}</div>
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
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
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
      title={t("avatar_placeholder")}
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

function ProfileSettingsCard() {
  const [theme, setThemeState] = useState<ThemeName>(() => getInitialTheme());
  const [language, setLanguage] = useState<Lang>(() => getLang());
  const [expanded, setExpanded] = useState<"theme" | "language" | null>(null);

  const isMobile = window.innerWidth <= 980;

  const languages: { code: Lang; label: string; flagCode: string }[] = [
    { code: "en", label: "English", flagCode: "gb" },
    { code: "de", label: "Deutsch", flagCode: "de" },
    { code: "fr", label: "Français", flagCode: "fr" },
    { code: "it", label: "Italiano", flagCode: "it" },
    { code: "es", label: "Español", flagCode: "es" },
    { code: "ko", label: "한국어", flagCode: "kr" },
    { code: "th", label: "ไทย", flagCode: "th" },
  ];

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  return (
    <Card title={t("settings")}>
      <div
        style={{
          display: "grid",
          gap: 10,
          padding: isMobile ? "0 12px 4px" : 0,
        }}
      >
        <SettingsControlRow
          icon="Aa"
          label={t("theme")}
          value={theme.toUpperCase()}
          expanded={expanded === "theme"}
          onClick={() => setExpanded((v) => (v === "theme" ? null : "theme"))}
        >
          <SettingsOptions>
            {THEMES.map((tName) => {
              const active = theme === tName;

              return (
                <button
                  key={tName}
                  type="button"
                  onClick={() => setThemeState(tName)}
                  style={settingsOptionStyle(active)}
                >
                  {tName.toUpperCase()}
                </button>
              );
            })}
          </SettingsOptions>
        </SettingsControlRow>

        <SettingsControlRow
          icon="🌐"
          label={t("language")}
          value={language.toUpperCase()}
          expanded={expanded === "language"}
          onClick={() =>
            setExpanded((v) => (v === "language" ? null : "language"))
          }
        >
          <SettingsOptions>
            {languages.map((item) => {
              const active = language === item.code;

              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setLanguage(item.code);
                    setLang(item.code);
                  }}
                  style={{
                    ...settingsOptionStyle(active),
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    justifyContent: "flex-start",
                  }}
                >
                  <img
                    src={`https://flagcdn.com/w20/${item.flagCode}.png`}
                    alt=""
                    style={{
                      width: 14,
                      height: 10,
                      minWidth: 14,
                      maxWidth: 14,
                      minHeight: 10,
                      maxHeight: 10,
                      display: "inline-block",
                      objectFit: "cover",
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  />

                  <span>{item.label}</span>
                </button>
              );
            })}
          </SettingsOptions>
        </SettingsControlRow>
      </div>
    </Card>
  );
}

function SettingsControlRow({
  icon,
  label,
  value,
  expanded,
  onClick,
  children,
}: {
  icon: string;
  label: string;
  value: string;
  expanded: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      <button type="button" onClick={onClick} style={settingsRowButtonStyle}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div style={{ minWidth: 0, display: "grid", gap: 1, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text)" }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: "var(--sub)" }}>
            {t("current")}: {value}
          </div>
        </div>

        <div
          style={{
            color: "var(--sub)",
            fontSize: 18,
            lineHeight: 1,
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
            flexShrink: 0,
          }}
        >
          ›
        </div>
      </button>

      {expanded ? children : null}
    </div>
  );
}

function SettingsOptions({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 6,
        padding: "0 10px 10px 49px",
      }}
    >
      {children}
    </div>
  );
}

const settingsRowButtonStyle: CSSProperties = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "var(--text)",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
};

function settingsOptionStyle(active: boolean): CSSProperties {
  return {
    width: "100%",
    border: "1px solid var(--border)",
    background: active ? "var(--text)" : "var(--card)",
    color: active ? "var(--bg)" : "var(--text)",
    borderRadius: 12,
    padding: "9px 10px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
    textAlign: "left",
  };
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

  const [followingCourses, setFollowingCourses] = useState<FollowedCourse[]>(
    [],
  );
  const [followingUsers, setFollowingUsers] = useState<FollowRelation[]>([]);
  const [followers, setFollowers] = useState<FollowRelation[]>([]);
  const [activeSection, setActiveSection] = useState<
    "posts" | "following" | "followers" | "courses"
  >("posts");

  const activeCommentPost = useMemo(() => {
    if (!activeCommentPostId) return null;
    return posts.find((p) => p.id === activeCommentPostId) ?? null;
  }, [activeCommentPostId, posts]);

  const [followRequests, setFollowRequests] = useState<PendingFollowRequest[]>(
    [],
  );
  const [sentFollowRequests, setSentFollowRequests] = useState<
    SentFollowRequest[]
  >([]);

  const followingUsersRef = useRef<HTMLDivElement | null>(null);
  const followersRef = useRef<HTMLDivElement | null>(null);
  const postsRef = useRef<HTMLDivElement | null>(null);

  const [followReqBusy, setFollowReqBusy] = useState<string | null>(null);
  const [sentFollowReqBusy, setSentFollowReqBusy] = useState<string | null>(
    null,
  );
  const [courseFollowBusyId, setCourseFollowBusyId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (mode !== "me") {
      setFollowRequests([]);
      setSentFollowRequests([]);
      return;
    }

    if (!token) {
      setFollowRequests([]);
      setSentFollowRequests([]);
      return;
    }

    const run = async () => {
      try {
        const [incomingRes, sentRes] = await Promise.all([
          fetch(`${API_BASE}/users/me/follow-requests`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/users/me/follow-requests/sent`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (incomingRes.ok) {
          const incomingData = await incomingRes.json();
          setFollowRequests(
            Array.isArray(incomingData?.items) ? incomingData.items : [],
          );
        } else {
          setFollowRequests([]);
        }

        if (sentRes.ok) {
          const sentData = await sentRes.json();
          setSentFollowRequests(
            Array.isArray(sentData?.items) ? sentData.items : [],
          );
        } else {
          setSentFollowRequests([]);
        }
      } catch {
        setFollowRequests([]);
        setSentFollowRequests([]);
      }
    };

    run();
  }, [mode, token]);

  const [followStatus, setFollowStatus] = useState<FollowUiStatus>("UNKNOWN");
  const [followBusy, setFollowBusy] = useState(false);

  const handleAccept = async (userId?: string) => {
    if (!token || !userId) return;
    setFollowReqBusy(userId);

    try {
      await fetch(`${API_BASE}/users/me/follow-requests/${userId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setFollowRequests((prev) =>
        prev.filter((x) => (x.followerId ?? x.follower?.id) !== userId),
      );
    } catch (err) {
      console.error("Accept failed", err);
    } finally {
      setFollowReqBusy(null);
    }
  };

  const handleReject = async (userId?: string) => {
    if (!token || !userId) return;
    setFollowReqBusy(userId);

    try {
      await fetch(`${API_BASE}/users/me/follow-requests/${userId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setFollowRequests((prev) =>
        prev.filter((x) => (x.followerId ?? x.follower?.id) !== userId),
      );
    } catch (err) {
      console.error("Reject failed", err);
    } finally {
      setFollowReqBusy(null);
    }
  };

  const handleCancelSentRequest = async (userId?: string) => {
    if (!token || !userId) return;
    setSentFollowReqBusy(userId);

    try {
      const res = await fetch(
        `${API_BASE}/follows/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(
          `Cancel sent request failed. HTTP ${res.status} ${res.statusText} ${t}`.trim(),
        );
      }

      setSentFollowRequests((prev) =>
        prev.filter((x) => (x.followingId ?? x.following?.id) !== userId),
      );
    } catch (err) {
      console.error("Cancel sent request failed", err);
    } finally {
      setSentFollowReqBusy(null);
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
  }, [token, mode, profile?.id, me?.id]);

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
        setFollowStatus(currently);
        const t = await res.text().catch(() => "");
        throw new Error(
          `Follow request failed. HTTP ${res.status} ${res.statusText} ${t}`.trim(),
        );
      }

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
    if (followStatus === "ACCEPTED") return `✓ ${t("following")}`;
    if (followStatus === "PENDING") return t("requested");
    if (followStatus === "NONE") return `+ ${t("follow")}`;
    if (followStatus === "UNKNOWN") return `+ ${t("follow")}`;
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

  const followButtonStyle: CSSProperties = useMemo(() => {
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
        (c) => c?.id === courseId,
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

  const formatPostCount = (count: number) =>
    `${count} ${count === 1 ? t("post_singular") : t("post_plural")}`;

  const formatCourseCount = (count: number) =>
    `${count} ${count === 1 ? t("course_singular") : t("course_plural")}`;

  const summaryButtonStyle = (
    section: "posts" | "following" | "followers" | "courses",
  ): CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 2,
    minWidth: 0,
    padding: 0,
    border: "none",
    background: "transparent",
    color: "var(--text)",
    cursor: "pointer",
    textAlign: "left",
    boxSizing: "border-box",
    opacity: activeSection === section ? 1 : 0.6,
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
          <strong>{t("error")}:</strong> {err}
        </div>
      )}

      <Card
        title=""
        right={
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <button
              onClick={() => nav(backTo)}
              type="button"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--sub)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                padding: "4px 6px",
              }}
            >
              ← {t("back")}
            </button>

            {mode === "me" ? (
              <button
                onClick={() => nav("/onboarding/profile")}
                type="button"
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text)",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {t("edit")}
              </button>
            ) : (
              <button
                onClick={() => nav("/profile")}
                type="button"
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text)",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {t("my_profile")}
              </button>
            )}
          </div>
        }
      >
        <div
          style={{
            display: "grid",
            gap: 14,
            paddingLeft: isMobile ? 12 : 0,
            paddingRight: isMobile ? 12 : 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              minWidth: 0,
            }}
          >
            {profile?.avatarUrl ? (
              <div
                style={{
                  width: isMobile ? 58 : 72,
                  height: isMobile ? 58 : 72,
                  minWidth: isMobile ? 58 : 72,
                  minHeight: isMobile ? 58 : 72,
                  maxWidth: isMobile ? 58 : 72,
                  maxHeight: isMobile ? 58 : 72,
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
                  width: isMobile ? 58 : 72,
                  height: isMobile ? 58 : 72,
                  minWidth: isMobile ? 58 : 72,
                  minHeight: isMobile ? 58 : 72,
                  maxWidth: isMobile ? 58 : 72,
                  maxHeight: isMobile ? 58 : 72,
                  borderRadius: "50%",
                  background: "rgba(39,196,107,0.18)",
                  border: "1px solid rgba(39,196,107,0.35)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  fontSize: isMobile ? 22 : 26,
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
                display: "grid",
                gap: 6,
                paddingTop: 2,
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: isMobile ? 22 : 26,
                  color: "var(--text)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  wordBreak: "break-word",
                }}
              >
                {profileDisplayName ||
                  `@${profile?.handle ?? targetHandle ?? "unknown"}`}
              </div>

              {profileDisplayName ? (
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--sub)",
                    lineHeight: 1.35,
                    wordBreak: "break-word",
                  }}
                >
                  @{profile?.handle ?? targetHandle ?? "unknown"}
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: isMobile ? 10 : 16,
                  marginTop: 8,
                  width: "100%",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveSection("posts")}
                  style={summaryButtonStyle("posts")}
                >
                  <span
                    style={{
                      fontSize: isMobile ? 24 : 26,
                      fontWeight: 900,
                      lineHeight: 1,
                      color: "var(--text)",
                    }}
                  >
                    {posts.length}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      color:
                        activeSection === "posts"
                          ? "var(--text)"
                          : "var(--sub)",
                    }}
                  >
                    <span>📝</span>
                    <span>{t("posts")}</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection("following")}
                  style={summaryButtonStyle("following")}
                >
                  <span
                    style={{
                      fontSize: isMobile ? 20 : 22,
                      fontWeight: 900,
                      lineHeight: 1,
                      color: "var(--text)",
                    }}
                  >
                    {followingUsers.length}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      color:
                        activeSection === "following"
                          ? "var(--text)"
                          : "var(--sub)",
                    }}
                  >
                    <span>➕</span>
                    <span>{t("following")}</span>
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
                      lineHeight: 1,
                      color: "var(--text)",
                    }}
                  >
                    {followers.length}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      color:
                        activeSection === "followers"
                          ? "var(--text)"
                          : "var(--sub)",
                    }}
                  >
                    <span>👥</span>
                    <span>{t("followers")}</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection("courses")}
                  style={summaryButtonStyle("courses")}
                >
                  <span
                    style={{
                      fontSize: isMobile ? 20 : 22,
                      fontWeight: 900,
                      lineHeight: 1,
                      color: "var(--text)",
                    }}
                  >
                    {followingCourses.length}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      color:
                        activeSection === "courses"
                          ? "var(--text)"
                          : "var(--sub)",
                    }}
                  >
                    <span>⛳</span>
                    <span>{t("courses")}</span>
                  </span>
                </button>
              </div>

              {profile?.createdAt ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--sub)",
                    lineHeight: 1.35,
                    marginTop: 2,
                  }}
                >
                  {t("member_since")} {prettyDate(profile.createdAt)}
                </div>
              ) : null}
            </div>
          </div>

          {mode === "handle" && !isSelf && followLabel ? (
            <div
              style={{
                width: "100%",
              }}
            >
              <PillButton
                onClick={toggleFollow}
                disabled={followDisabled}
                title={
                  followStatus === "PENDING"
                    ? t("follow_request_sent_title")
                    : followStatus === "ACCEPTED"
                      ? t("following_click_unfollow_title")
                      : t("follow")
                }
                style={{
                  ...followButtonStyle,
                  width: isMobile ? "100%" : "auto",
                  minWidth: isMobile ? undefined : 140,
                  textAlign: "center",
                }}
              >
                {followBusy ? "..." : followLabel}
              </PillButton>
            </div>
          ) : null}
        </div>
      </Card>

      {mode === "me" ? <ProfileSettingsCard /> : null}

      {mode === "me" && activeSection === "courses" && (
        <Card title={t("following_courses")}>
          <div style={{ padding: 12 }}>
            <div
              style={{ fontSize: 12, color: "var(--sub)", marginBottom: 10 }}
            >
              {formatCourseCount(followingCourses.length)}
            </div>

            {followingCourses.length === 0 ? (
              <div style={{ padding: 12, color: "var(--sub)" }}>
                {t("no_followed_courses_yet")}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {followingCourses.map((c) => {
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
                        padding: "10px 12px",
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
                          {t("golf_course")}
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
          title={t("follow_requests")}
          right={
            <span style={{ fontSize: 11, color: "var(--sub)" }}>
              {followRequests.length}
            </span>
          }
        >
          {followRequests.length === 0 ? (
            <div style={{ padding: 10, color: "var(--sub)", fontSize: 13 }}>
              {t("no_open_requests")}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {followRequests.map((x) => {
                const userId = x.followerId ?? x.follower?.id;
                const handle =
                  x.followerHandle || x.follower?.handle || userId || "unknown";
                const name = x.followerName || x.follower?.name || null;
                const avatarUrl =
                  x.followerAvatarUrl || x.follower?.avatarUrl || null;
                const busy = followReqBusy === userId;

                return (
                  <div
                    key={userId}
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
                      <AvatarCircle handle={handle} avatarUrl={avatarUrl} />
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
                        disabled={busy || !userId}
                        onClick={() => handleReject(userId)}
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
                        {t("reject")}
                      </button>

                      <button
                        disabled={busy || !userId}
                        onClick={() => handleAccept(userId)}
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
                        {t("accept")}
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
        <Card
          title={t("sent_requests")}
          right={
            <span style={{ fontSize: 11, color: "var(--sub)" }}>
              {sentFollowRequests.length}
            </span>
          }
        >
          {sentFollowRequests.length === 0 ? (
            <div style={{ padding: 10, color: "var(--sub)", fontSize: 13 }}>
              {t("no_open_sent_requests")}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {sentFollowRequests.map((x) => {
                const userId = x.followingId ?? x.following?.id;
                const handle =
                  x.followingHandle ||
                  x.following?.handle ||
                  userId ||
                  "unknown";
                const name = x.followingName || x.following?.name || null;
                const avatarUrl =
                  x.followingAvatarUrl || x.following?.avatarUrl || null;
                const busy = sentFollowReqBusy === userId;

                return (
                  <div
                    key={userId}
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
                      <AvatarCircle handle={handle} avatarUrl={avatarUrl} />
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
                        alignItems: "center",
                        gap: 8,
                        width: isMobile ? "100%" : "auto",
                        marginLeft: isMobile ? 0 : "auto",
                        marginTop: isMobile ? 4 : 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--sub)",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {t("requested")}
                      </div>

                      <button
                        disabled={busy || !userId}
                        onClick={() => handleCancelSentRequest(userId)}
                        style={{
                          flex: isMobile ? 1 : undefined,
                          padding: "6px 10px",
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--text)",
                          cursor: busy ? "default" : "pointer",
                        }}
                      >
                        {busy ? "..." : t("cancel")}
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
            title={t("following_users")}
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
            emptyText={t("no_followed_users_yet")}
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
            title={t("followers")}
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
            emptyText={t("no_followers_yet")}
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
            title={t("posts")}
            right={
              <div style={{ fontSize: 12, color: "var(--sub)" }}>
                {loading ? t("loading") : formatPostCount(posts.length)}
              </div>
            }
          >
            {!loading && posts.length === 0 && (
              <div style={{ padding: 12, color: "var(--sub)" }}>
                {t("no_posts_yet")}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gap: 10,
                paddingBottom: isMobile
                  ? "calc(72px + env(safe-area-inset-bottom, 0px))"
                  : 0,
              }}
            >
              {posts.map((p) => {
                const lat = Number(p.course.lat);
                const lon = Number(p.course.lon);
                const canSelectCourse =
                  Number.isFinite(lat) && Number.isFinite(lon);
                const isCourseFollowed = followingCourses.some(
                  (c) => c?.id === p.course.id,
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

      <BackToTopButton />
    </div>
  );
}
