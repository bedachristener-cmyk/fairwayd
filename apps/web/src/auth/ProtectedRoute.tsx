import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, token } = useAuth();

  // solange wir initialisieren / me prüfen: nicht redirecten
  if (loading) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>Loading...</div>
    );
  }

  // einzig verlässliches Kriterium hier: token vorhanden
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
