import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import logo from "../assets/logo.png";
import { API_BASE } from "../api/base";
import {
  applyTheme,
  getInitialTheme,
  toggleTheme,
  type ThemeName,
} from "../theme/theme";
import { fileUrl } from "../api/fileUrl";

function initialsFromHandle(handle: string) {
  const h = (handle || "").trim();
  if (!h) return "U";
  const parts = h.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return h.slice(0, 2).toUpperCase();
}

export default function TopRail() {
  const nav = useNavigate();
  const auth = useAuth() as any;
  const { me } = useMe(true);

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [theme, setTheme] = useState<ThemeName>(() => getInitialTheme());
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 980);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isAuthenticated = !!auth?.isAuthenticated;

  const handle = useMemo(() => {
    return me?.handle || auth?.user?.handle || auth?.me?.handle || "me";
  }, [me?.handle, auth?.user?.handle, auth?.me?.handle]);

  const rawAvatarUrl = useMemo(() => {
    return me?.avatarUrl || auth?.user?.avatarUrl || auth?.me?.avatarUrl || "";
  }, [me?.avatarUrl, auth?.user?.avatarUrl, auth?.me?.avatarUrl]);

  const avatarUrl = fileUrl(rawAvatarUrl);
  const initials = initialsFromHandle(handle);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 980);
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/users/search?q=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${auth?.token}` },
          },
        );

        if (!res.ok) {
          setResults([]);
          return;
        }

        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Search failed", err);
        setResults([]);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [query, searchOpen, auth?.token]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;

      if (menuRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;

      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearchOpen(false);
      }
    };

    if (open || searchOpen) {
      window.addEventListener("mousedown", onDown);
      window.addEventListener("keydown", onKey);
    }

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, searchOpen]);

  const doToggleTheme = () => {
    const next = toggleTheme(theme);
    setTheme(next);
    applyTheme(next);
  };

  const doLogout = () => {
    try {
      auth?.logout?.();
    } finally {
      setOpen(false);
      setSearchOpen(false);
      nav("/", { replace: true });
    }
  };

  return (
    <>
      <div
        style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
          boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
          position: "relative",
          zIndex: 3000,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={logo}
            alt="Fairwayd"
            style={{
              height: 32,
              width: 32,
              borderRadius: 8,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 800 }}>Fairwayd</span>
            <span style={{ color: "var(--sub)", fontSize: 12 }}>
              {isAuthenticated ? "Your golf social" : "Explore courses"}
            </span>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);

                if (isMobile) {
                  setSearchOpen((v) => !v);
                } else {
                  nav("/users");
                }
              }}
              style={
                isMobile
                  ? {
                      border: "none",
                      background: "transparent",
                      color: "var(--text)",
                      padding: 0,
                      cursor: "pointer",
                      fontSize: 18,
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      flexShrink: 0,
                    }
                  : {
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      padding: "8px 12px",
                      borderRadius: 999,
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }
              }
              title="Find golfers"
            >
              {isMobile ? "🔍" : "🔍 Find golfers"}
            </button>
          ) : null}

          {isAuthenticated ? (
            <>
              <button
                ref={btnRef}
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setOpen((v) => !v);
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--text)",
                }}
                title="Account"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      objectFit: "cover",
                      border: "1px solid var(--border)",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      background: "rgba(39,196,107,0.18)",
                      border: "1px solid rgba(39,196,107,0.35)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                      color: "var(--text)",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                      letterSpacing: 0.5,
                    }}
                  >
                    {initials}
                  </div>
                )}

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: "var(--text)",
                    opacity: 0.9,
                  }}
                >
                  @{handle}
                </div>

                <div style={{ fontSize: 12, opacity: 0.65, marginTop: -1 }}>
                  ▾
                </div>
              </button>

              {open ? (
                <div
                  ref={menuRef}
                  style={{
                    position: "absolute",
                    top: 46,
                    right: 0,
                    width: 220,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
                    overflow: "hidden",
                    zIndex: 3000,
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>@{handle}</div>
                    <div style={{ fontSize: 12, color: "var(--sub)" }}>
                      Account
                    </div>
                  </div>

                  <button
                    type="button"
                    style={menuItem}
                    onClick={() => {
                      setOpen(false);
                      nav("/profile");
                    }}
                  >
                    Edit Profile
                  </button>

                  <button
                    type="button"
                    style={menuItem}
                    onClick={doToggleTheme}
                  >
                    Anzeige: {theme === "dark" ? "Dark" : "Light"}
                  </button>

                  <div
                    style={{
                      height: 1,
                      background: "var(--border)",
                      margin: "6px 0",
                    }}
                  />

                  <button
                    type="button"
                    style={menuItemDanger}
                    onClick={doLogout}
                  >
                    Logoff
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={() => nav("/")}
              style={{
                border: "1px solid rgba(39,196,107,0.35)",
                background: "rgba(39,196,107,0.18)",
                color: "var(--text)",
                padding: "8px 12px",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Login
            </button>
          )}
        </div>
      </div>

      {searchOpen ? (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 0,
            right: 0,
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            zIndex: 2999,
            padding: 12,
            display: "grid",
            gap: 10,
            boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search golfers..."
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "grid", gap: 8 }}>
            {results.map((u) => (
              <div
                key={u.id}
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                  setResults([]);
                  nav(`/u/${u.handle}`);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                  borderRadius: 10,
                }}
              >
                {u.avatarUrl ? (
                  <img
                    src={fileUrl(u.avatarUrl)}
                    alt={u.handle}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(39,196,107,0.18)",
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

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {u.name || u.handle}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--sub)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    @{u.handle}
                  </div>
                </div>
              </div>
            ))}

            {!results.length && query.trim().length >= 2 ? (
              <div
                style={{
                  padding: "8px 10px",
                  color: "var(--sub)",
                  fontSize: 13,
                }}
              >
                No users found
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

const menuItem: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "var(--text)",
  fontWeight: 800,
};

const menuItemDanger: React.CSSProperties = {
  ...menuItem,
  color: "rgba(255,140,140,1)",
};
