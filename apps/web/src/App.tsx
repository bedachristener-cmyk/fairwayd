import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CoursesMap from "./components/CoursesMap";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import ComposePost from "./pages/ComposePost";
import FeedPage from "./pages/FeedPage";
import AppShell from "./shell/AppShell";
import { SelectedCourseProvider } from "./state/SelectedCourseContext";
import LandingPage from "./pages/LandingPage";

function ProfilePlaceholder() {
  return <div style={{ padding: 16, fontWeight: 900 }}>Profile (Step 4)</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SelectedCourseProvider>
          <Routes>
            {/* Public landing (no shell) */}
            <Route path="/" element={<LandingPage />} />

            {/* Shell layout */}
            <Route element={<AppShell />}>
              {/* Public map inside shell */}
              <Route path="/map" element={<CoursesMap />} />

              {/* Protected feed */}
              <Route
                path="/feed"
                element={
                  <ProtectedRoute>
                    <FeedPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected compose (legacy / optional) */}
              <Route
                path="/compose/:courseId"
                element={
                  <ProtectedRoute>
                    <ComposePost />
                  </ProtectedRoute>
                }
              />

              {/* Protected profile */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePlaceholder />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Convenience */}
            <Route path="/home" element={<Navigate to="/map" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SelectedCourseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
