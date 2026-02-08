import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const loc = useLocation();
  const { loading, isAuthenticated } = useAuth();

  // Wichtig: erst warten bis der Token aus localStorage restored ist
  if (loading) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>Loading...</div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  }

  return <>{children}</>;
}
