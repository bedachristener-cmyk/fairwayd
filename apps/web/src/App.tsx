import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import CoursesMap from "./components/CoursesMap";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import ComposePost from "./pages/ComposePost";
import FeedPage from "./pages/FeedPage";
import AppShell from "./shell/AppShell";
import { SelectedCourseProvider } from "./state/SelectedCourseContext";
import LandingPage from "./pages/LandingPage";
import FollowRequestsPage from "./pages/FollowRequestsPage";

// Onboarding (frontend)
import { useMe } from "./auth/useMe";
import TermsGate from "./onboarding/TermsGate";
import ProfileSetup from "./onboarding/ProfileSetup";

// Pages
import ProfilePage from "./pages/ProfilePage";
import FollowingCoursesPage from "./pages/FollowingCoursesPage";
import CoursePage from "./pages/CoursePage";
import FeedbackAdminPage from "./pages/FeedbackAdminPage";
import UserSearchPage from "./pages/UserSearchPage";
import DestinationsPage from "./pages/DestinationsPage";
import StageFeedbackWidget from "./components/StageFeedbackWidget";
import DestinationPage from "./pages/DestinationPage";

/**
 * Wrap any protected page with this:
 * - requires JWT (ProtectedRoute does that)
 * - then gates by user onboarding state from GET /users/me
 */
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const { me, loading, err } = useMe(true);

  if (loading && !me) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>Loading...</div>
    );
  }

  if (err && !me) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui", color: "crimson" }}>
        Failed to load user: {err}
      </div>
    );
  }

  if (!me) return null;

  if (!me.termsAcceptedAt) {
    return (
      <Navigate to="/onboarding/terms" state={{ from: loc.pathname }} replace />
    );
  }

  if (!me.handle || !me.avatarUrl) {
    return (
      <Navigate
        to="/onboarding/profile"
        state={{ from: loc.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
}

function TermsGatePage() {
  const nav = useNavigate();
  const loc: any = useLocation();
  const from = loc?.state?.from as string | undefined;

  const { refresh } = useMe(true);

  // IMPORTANT:
  // Don't use `me` here after `refresh()` (stale closure risk).
  // Just refresh, then route to profile setup; the OnboardingGuard will
  // let the user through if profile is already complete.
  const afterAccepted = async () => {
    await refresh();
    nav("/onboarding/profile", { replace: true, state: { from } });
  };

  return <TermsGate onAccepted={afterAccepted} />;
}

function ProfileSetupPage() {
  const nav = useNavigate();
  const loc: any = useLocation();
  const from = loc?.state?.from as string | undefined;

  const { me, refresh, loading } = useMe(true);

  if (loading && !me) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>Loading...</div>
    );
  }

  if (!me) return null;

  const afterDone = async () => {
    await refresh();
    nav(from || "/feed", { replace: true });
  };

  return <ProfileSetup me={me} onDone={afterDone} />;
}

function StageFeedbackWidgetGuard() {
  const location = useLocation();

  if (location.pathname === "/feed") {
    return null;
  }

  return <StageFeedbackWidget />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SelectedCourseProvider>
          <Routes>
            {/* Public landing (no shell) */}
            <Route path="/" element={<LandingPage />} />

            {/* Everything inside the shell */}
            <Route element={<AppShell />}>
              {/* Public map */}
              <Route path="/map" element={<CoursesMap />} />

              {/* Onboarding routes (must be authenticated) */}
              <Route
                path="/onboarding/terms"
                element={
                  <ProtectedRoute>
                    <TermsGatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/onboarding/profile"
                element={
                  <ProtectedRoute>
                    <ProfileSetupPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected + Onboarding-gated feed */}
              <Route
                path="/feed"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <FeedPage />
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <UserSearchPage />
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/destinations"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <DestinationsPage />
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              />

              <Route path="/destinations/:slug" element={<DestinationPage />} />

              {/* Following courses */}
              <Route
                path="/following"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <FollowingCoursesPage />
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              />

              {/* Course detail */}
              <Route
                path="/courses/:courseId"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <CoursePage />
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              />

              {/* Follow Requests */}
              <Route
                path="/follow-requests"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <FollowRequestsPage />
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/feedback-admin"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <FeedbackAdminPage />
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              />

              {/* Optional legacy compose */}
              <Route
                path="/compose/:courseId"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <ComposePost />
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              />

              {/* Profile (self) */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <ProfilePage mode="me" />
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              />

              {/* Profile (other user by handle) */}

              {/* Profile by handle */}
              <Route
                path="/u/:handle"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <ProfilePage mode="handle" />
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="/home" element={<Navigate to="/map" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <StageFeedbackWidgetGuard />
        </SelectedCourseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
