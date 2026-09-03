import {
  Bell,
  CalendarDays,
  ClipboardList,
  Globe,
  HelpCircle,
  Home,
  Map,
  MapPinPlus,
  MessageSquare,
  Search,
  Shield,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { fileUrl } from "../api/fileUrl";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import { t } from "../i18n/strings";
import logo from "../assets/logo.png";

type NavItem = {
  key: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  protected?: boolean;
  isActive: (pathname: string) => boolean;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

type TripItem = {
  type?: string | null;
  date?: string | null;
  endDate?: string | null;
  startsAt?: string | null;
};

type SidebarTrip = {
  id: string;
  title: string;
  destination?: string | null;
  coverImageUrl?: string | null;
  items?: TripItem[];
};

const activeStartsWith = (path: string) => (pathname: string) =>
  pathname.startsWith(path);

const activeExact = (path: string) => (pathname: string) => pathname === path;

function parseTrips(data: unknown): SidebarTrip[] {
  if (Array.isArray(data)) return data as SidebarTrip[];
  if (Array.isArray((data as any)?.items)) return (data as any).items;
  return [];
}

function timeValue(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function nextTripTime(trip: SidebarTrip, todayTime: number) {
  const upcomingTimes =
    trip.items
      ?.flatMap((item) => [item.date ?? item.startsAt, item.endDate])
      .map(timeValue)
      .filter((time): time is number => time != null && time >= todayTime) ??
    [];

  return upcomingTimes.length > 0 ? Math.min(...upcomingTimes) : null;
}

function shortTripDate(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function tripCountdown(value: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((value - today.getTime()) / 86_400_000);

  if (days <= 0) return t("today");
  if (days === 1) return t("tomorrow");
  if (days < 30) return `${days} days`;

  return shortTripDate(value);
}

function golfRoundCount(trip?: SidebarTrip | null) {
  return (
    trip?.items?.filter((item) => {
      const value = item.type ?? "";
      return /golf|round|tee|course/i.test(value);
    }).length ?? 0
  );
}

function initials(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return (trimmed.slice(0, 1) || "F").toUpperCase();
}

function SidebarImage({
  src,
  alt,
  fallback,
}: {
  src: string;
  alt: string;
  fallback: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return <img src={src} alt={alt} onError={() => setFailed(true)} />;
  }

  return <span>{fallback}</span>;
}

export default function DesktopSidebar() {
  const nav = useNavigate();
  const loc = useLocation();
  const { isAuthenticated, token } = useAuth();
  const { me } = useMe(true);
  const [nextTrip, setNextTrip] = useState<
    { trip: SidebarTrip; nextTime: number } | null
  >(null);
  const isAdmin = ["beda"].includes((me?.handle || "").toLowerCase());
  const avatarUrl = fileUrl(me?.avatarUrl);
  const displayName = me?.name || me?.handle || t("fairwayd_golfer");

  useEffect(() => {
    if (!token) {
      setNextTrip(null);
      return;
    }

    let cancelled = false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    fetch(`${API_BASE}/trips`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return;

        const upcoming = parseTrips(data)
          .map((trip) => ({ trip, nextTime: nextTripTime(trip, todayTime) }))
          .filter(
            (entry): entry is { trip: SidebarTrip; nextTime: number } =>
              entry.nextTime != null,
          )
          .sort((a, b) => a.nextTime - b.nextTime);

        setNextTrip(upcoming[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setNextTrip(null);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const nextTripCoverUrl = useMemo(
    () => fileUrl(nextTrip?.trip.coverImageUrl),
    [nextTrip?.trip.coverImageUrl],
  );

  const navGroups: NavGroup[] = [
    {
      items: [
        {
          key: "map",
          path: "/map",
          label: t("map"),
          icon: <Map size={18} strokeWidth={2.2} />,
          isActive: activeStartsWith("/map"),
        },
        {
          key: "destinations",
          path: "/destinations",
          label: t("explore"),
          icon: <Globe size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: activeStartsWith("/destinations"),
        },
        {
          key: "feed",
          path: "/feed",
          label: t("feed"),
          icon: <Home size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: activeStartsWith("/feed"),
        },
        {
          key: "trips",
          path: "/trips",
          label: t("trips"),
          icon: <CalendarDays size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: activeStartsWith("/trips"),
        },
      ],
    },
    {
      label: t("social"),
      items: [
        {
          key: "friends",
          path: "/friends",
          label: t("friends_following"),
          icon: <Users size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: activeStartsWith("/friends"),
        },
        {
          key: "users",
          path: "/users",
          label: t("find_golfers"),
          icon: <Search size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: activeStartsWith("/users"),
        },
        {
          key: "follow-requests",
          path: "/follow-requests",
          label: t("follow_requests"),
          icon: <UserPlus size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: activeStartsWith("/follow-requests"),
        },
        {
          key: "notifications",
          path: "/notifications",
          label: t("notifications"),
          icon: <Bell size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: activeStartsWith("/notifications"),
        },
      ],
    },
    {
      label: t("golf"),
      items: [
        {
          key: "following",
          path: "/following",
          label: t("following"),
          icon: <User size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: activeStartsWith("/following"),
        },
        {
          key: "suggest-course",
          path: "/course-submissions/new",
          label: t("suggest_course"),
          icon: <MapPinPlus size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: activeStartsWith("/course-submissions"),
        },
      ],
    },
    {
      label: t("account"),
      items: [
        {
          key: "profile",
          path: "/profile",
          label: t("profile"),
          icon: <User size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: (pathname: string) =>
            pathname.startsWith("/profile") || pathname.startsWith("/u/"),
        },
        {
          key: "privacy",
          path: "/privacy-security",
          label: t("privacy_security"),
          icon: <Shield size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: activeStartsWith("/privacy-security"),
        },
      ],
    },
    {
      label: t("support"),
      items: [
        {
          key: "help",
          path: "/help",
          label: t("help_faq"),
          icon: <HelpCircle size={18} strokeWidth={2.2} />,
          isActive: activeStartsWith("/help"),
        },
        {
          key: "feedback",
          path: "/feedback",
          label: t("feedback"),
          icon: <MessageSquare size={18} strokeWidth={2.2} />,
          protected: true,
          isActive: activeStartsWith("/feedback"),
        },
      ],
    },
    {
      label: t("admin"),
      items: isAdmin
        ? [
            {
              key: "feedback-admin",
              path: "/feedback-admin",
              label: t("feedback_admin"),
              icon: <MessageSquare size={18} strokeWidth={2.2} />,
              protected: true,
              isActive: activeExact("/feedback-admin"),
            },
            {
              key: "course-submissions-admin",
              path: "/admin/course-submissions",
              label: t("course_submissions"),
              icon: <ClipboardList size={18} strokeWidth={2.2} />,
              protected: true,
              isActive: activeExact("/admin/course-submissions"),
            },
            {
              key: "course-submissions-history-admin",
              path: "/admin/course-submissions/history",
              label: t("course_submission_history"),
              icon: <ClipboardList size={18} strokeWidth={2.2} />,
              protected: true,
              isActive: activeExact("/admin/course-submissions/history"),
            },
          ]
        : [],
    },
  ].filter((group) => group.items.length > 0);

  function go(item: NavItem) {
    if (item.protected && !isAuthenticated) {
      nav("/");
      return;
    }

    nav(item.path);
  }

  return (
    <aside className="fw-desktop-sidebar" aria-label={t("primary_navigation")}>
      <button
        type="button"
        className="fw-desktop-sidebar__brand"
        onClick={() => nav(isAuthenticated ? "/feed" : "/map")}
        aria-label={t("fairwayd_home")}
      >
        <img src={logo} alt="" className="fw-desktop-sidebar__logo" />
        <span>
          <span className="fw-desktop-sidebar__name">Fairwayd</span>
          <span className="fw-desktop-sidebar__tagline">
            {t("golf_social_tagline")}
          </span>
        </span>
      </button>

      <nav className="fw-desktop-sidebar__nav">
        {navGroups.map((group, groupIndex) => (
          <div
            key={group.label ?? `primary-${groupIndex}`}
            className="fw-desktop-sidebar__group"
          >
            {group.label ? (
              <div className="fw-desktop-sidebar__group-label">
                {group.label}
              </div>
            ) : null}

            {group.items.map((item) => {
              const active = item.isActive(loc.pathname);
              const disabled = item.protected && !isAuthenticated;

              return (
                <button
                  key={item.key}
                  type="button"
                  className={
                    active
                      ? "fw-desktop-sidebar__item fw-desktop-sidebar__item--active"
                      : "fw-desktop-sidebar__item"
                  }
                  onClick={() => go(item)}
                  aria-current={active ? "page" : undefined}
                  aria-disabled={disabled || undefined}
                >
                  <span className="fw-desktop-sidebar__icon">{item.icon}</span>
                  <span className="fw-desktop-sidebar__label">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="fw-desktop-sidebar__footer">
        {nextTrip ? (
          <section className="fw-desktop-sidebar-trip" aria-label={t("desktop_trips_subtitle")}>
            <div className="fw-desktop-sidebar-trip__media" aria-hidden="true">
              <SidebarImage
                src={nextTripCoverUrl}
                alt=""
                fallback={initials(nextTrip.trip.destination ?? nextTrip.trip.title)}
              />
            </div>
            <div className="fw-desktop-sidebar-trip__body">
              <span className="fw-desktop-sidebar-trip__eyebrow">
                {t("desktop_trips_subtitle")}
              </span>
              <strong>{nextTrip.trip.title}</strong>
              <span>
                {[tripCountdown(nextTrip.nextTime), `${golfRoundCount(nextTrip.trip)} rounds`]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
            </div>
            <button
              type="button"
              className="fw-desktop-sidebar-trip__action"
              onClick={() => nav(`/trips/${nextTrip.trip.id}`)}
            >
              {t("open")}
            </button>
          </section>
        ) : null}

        {isAuthenticated ? (
          <button
            type="button"
            className="fw-desktop-sidebar-user"
            onClick={() => nav("/profile")}
            aria-label={t("open_profile")}
          >
            <span className="fw-desktop-sidebar-user__avatar" aria-hidden="true">
              <SidebarImage
                src={avatarUrl}
                alt=""
                fallback={initials(displayName)}
              />
            </span>
            <span className="fw-desktop-sidebar-user__copy">
              <strong>{displayName}</strong>
              {me?.handle ? <span>@{me.handle}</span> : null}
            </span>
            <span className="fw-desktop-sidebar-user__menu" aria-hidden="true">
              ...
            </span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}
