import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const loc = useLocation();
  const { loading, isAuthenticated, token } = useAuth() as any;

  // 1) Warten bis AuthContext fertig ist (Token aus Storage geladen etc.)
  if (loading) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>Loading...</div>
    );
  }

  // 2) Erst danach entscheiden
  const authed = isAuthenticated ?? !!token;

  if (!authed) {
    return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  }

  return <>{children}</>;
}
