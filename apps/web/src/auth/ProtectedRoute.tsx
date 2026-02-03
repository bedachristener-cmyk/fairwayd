import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { loading, isAuthenticated } = useAuth();
  const loc = useLocation();

  if (loading) return <div style={{ padding: 20 }}>Checking session…</div>;

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  }

  return children;
}
