import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import {
  applyTheme,
  getInitialTheme,
  toggleTheme,
  type ThemeName,
} from "../theme/theme";
import { API_BASE } from "../api/base";
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
  const [theme, setTheme] = useState<ThemeName>(() => getInitialTheme());

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
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
      nav("/", { replace: true });
    }
  };

  return (
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
      }}
    >
      {/* Left brand */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div
          style={{
            color: "var(--green)",
            fontWeight: 900,
            letterSpacing: 0.2,
          }}
        >
          Fairwayd
        </div>
        <div style={{ color: "var(--sub)", fontSize: 12 }}>
          {isAuthenticated ? "Your golf social" : "Explore courses"}
        </div>
      </div>

      {/* Right: avatar + @handle + caret */}
      <div
        style={{ position: "relative", display: "flex", alignItems: "center" }}
      >
        {isAuthenticated ? (
          <>
            <button
              ref={btnRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
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
              {/* Avatar */}
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

                <button type="button" style={menuItem} onClick={doToggleTheme}>
                  Anzeige: {theme === "dark" ? "Dark" : "Light"}
                </button>

                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "6px 0",
                  }}
                />

                <button type="button" style={menuItemDanger} onClick={doLogout}>
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
