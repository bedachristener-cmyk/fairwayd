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

function AvatarCircle({
  handle,
  avatarUrl,
}: {
  handle: string;
  avatarUrl?: string | null;
}) {
  const letter = (handle || "?").slice(0, 1).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={fileUrl(avatarUrl)}
        alt="avatar"
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          objectFit: "cover",
          border: "1px solid var(--border)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 999,
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
    <Card title="Theme">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

      <div style={{ marginTop: 8, fontSize: 12, color: "var(--sub)" }}>
        Current: <b style={{ color: "var(--text)" }}>{theme}</b>
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

  // -------------------------
  // Follow state (only on handle profile, not self)
  // -------------------------
  const [followStatus, setFollowStatus] = useState<FollowUiStatus>("UNKNOWN");
  const [followBusy, setFollowBusy] = useState(false);

  const isSelf = useMemo(() => {
    if (!me?.id || !profile?.id) return false;
    return me.id === profile.id;
  }, [me?.id, profile?.id]);

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
        `${API_BASE}/users/id/${encodeURIComponent(profile.id)}/follow`,
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
          <div style={{ display: "flex", gap: 8 }}>
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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <AvatarCircle
            handle={profile?.handle ?? targetHandle ?? "?"}
            avatarUrl={profile?.avatarUrl}
          />

          <div style={{ minWidth: 0, flex: 1 }}>
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
                minWidth: 120,
                textAlign: "center",
              }}
            >
              {followBusy ? "..." : followLabel}
            </PillButton>
          ) : null}
        </div>
      </Card>

      {/* ✅ Theme selection only in own profile (/profile) */}
      {mode === "me" ? <ThemePicker /> : null}

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
