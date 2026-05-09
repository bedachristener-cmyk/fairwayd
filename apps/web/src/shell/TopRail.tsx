import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ChevronRight,
  ClipboardList,
  Globe,
  HelpCircle,
  Home,
  MapPinPlus,
  LogOut,
  Map,
  Menu,
  MessageSquare,
  Shield,
  Bell,
  CalendarDays,
  Settings,
  User,
  Users,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { t } from "../i18n/strings";

function initialsFromHandle(handle: string) {
  const h = (handle || "").trim();
  if (!h) return "U";
  const parts = h.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return h.slice(0, 2).toUpperCase();
}

type UserSearchItem = {
  id: string;
  handle: string;
  name?: string | null;
  avatarUrl?: string | null;
  followStatus?: "NONE" | "PENDING" | "ACCEPTED" | "SELF" | "UNKNOWN";
};

type MainMenuItem = {
  key: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  children?: MainMenuItem[];
  danger?: boolean;
  disabled?: boolean;
  isActive?: boolean;
};

export default function TopRail() {
  const nav = useNavigate();
  const location = useLocation();
  const auth = useAuth() as any;
  const { me } = useMe(true);

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [adminMenuExpanded, setAdminMenuExpanded] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchItem[]>([]);
  const [suggestions, setSuggestions] = useState<UserSearchItem[]>([]);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeName>(() => getInitialTheme());
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 980);
  const [notificationBadgeCount, setNotificationBadgeCount] = useState(0);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const hamburgerBtnRef = useRef<HTMLButtonElement | null>(null);
  const mainMenuRef = useRef<HTMLDivElement | null>(null);

  const isAuthenticated = !!auth?.isAuthenticated;

  const handle = useMemo(() => {
    return me?.handle || auth?.user?.handle || auth?.me?.handle || "me";
  }, [me?.handle, auth?.user?.handle, auth?.me?.handle]);

  const displayName = useMemo(() => {
    return me?.name || auth?.user?.name || auth?.me?.name || handle;
  }, [me?.name, auth?.user?.name, auth?.me?.name, handle]);

  const rawAvatarUrl = useMemo(() => {
    return me?.avatarUrl || auth?.user?.avatarUrl || auth?.me?.avatarUrl || "";
  }, [me?.avatarUrl, auth?.user?.avatarUrl, auth?.me?.avatarUrl]);

  const avatarUrl = fileUrl(rawAvatarUrl);
  const isAdmin = ["beda"].includes((handle || "").toLowerCase());

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 980);
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadNotificationBadgeCount = useCallback(async () => {
    if (!auth?.token || !isAuthenticated) {
      setNotificationBadgeCount(0);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/me/follow-requests`, {
        headers: { Authorization: `Bearer ${auth?.token}` },
      });

      if (!res.ok) {
        setNotificationBadgeCount(0);
        return;
      }

      const data = await res.json();
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];

      setNotificationBadgeCount(items.length);
    } catch (err) {
      console.error("Notification badge load failed", err);
      setNotificationBadgeCount(0);
    }
  }, [auth?.token, isAuthenticated]);

  useEffect(() => {
    loadNotificationBadgeCount();
  }, [loadNotificationBadgeCount, location.pathname]);

  useEffect(() => {
    const handler = () => {
      void loadNotificationBadgeCount();
    };

    window.addEventListener("followRequestsUpdated", handler);
    return () => window.removeEventListener("followRequestsUpdated", handler);
  }, [loadNotificationBadgeCount]);

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
        const baseItems = Array.isArray(data) ? data : [];

        const itemsWithStatus: UserSearchItem[] = await Promise.all(
          baseItems.map(async (item): Promise<UserSearchItem> => {
            try {
              const statusRes = await fetch(
                `${API_BASE}/users/id/${item.id}/following-status`,
                {
                  headers: { Authorization: `Bearer ${auth?.token}` },
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

              let followStatus: UserSearchItem["followStatus"] = "UNKNOWN";

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
        console.error("Search failed", err);
        setResults([]);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [query, searchOpen, auth?.token]);

  useEffect(() => {
    if (!searchOpen) return;
    if (query.trim()) return;

    let cancelled = false;

    (async () => {
      try {
        const fallbackQueries = ["an", "ma", "ch", "be"];
        let foundItems: UserSearchItem[] = [];

        for (const q of fallbackQueries) {
          const res = await fetch(
            `${API_BASE}/users/search?q=${encodeURIComponent(q)}`,
            {
              headers: { Authorization: `Bearer ${auth?.token}` },
            },
          );

          if (!res.ok) continue;

          const data = await res.json();
          const baseItems = Array.isArray(data) ? data : [];

          const filtered = baseItems.filter((u: any) => u.id !== me?.id);

          if (filtered.length > 0) {
            foundItems = filtered.slice(0, 6);
            break;
          }
        }

        if (!cancelled) {
          setSuggestions(foundItems);
        }
      } catch (err) {
        console.error("Suggestions failed", err);
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchOpen, query, auth?.token, me?.id]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;

      const clickedAccountMenu =
        menuRef.current?.contains(t) || btnRef.current?.contains(t);

      const clickedMainMenu =
        mainMenuRef.current?.contains(t) ||
        hamburgerBtnRef.current?.contains(t);

      if (!clickedAccountMenu) {
        setOpen(false);
      }

      if (!clickedMainMenu) {
        setMainMenuOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearchOpen(false);
        setMainMenuOpen(false);
      }
    };

    if (open || searchOpen || mainMenuOpen) {
      window.addEventListener("mousedown", onDown);
      window.addEventListener("keydown", onKey);
    }

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, searchOpen, mainMenuOpen]);

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
      setMainMenuOpen(false);
      nav("/", { replace: true });
    }
  };

  function closeAllMenus() {
    setOpen(false);
    setSearchOpen(false);
    setMainMenuOpen(false);
  }

  function navigateFromMenu(path: string) {
    closeAllMenus();
    nav(path);
  }

  function getFollowLabel(status?: UserSearchItem["followStatus"]) {
    if (status === "ACCEPTED") return t("following");
    if (status === "PENDING") return t("requested");
    if (status === "SELF") return t("your_rating");
    return t("follow");
  }

  async function handleToggleFollow(
    e: React.MouseEvent<HTMLButtonElement>,
    user: UserSearchItem,
  ) {
    e.stopPropagation();

    if (!auth?.token) return;
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
        headers: { Authorization: `Bearer ${auth?.token}` },
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

  const mainMenuItems: MainMenuItem[] = [
    {
      key: "profile",
      label: t("profile"),
      subtitle: t("your_profile_posts"),
      icon: <User size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/profile"),
      isActive:
        location.pathname === "/profile" || location.pathname.startsWith("/u/"),
    },
    {
      key: "feed",
      label: t("feed"),
      subtitle: t("latest_activity"),
      icon: <Home size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/feed"),
      isActive: location.pathname === "/feed",
    },
    {
      key: "map",
      label: t("map_explore"),
      subtitle: t("discover_courses"),
      icon: <Map size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/map"),
      isActive: location.pathname === "/map",
    },
    {
      key: "friends",
      label: t("friends_following"),
      subtitle: t("your_network"),
      icon: <Users size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/friends"),
      isActive: location.pathname === "/friends",
    },
    {
      key: "destinations",
      label: t("destinations"),
      subtitle: t("golf_by_country"),
      icon: <Globe size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/destinations"),
      isActive: location.pathname.startsWith("/destinations"),
    },
    {
      key: "trips",
      label: "Trips",
      subtitle: "Golf trip planner",
      icon: <CalendarDays size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/trips"),
      isActive: location.pathname.startsWith("/trips"),
    },
    {
      key: "suggest-course",
      label: "Suggest missing course",
      subtitle: "Send a course for review",
      icon: <MapPinPlus size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/course-submissions/new"),
      isActive: location.pathname === "/course-submissions/new",
    },
    {
      key: "notifications",
      label: t("notifications"),
      subtitle: t("follow_requests_activity"),
      icon: <Bell size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/notifications"),
      isActive: location.pathname === "/notifications",
    },
    {
      key: "feedback",
      label: t("feedback"),
      subtitle: t("feedback_subtitle"),
      icon: <MessageSquare size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/feedback"),
      isActive: location.pathname === "/feedback",
    },
    ...(isAdmin
      ? [
          {
            key: "admin",
            label: "Admin",
            subtitle: "Moderation tools",
            icon: <ClipboardList size={18} strokeWidth={2.2} />,
            action: () => setAdminMenuExpanded((value) => !value),
            isActive:
              location.pathname === "/feedback-admin" ||
              location.pathname === "/admin/course-submissions" ||
              location.pathname === "/admin/course-submissions/history",
            children: [
              {
                key: "feedback-admin",
                label: t("feedback_admin"),
                subtitle: t("feedback_admin_subtitle"),
                icon: <MessageSquare size={18} strokeWidth={2.2} />,
                action: () => navigateFromMenu("/feedback-admin"),
                isActive: location.pathname === "/feedback-admin",
              },
              {
                key: "course-submissions-admin",
                label: "Course submissions",
                subtitle: "Review suggested courses",
                icon: <ClipboardList size={18} strokeWidth={2.2} />,
                action: () => navigateFromMenu("/admin/course-submissions"),
                isActive: location.pathname === "/admin/course-submissions",
              },
              {
                key: "course-submissions-history-admin",
                label: "Course submission history",
                subtitle: "Approved and rejected",
                icon: <ClipboardList size={18} strokeWidth={2.2} />,
                action: () =>
                  navigateFromMenu("/admin/course-submissions/history"),
                isActive:
                  location.pathname === "/admin/course-submissions/history",
              },
            ],
          },
        ]
      : []),
    {
      key: "settings",
      label: t("settings"),
      subtitle: t("theme_app_preferences"),
      icon: <Settings size={18} strokeWidth={2.2} />,
      action: () => {
        closeAllMenus();
        doToggleTheme();
      },
      isActive: false,
    },
    {
      key: "privacy",
      label: t("privacy_security"),
      subtitle: t("account_privacy_safety"),
      icon: <Shield size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/privacy-security"),
      isActive: location.pathname === "/privacy-security",
    },
    {
      key: "help",
      label: t("help_faq"),
      subtitle: t("quick_help_guidance"),
      icon: <HelpCircle size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/help"),
      isActive: location.pathname === "/help",
    },
    {
      key: "logout",
      label: t("logout"),
      subtitle: t("sign_out_fairwayd"),
      icon: <LogOut size={18} strokeWidth={2.2} />,
      action: doLogout,
      danger: true,
      isActive: false,
    },
  ];

  const renderDrawerMenuItem = (item: MainMenuItem, nested = false) => (
    <button
      key={item.key}
      type="button"
      onClick={item.action}
      style={{
        ...drawerListItem,
        paddingLeft: nested ? 34 : drawerListItem.paddingLeft,
        color: item.danger
          ? "rgba(255,140,140,1)"
          : item.isActive
            ? "var(--text)"
            : "var(--text)",
        opacity: item.disabled ? 0.72 : 1,
        background: item.isActive ? "rgba(255,255,255,0.06)" : "transparent",
        borderLeft: item.isActive
          ? "3px solid var(--text)"
          : "3px solid transparent",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: item.danger
            ? "rgba(255,140,140,1)"
            : item.isActive
              ? "var(--text)"
              : "var(--sub)",
          flexShrink: 0,
        }}
      >
        {item.icon}
      </div>

      <div
        style={{
          minWidth: 0,
          flex: 1,
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontWeight: item.isActive ? 900 : 800,
            fontSize: 14,
            lineHeight: 1.2,
            color: item.danger
              ? "rgba(255,140,140,1)"
              : item.isActive
                ? "var(--text)"
                : "var(--text)",
          }}
        >
          {item.label}
        </div>

        <div
          style={{
            fontSize: 12,
            color: item.danger
              ? "rgba(255,180,180,0.9)"
              : item.isActive
                ? "rgba(39,196,107,0.95)"
                : "var(--sub)",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.subtitle}
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          paddingLeft: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {item.key === "notifications" && notificationBadgeCount > 0 ? (
          <div
            style={{
              minWidth: 20,
              height: 20,
              padding: "0 6px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: 11,
              fontWeight: 900,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {notificationBadgeCount}
          </div>
        ) : null}

        <div
          style={{
            color: item.danger
              ? "rgba(255,180,180,0.9)"
              : item.isActive
                ? "var(--text)"
                : "var(--sub)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform:
              item.children && (adminMenuExpanded || item.isActive)
                ? "rotate(90deg)"
                : undefined,
          }}
        >
          <ChevronRight size={18} strokeWidth={2.2} />
        </div>
      </div>
    </button>
  );

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
          <button
            ref={hamburgerBtnRef}
            type="button"
            onClick={() => {
              setOpen(false);
              setSearchOpen(false);
              setMainMenuOpen((v) => !v);
            }}
            aria-label={t("open_main_menu")}
            title={t("open_main_menu")}
            style={hamburgerButtonStyle}
          >
            <Menu size={18} strokeWidth={2.4} />
          </button>

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
              {isAuthenticated ? t("your_golf_social") : t("explore_courses")}
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
            <>
              {/* SEARCH */}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setMainMenuOpen(false);

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
                title={t("find_golfers")}
              >
                {isMobile ? (
                  <span style={{ fontSize: 18, lineHeight: 1 }}>🔍</span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      lineHeight: 1,
                    }}
                  >
                    <span style={{ fontSize: 15, lineHeight: 1 }}>🔍</span>
                    <span>{t("find_golfers")}</span>
                  </span>
                )}
              </button>

              {/* 🔔 NOTIFICATIONS */}
              <button
                type="button"
                onClick={() => {
                  closeAllMenus();
                  nav("/notifications");
                }}
                title={t("notifications")}
                style={{
                  position: "relative",
                  border: "none",
                  background: "transparent",
                  color: "var(--text)",
                  padding: 0,
                  cursor: "pointer",
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>🔔</span>

                {notificationBadgeCount > 0 ? (
                  <div
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      borderRadius: 999,
                      background: "var(--text)",
                      color: "var(--bg)",
                      fontSize: 10,
                      fontWeight: 900,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    {notificationBadgeCount}
                  </div>
                ) : null}
              </button>
            </>
          ) : null}

          {isAuthenticated ? (
            <>
              <button
                ref={btnRef}
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setMainMenuOpen(false);
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
                title={t("account")}
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
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    👤
                  </div>
                )}

                {!isMobile ? (
                  <>
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
                  </>
                ) : null}
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
                      {t("account")}
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
                    {t("edit_profile")}
                  </button>

                  <button
                    type="button"
                    style={menuItem}
                    onClick={doToggleTheme}
                  >
                    {t("theme")}:{" "}
                    {theme === "dark" ? t("theme_dark") : t("theme_light")}
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
                    {t("logoff")}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={() => nav("/")}
              style={{
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                padding: "8px 12px",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              {t("sign_in")}
            </button>
          )}
        </div>
      </div>

      {mainMenuOpen ? (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 3498,
            }}
          />

          <div
            ref={mainMenuRef}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: isMobile ? "86vw" : 360,
              maxWidth: "100%",
              background: "var(--card)",
              borderRight: "1px solid var(--border)",
              boxShadow: "16px 0 40px rgba(0,0,0,0.45)",
              zIndex: 3499,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "14px 14px 12px 14px",
                borderBottom: "1px solid var(--border)",
                display: "grid",
                gap: 12,
                background: "var(--card)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  {isAuthenticated ? (
                    avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 999,
                          objectFit: "cover",
                          border: "1px solid var(--border)",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          color: "var(--text)",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 900,
                          fontSize: 16,
                          letterSpacing: 0.4,
                          flexShrink: 0,
                        }}
                      >
                        {initialsFromHandle(handle)}
                      </div>
                    )
                  ) : (
                    <img
                      src={logo}
                      alt="Fairwayd"
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        border: "1px solid var(--border)",
                        flexShrink: 0,
                      }}
                    />
                  )}

                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                      display: "grid",
                      gap: 3,
                      paddingTop: 2,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "var(--sub)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {isAuthenticated ? t("your_account") : "Fairwayd"}
                    </div>

                    <div
                      style={{
                        fontSize: 17,
                        lineHeight: 1.15,
                        fontWeight: 900,
                        color: "var(--text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {isAuthenticated ? displayName : t("welcome")}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--sub)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {isAuthenticated
                        ? `@${handle}`
                        : t("explore_courses_golfers")}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMainMenuOpen(false)}
                  style={drawerCloseButton}
                  aria-label={t("close_main_menu")}
                  title={t("close_main_menu")}
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>

              {isAuthenticated ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      display: "grid",
                      gap: 2,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "var(--sub)",
                      }}
                    >
                      {t("jump_back_profile")}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {t("posts_followers_account")}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateFromMenu("/profile")}
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      height: 34,
                      padding: "0 12px",
                      borderRadius: 999,
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {t("view_profile")}
                  </button>
                </div>
              ) : null}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: isMobile
                  ? "10px 10px 110px 10px"
                  : "10px 10px 18px 10px",
                display: "grid",
                gap: 6,
              }}
            >
              {mainMenuItems.map((item) => (
                <div key={item.key} style={{ display: "grid", gap: 4 }}>
                  {renderDrawerMenuItem(item)}
                  {item.children && (adminMenuExpanded || item.isActive) ? (
                    <div style={{ display: "grid", gap: 4 }}>
                      {item.children.map((child) =>
                        renderDrawerMenuItem(child, true),
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

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

          {!query.trim() && suggestions.length > 0 ? (
            <div
              style={{
                display: "grid",
                gap: 6,
                paddingBottom: 6,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "var(--sub)",
                  padding: "0 2px",
                }}
              >
                {t("suggested_golfers")}
              </div>

              {suggestions.map((u) => (
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
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  {u.avatarUrl ? (
                    <img
                      src={fileUrl(u.avatarUrl)}
                      alt={u.handle}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "1px solid var(--border)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "rgba(39,196,107,0.18)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                        color: "var(--text)",
                      }}
                    >
                      {(u.name || u.handle).slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div style={{ fontSize: 13, color: "var(--text)" }}>
                    {u.name || u.handle}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 10 }}>
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
                  padding: "10px 10px",
                  cursor: "pointer",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.04)",
                  background: "rgba(255,255,255,0.02)",
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

                <div style={{ minWidth: 0, flex: 1 }}>
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

                <button
                  type="button"
                  onClick={(e) => handleToggleFollow(e, u)}
                  disabled={u.followStatus === "SELF" || followBusyId === u.id}
                  style={{
                    minWidth: 86,
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 999,
                    border:
                      u.followStatus === "ACCEPTED"
                        ? "1px solid rgba(39,196,107,0.38)"
                        : u.followStatus === "PENDING"
                          ? "1px solid rgba(255,255,255,0.14)"
                          : u.followStatus === "SELF"
                            ? "1px solid rgba(120,160,255,0.28)"
                            : "1px solid var(--border)",
                    background:
                      u.followStatus === "ACCEPTED"
                        ? "rgba(39,196,107,0.16)"
                        : u.followStatus === "PENDING"
                          ? "rgba(255,255,255,0.05)"
                          : u.followStatus === "SELF"
                            ? "rgba(120,160,255,0.12)"
                            : "var(--bg)",
                    color:
                      u.followStatus === "ACCEPTED"
                        ? "rgb(120,235,165)"
                        : u.followStatus === "PENDING"
                          ? "var(--sub)"
                          : u.followStatus === "SELF"
                            ? "rgb(170,195,255)"
                            : "var(--text)",
                    fontWeight: 900,
                    fontSize: 11,
                    letterSpacing: 0.2,
                    cursor:
                      u.followStatus === "SELF" || followBusyId === u.id
                        ? "default"
                        : "pointer",
                    opacity: followBusyId === u.id ? 0.6 : 1,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {followBusyId === u.id
                    ? "..."
                    : getFollowLabel(u.followStatus)}
                </button>
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
                {t("no_users_found")}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

const hamburgerButtonStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  cursor: "pointer",
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  flexShrink: 0,
};

const drawerCloseButton: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const drawerListItem: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 12,
  textAlign: "left",
  padding: "13px 12px",
  borderTop: 0,
  borderRight: 0,
  borderBottom: "1px solid var(--border)",
  borderLeft: "3px solid transparent",
  background: "transparent",
  cursor: "pointer",
  transition:
    "background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
};

const menuItem: CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "var(--text)",
  fontWeight: 800,
};

const menuItemDanger: CSSProperties = {
  ...menuItem,
  color: "rgba(255,140,140,1)",
};
