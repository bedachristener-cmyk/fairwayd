import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import BottomTabs from "./BottomTabs";
import TopRail from "./TopRail";
import DesktopShell from "./DesktopShell";
import InstallAppPrompt from "../pwa/InstallAppPrompt";
import { useStandaloneMode } from "../pwa/useStandaloneMode";
import NotificationPermissionPrompt from "../components/NotificationPermissionPrompt";

export default function AppShell() {
  const location = useLocation();
  const isMap = location.pathname === "/map";
  const isStandalone = useStandaloneMode();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 980);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 980);
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isMobile) {
    return <DesktopShell />;
  }

  return (
    <div className="fw-shell">
      <TopRail />
      {isMobile && !isStandalone ? <InstallAppPrompt /> : null}
      <NotificationPermissionPrompt />

      {isMap && isMobile ? (
        <>
          <main className="fw-shell-main fw-shell-main--map">
            <div className="fw-outlet fw-outlet--map">
              <Outlet />
            </div>
          </main>

          <div className="fw-mobile-only">
            <BottomTabs />
          </div>
        </>
      ) : (
        <>
          <div className="fw-shell-grid">
            <main
              className={`fw-shell-main ${isMap ? "fw-shell-main--map" : ""}`}
            >
              <div className={`fw-outlet ${isMap ? "fw-outlet--map" : ""}`}>
                <Outlet />
              </div>
            </main>
          </div>

          <div className="fw-mobile-only">
            <BottomTabs />
          </div>
        </>
      )}
    </div>
  );
}
