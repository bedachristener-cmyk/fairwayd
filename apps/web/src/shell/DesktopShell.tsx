import { Outlet, useLocation } from "react-router-dom";
import ContextSidebar from "./ContextSidebar";
import DesktopSidebar from "./DesktopSidebar";
import DesktopTopbar from "./DesktopTopbar";
import NotificationPermissionPrompt from "../components/NotificationPermissionPrompt";

export default function DesktopShell() {
  const location = useLocation();
  const isMap = location.pathname === "/map";
  const mainClassName = isMap
    ? "fw-desktop-shell__main fw-desktop-shell__main--map"
    : "fw-desktop-shell__main";
  const outletClassName = isMap
    ? "fw-desktop-shell__outlet fw-desktop-shell__outlet--map fw-desktop-main-content fw-desktop-main-content--map"
    : "fw-desktop-shell__outlet fw-desktop-main-content";

  return (
    <div className="fw-desktop-shell">
      <NotificationPermissionPrompt />

      <div className="fw-desktop-shell__frame">
        <DesktopSidebar />

        <div className="fw-desktop-shell__workspace">
          <DesktopTopbar />

          <div className="fw-desktop-shell__body">
            <main className={mainClassName}>
              <div className={outletClassName}>
                <Outlet />
              </div>
            </main>

            <ContextSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
