import React from "react";
import TermsGate from "./TermsGate";
import ProfileSetup from "./ProfileSetup";
import { useMe } from "../auth/useMe";
import { STORAGE_KEY } from "../auth/AuthContext";

// Keep token read local to web-app (no cross-imports from apps/api)
function getToken() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function AppGate({ children }: { children: React.ReactNode }) {
  const token = getToken();
  const isAuthed = Boolean(token);

  const { me, loading, err, refresh } = useMe(isAuthed);

  if (!isAuthed) {
    // Here you can render your Login / DevLogin page if you have one.
    // For now: render nothing (matches your previous behavior).
    return null;
  }

  if (loading && !me) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>Loading...</div>
    );
  }

  if (err && !me) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui", color: "crimson" }}>
        Failed to load user: {String(err)}
      </div>
    );
  }

  if (!me) return null;

  if (!me.termsAcceptedAt) {
    return <TermsGate onAccepted={refresh} />;
  }

  // Ensure string checks are safe
  const handleOk = Boolean(me.handle && me.handle.trim().length > 0);
  const avatarOk = Boolean(me.avatarUrl && me.avatarUrl.trim().length > 0);

  if (!handleOk || !avatarOk) {
    return <ProfileSetup me={me} onDone={refresh} />;
  }

  return <>{children}</>;
}
