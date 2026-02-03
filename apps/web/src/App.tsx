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

// Onboarding (frontend)
import { useMe } from "./auth/useMe";
import TermsGate from "./onboarding/TermsGate";
import ProfileSetup from "./onboarding/ProfileSetup";

function ProfilePlaceholder() {
  return <div style={{ padding: 16, fontWeight: 900 }}>Profile (Step 4)</div>;
}

/**
 * Wrap any protected page with this:
 * - requires JWT (ProtectedRoute does that)
 * - then gates by user onboarding state from GET /users/me
 */
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const { me, loading, err } = useMe(true);

  // While loading first time
  if (loading && !me) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>Loading...</div>
    );
  }

  // If /users/me failed (token invalid etc.) -> let ProtectedRoute handle auth;
  // but show error to debug if it happens.
  if (err && !me) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui", color: "crimson" }}>
        Failed to load user: {err}
      </div>
    );
  }

  if (!me) return null;

  // Gate 1: Terms first
  if (!me.termsAcceptedAt) {
    return (
      <Navigate to="/onboarding/terms" state={{ from: loc.pathname }} replace />
    );
  }

  // Gate 2: Profile completion
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

/**
 * Page wrapper: Terms
 * - after accept -> refresh /users/me
 * - then route to profile gate (if needed) or back to where user came from
 */
function TermsGatePage() {
  const nav = useNavigate();
  const loc: any = useLocation();
  const from = loc?.state?.from as string | undefined;

  const { me, refresh } = useMe(true);

  const afterAccepted = async () => {
    await refresh();

    // After refresh, decide next step
    // If profile still incomplete -> go profile setup
    if (!me?.handle || !me?.avatarUrl) {
      nav("/onboarding/profile", { replace: true, state: { from } });
      return;
    }

    // Otherwise go back to where user came from, or default feed
    nav(from || "/feed", { replace: true });
  };

  return <TermsGate onAccepted={afterAccepted} />;
}

/**
 * Page wrapper: Profile setup
 * - after save -> refresh /users/me
 * - then go back to where user came from (or /feed)
 */
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

              {/* Profile placeholder */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <ProfilePlaceholder />
                    </OnboardingGuard>
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
