import { Plus, Users } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopRail from "./TopRail";

function titleForPath(pathname: string) {
  if (pathname.startsWith("/map")) return "Map";
  if (pathname.startsWith("/destinations")) return "Explore";
  if (pathname.startsWith("/trips")) return "Trips";
  if (pathname.startsWith("/profile") || pathname.startsWith("/u/")) {
    return "Profile";
  }
  if (pathname.startsWith("/courses/")) return "Course";
  if (pathname.startsWith("/users")) return "Find golfers";
  if (pathname.startsWith("/notifications")) return "Notifications";
  return "Feed";
}

function subtitleForPath(pathname: string) {
  if (pathname.startsWith("/map")) return "Discover courses around the world";
  if (pathname.startsWith("/destinations")) return "Golf travel by destination";
  if (pathname.startsWith("/trips")) return "Plan golf travel with your group";
  if (pathname.startsWith("/profile") || pathname.startsWith("/u/")) {
    return "Posts, friends and golf activity";
  }
  if (pathname.startsWith("/courses/")) return "Course details and activity";
  if (pathname.startsWith("/users")) return "Search Fairwayd members";
  if (pathname.startsWith("/notifications")) return "Recent account activity";
  return "Latest golf activity";
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
          <span>Create</span>
        </button>

        <button
          type="button"
          className="fw-desktop-secondary-button"
          onClick={() => nav("/users")}
        >
          <Users size={16} strokeWidth={2.4} />
          <span>Find golfers</span>
        </button>

        <div className="fw-desktop-topbar__rail">
          <TopRail />
        </div>
      </div>
    </header>
  );
}
