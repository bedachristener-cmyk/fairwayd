import { BrowserRouter, Routes, Route } from "react-router-dom";
import CoursesMap from "./components/CoursesMap";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import ComposePost from "./pages/ComposePost";
import FeedPage from "./pages/FeedPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<CoursesMap />} />

          {/* Protected: compose post (REST-like) */}
          <Route
            path="/compose/:courseId"
            element={
              <ProtectedRoute>
                <ComposePost />
              </ProtectedRoute>
            }
          />

          {/* Protected: feed */}
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <FeedPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
