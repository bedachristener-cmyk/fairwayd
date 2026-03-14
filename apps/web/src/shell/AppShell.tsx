import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import RightRail from "./RightRail";
import BottomTabs from "./BottomTabs";
import TopRail from "./TopRail";

export default function AppShell() {
  const location = useLocation();
  const isMap = location.pathname === "/map";

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 980);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 980);
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="fw-shell">
      <TopRail />

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
            <div className="fw-desktop-only">
              <Sidebar />
            </div>

            <main
              className={`fw-shell-main ${isMap ? "fw-shell-main--map" : ""}`}
            >
              <div className={`fw-outlet ${isMap ? "fw-outlet--map" : ""}`}>
                <Outlet />
              </div>
            </main>

            <div className="fw-desktop-only">
              <RightRail />
            </div>
          </div>

          <div className="fw-mobile-only">
            <BottomTabs />
          </div>
        </>
      )}
    </div>
  );
}
