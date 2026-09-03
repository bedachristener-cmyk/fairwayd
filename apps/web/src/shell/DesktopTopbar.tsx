import { Plus, Users } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopRail from "./TopRail";
import { t } from "../i18n/strings";

function titleForPath(pathname: string) {
  if (pathname.startsWith("/map")) return t("map");
  if (pathname.startsWith("/destinations")) return t("explore");
  if (pathname.startsWith("/trips")) return t("trips");
  if (pathname.startsWith("/profile") || pathname.startsWith("/u/")) {
    return t("profile");
  }
  if (pathname.startsWith("/courses/")) return t("course");
  if (pathname.startsWith("/users")) return t("find_golfers");
  if (pathname.startsWith("/notifications")) return t("notifications");
  return t("feed");
}

function subtitleForPath(pathname: string) {
  if (pathname.startsWith("/map")) return t("desktop_map_subtitle");
  if (pathname.startsWith("/destinations")) return t("desktop_destinations_subtitle");
  if (pathname.startsWith("/trips")) return t("desktop_trips_subtitle");
  if (pathname.startsWith("/profile") || pathname.startsWith("/u/")) {
    return t("desktop_profile_subtitle");
  }
  if (pathname.startsWith("/courses/")) return t("desktop_course_subtitle");
  if (pathname.startsWith("/users")) return t("desktop_users_subtitle");
  if (pathname.startsWith("/notifications")) return t("desktop_notifications_subtitle");
  return t("latest_activity");
}

export default function DesktopTopbar() {
  const location = useLocation();
  const nav = useNavigate();

  const title = useMemo(() => titleForPath(location.pathname), [location]);
  const subtitle = useMemo(() => subtitleForPath(location.pathname), [location]);

  return (
    <header className="fw-desktop-topbar">
      <div className="fw-desktop-topbar__title">
        <div className="fw-desktop-topbar__eyebrow">Fairwayd</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="fw-desktop-topbar__actions">
        <button
          type="button"
          className="fw-desktop-create-button"
          onClick={() => nav("/course-submissions/new")}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>{t("create")}</span>
        </button>

        <button
          type="button"
          className="fw-desktop-secondary-button"
          onClick={() => nav("/users")}
        >
          <Users size={16} strokeWidth={2.4} />
          <span>{t("find_golfers")}</span>
        </button>

        <div className="fw-desktop-topbar__rail">
          <TopRail />
        </div>
      </div>
    </header>
  );
}
