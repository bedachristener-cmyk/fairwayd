import { getToken } from "../../../api/src/api";
import { useMe } from "../../../api/src/auth/useMe";
import TermsGate from "./TermsGate";
import ProfileSetup from "./ProfileSetup";

export default function AppGate({ children }: { children: React.ReactNode }) {
  const token = getToken();
  const isAuthed = Boolean(token);

  const { me, loading, err, refresh } = useMe(isAuthed);

  if (!isAuthed) {
    return null; // hier kommt bei dir wahrscheinlich die LoginPage oder DevLogin
  }

  if (loading && !me) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>Loading...</div>
    );
  }

  if (err && !me) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui", color: "crimson" }}>
        Failed to load user: {err}
      </div>
    );
  }

  if (!me) return null;

  if (!me.termsAcceptedAt) {
    return <TermsGate onAccepted={refresh} />;
  }

  if (!me.handle || !me.avatarUrl) {
    return <ProfileSetup me={me} onDone={refresh} />;
  }

  return <>{children}</>;
}
