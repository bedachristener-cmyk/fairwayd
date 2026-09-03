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
  UserPlus,
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
import { fetchNotificationUnreadCount } from "../api/notifications";

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

function userSearchHeaders(token?: string | null): HeadersInit | undefined {
  const t = String(token ?? "").trim();
  return t ? { Authorization: `Bearer ${t}` } : undefined;
}

async function readUserSearchItems(res: Response): Promise<UserSearchItem[]> {
  const text = await res.text();
  if (!text.trim()) return [];

  const data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.users)) return data.users;
  return [];
}

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

type MainMenuGroup = {
  key: string;
  label: string;
  items: MainMenuItem[];
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [completedSearchQuery, setCompletedSearchQuery] = useState("");
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
      const data = await fetchNotificationUnreadCount(auth?.token);
      setNotificationBadgeCount(data.count);
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

    window.addEventListener("notificationsUpdated", handler);
    return () => window.removeEventListener("notificationsUpdated", handler);
  }, [loadNotificationBadgeCount]);

  useEffect(() => {
    if (!auth?.token || !isAuthenticated) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void loadNotificationBadgeCount();
      }
    };

    const handleFocus = () => {
      void loadNotificationBadgeCount();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", refreshIfVisible);

    const interval = window.setInterval(refreshIfVisible, 60_000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.clearInterval(interval);
    };
  }, [auth?.token, isAuthenticated, loadNotificationBadgeCount]);

  useEffect(() => {
    if (!searchOpen) return;

    if (!query.trim()) {
      setResults([]);
      setSearchLoading(false);
      setSearchError(null);
      setCompletedSearchQuery("");
      return;
    }

    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);

        const res = await fetch(
          `${API_BASE}/users/search?q=${encodeURIComponent(query.trim())}`,
          {
            headers: userSearchHeaders(auth?.token),
          },
        );

        if (!res.ok) {
          if (!cancelled) {
            setResults([]);
            setCompletedSearchQuery(query.trim());
            setSearchError(
              res.status === 401 || res.status === 403
                ? t("session_expired_login_again")
                : t("search_unavailable_retry"),
            );
          }
          return;
        }

        const baseItems = await readUserSearchItems(res);

        if (!cancelled) {
          setResults(baseItems);
          setCompletedSearchQuery(query.trim());
        }

        const itemsWithStatus: UserSearchItem[] = await Promise.all(
          baseItems.map(async (item): Promise<UserSearchItem> => {
            if (!item.id) {
              return {
                ...item,
                followStatus: "UNKNOWN",
              };
            }

            try {
              const statusRes = await fetch(
                `${API_BASE}/users/id/${item.id}/following-status`,
                {
                  headers: userSearchHeaders(auth?.token),
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

        if (!cancelled) {
          setResults((prev) =>
            prev.map((item) => {
              const withStatus = itemsWithStatus.find(
                (updated) => updated.id === item.id,
              );
              return withStatus ?? item;
            }),
          );
        }
      } catch (err) {
        console.error("Search failed", err);
        if (!cancelled) {
          setResults([]);
          setCompletedSearchQuery(query.trim());
          setSearchError(
            err instanceof TypeError
              ? t("search_unavailable_connection")
              : t("search_unavailable_retry"),
          );
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
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
              headers: userSearchHeaders(auth?.token),
            },
          );

          if (!res.ok) continue;

          const baseItems = await readUserSearchItems(res);

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
    setSearchError(null);

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
        throw new Error(
          res.status === 401 || res.status === 403
            ? t("session_expired_login_again")
            : t("follow_update_failed"),
        );
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
      setSearchError(
        err instanceof Error
          ? err.message
          : t("follow_update_failed"),
      );

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
      key: "follow-requests",
      label: t("follow_requests"),
      subtitle: t("follow_requests_activity"),
      icon: <UserPlus size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/follow-requests"),
      isActive: location.pathname === "/follow-requests",
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
      label: t("trips"),
      subtitle: t("trips_subtitle"),
      icon: <CalendarDays size={18} strokeWidth={2.2} />,
      action: () => navigateFromMenu("/trips"),
      isActive: location.pathname.startsWith("/trips"),
    },
    {
      key: "suggest-course",
      label: t("suggest_missing_course"),
      subtitle: t("suggest_course_subtitle"),
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
            label: t("admin"),
            subtitle: t("moderation_tools"),
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
                label: t("course_submissions"),
                subtitle: t("course_submissions_subtitle"),
                icon: <ClipboardList size={18} strokeWidth={2.2} />,
                action: () => navigateFromMenu("/admin/course-submissions"),
                isActive: location.pathname === "/admin/course-submissions",
              },
              {
                key: "course-submissions-history-admin",
                label: t("course_submission_history"),
                subtitle: t("approved_and_rejected"),
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

  const mainMenuItemByKey = new globalThis.Map(
    mainMenuItems.map((item) => [item.key, item]),
  );

  const mainMenuGroups: MainMenuGroup[] = [
    {
      key: "social",
      label: t("social"),
      items: ["feed", "friends", "follow-requests", "notifications"]
        .map((key) => mainMenuItemByKey.get(key))
        .filter((item): item is MainMenuItem => Boolean(item)),
    },
    {
      key: "golf",
      label: t("golf"),
      items: ["trips", "map", "destinations", "suggest-course"]
        .map((key) => mainMenuItemByKey.get(key))
        .filter((item): item is MainMenuItem => Boolean(item)),
    },
    {
      key: "account",
      label: t("account"),
      items: ["profile", "privacy", "settings", "logout"]
        .map((key) => mainMenuItemByKey.get(key))
        .filter((item): item is MainMenuItem => Boolean(item)),
    },
    {
      key: "support",
      label: t("support"),
      items: ["help", "feedback"]
        .map((key) => mainMenuItemByKey.get(key))
        .filter((item): item is MainMenuItem => Boolean(item)),
    },
    {
      key: "admin",
      label: t("admin"),
      items: ["admin"]
        .map((key) => mainMenuItemByKey.get(key))
        .filter((item): item is MainMenuItem => Boolean(item)),
    },
  ].filter((group) => group.items.length > 0);

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
        className="fw-top-rail"
        style={{
          height: "calc(60px + var(--fw-safe-area-top, 0px))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--fw-safe-area-top, 0px) 14px 0",
          boxSizing: "border-box",
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
              {mainMenuGroups.map((group) => (
                <div key={group.key} style={{ display: "grid", gap: 4 }}>
                  <div style={drawerSectionLabel}>{group.label}</div>

                  {group.items.map((item) => (
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
              ))}
            </div>
          </div>
        </>
      ) : null}

      {searchOpen ? (
        <div
          style={{
            position: "absolute",
            top: "calc(60px + var(--fw-safe-area-top, 0px))",
            left: 8,
            right: 8,
            zIndex: 2999,
            padding: 12,
            display: "grid",
            gap: 12,
            borderRadius: 26,
            border: "1px solid color-mix(in srgb, var(--border) 46%, transparent)",
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--card) 94%, var(--green) 6%), color-mix(in srgb, var(--card) 98%, var(--bg)))",
            boxShadow: "0 18px 46px rgba(0,0,0,0.28)",
            overflow: "hidden",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minHeight: 46,
              padding: "0 14px",
              borderRadius: 999,
              border:
                "1px solid color-mix(in srgb, var(--border) 52%, transparent)",
              background: "color-mix(in srgb, var(--muted) 64%, transparent)",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                color: "var(--sub)",
                fontSize: 12,
                fontWeight: 850,
                flexShrink: 0,
              }}
            >
              Search
            </span>

            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search_golfers_placeholder")}
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

          {!query.trim() && suggestions.length > 0 ? (
            <div
              style={{
                display: "grid",
                gap: 8,
                paddingBottom: 10,
                borderBottom:
                  "1px solid color-mix(in srgb, var(--border) 38%, transparent)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 850,
                  color: "var(--sub)",
                  padding: "0 4px",
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
                    padding: "10px 11px",
                    borderRadius: 18,
                    border:
                      "1px solid color-mix(in srgb, var(--border) 42%, transparent)",
                    background: "color-mix(in srgb, var(--muted) 52%, transparent)",
                    cursor: "pointer",
                  }}
                >
                  {u.avatarUrl ? (
                    <img
                      src={fileUrl(u.avatarUrl)}
                      alt={u.handle}
                      style={{
                        width: 34,
                        height: 34,
                        minWidth: 34,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border:
                          "2px solid color-mix(in srgb, var(--card) 88%, transparent)",
                        boxShadow:
                          "0 8px 18px rgba(0,0,0,0.12), 0 0 0 1px color-mix(in srgb, var(--border) 54%, transparent)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        minWidth: 34,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, color-mix(in srgb, var(--green) 18%, var(--muted)), var(--muted))",
                        border:
                          "1px solid color-mix(in srgb, var(--green) 42%, var(--border))",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 850,
                        color: "var(--text)",
                        boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
                      }}
                    >
                      {(u.name || u.handle).slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 850,
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
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 10 }}>
            {searchLoading && query.trim().length >= 2 ? (
              <div
                style={{
                  padding: "15px 14px",
                  borderRadius: 20,
                  border:
                    "1px solid color-mix(in srgb, var(--border) 42%, transparent)",
                  background: "color-mix(in srgb, var(--muted) 52%, transparent)",
                  color: "var(--sub)",
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                Searching...
              </div>
            ) : null}

            {searchError ? (
              <div
                style={{
                  padding: "15px 14px",
                  borderRadius: 20,
                  border:
                    "1px solid color-mix(in srgb, #ef4444 28%, var(--border))",
                  background: "color-mix(in srgb, #ef4444 8%, var(--muted))",
                  color: "var(--text)",
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                {searchError}
              </div>
            ) : null}

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
                  gap: 11,
                  padding: "12px",
                  cursor: "pointer",
                  borderRadius: 22,
                  border:
                    "1px solid color-mix(in srgb, var(--border) 46%, transparent)",
                  background: "color-mix(in srgb, var(--card) 96%, var(--bg))",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                }}
              >
                {u.avatarUrl ? (
                  <img
                    src={fileUrl(u.avatarUrl)}
                    alt={u.handle}
                    style={{
                      width: 40,
                      height: 40,
                      minWidth: 40,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border:
                        "2px solid color-mix(in srgb, var(--card) 88%, transparent)",
                      boxShadow:
                        "0 8px 20px rgba(0,0,0,0.12), 0 0 0 1px color-mix(in srgb, var(--border) 54%, transparent)",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      minWidth: 40,
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

                <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 3 }}>
                  <div
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
                  </div>
                  <div
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
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleToggleFollow(e, u)}
                  disabled={u.followStatus === "SELF" || followBusyId === u.id}
                  style={{
                    minWidth: 86,
                    height: 34,
                    padding: "0 12px",
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
                    cursor:
                      u.followStatus === "SELF" || followBusyId === u.id
                        ? "default"
                        : "pointer",
                    opacity: followBusyId === u.id ? 0.62 : 1,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow:
                      u.followStatus === "NONE" || !u.followStatus
                        ? "0 10px 22px color-mix(in srgb, var(--green) 20%, transparent)"
                        : "none",
                  }}
                >
                  {followBusyId === u.id
                    ? "..."
                    : getFollowLabel(u.followStatus)}
                </button>
              </div>
            ))}

            {!searchLoading &&
            !searchError &&
            !results.length &&
            completedSearchQuery === query.trim() &&
            query.trim().length >= 2 ? (
              <div
                style={{
                  padding: "15px 14px",
                  borderRadius: 20,
                  border:
                    "1px solid color-mix(in srgb, var(--border) 42%, transparent)",
                  background: "color-mix(in srgb, var(--muted) 52%, transparent)",
                  color: "var(--sub)",
                  fontSize: 13,
                  lineHeight: 1.4,
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

const drawerSectionLabel: CSSProperties = {
  padding: "12px 12px 4px",
  color: "var(--sub)",
  fontSize: 11,
  fontWeight: 900,
  lineHeight: 1,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
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
