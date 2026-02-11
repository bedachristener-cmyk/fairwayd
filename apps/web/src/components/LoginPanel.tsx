import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import DevLogin from "./DevLogin";
import GoogleLoginButton from "../auth/oauth/GoogleLoginButton";

function isLocalhost() {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

export default function LoginPanel() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [msg, setMsg] = useState<string | null>(null);
  const showLocalOnly = useMemo(() => isLocalhost(), []);

  const onLoggedIn = (token: string) => {
    setMsg(null);
    login(token);
    nav("/feed");
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
        padding: 18,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Login</div>

      {msg && (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            borderRadius: 12,
            background: "rgba(255,0,0,0.06)",
            border: "1px solid rgba(255,0,0,0.18)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {msg}
        </div>
      )}

      {showLocalOnly ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <GoogleLoginButton
              onToken={(token: string) => onLoggedIn(token)}
              onError={(m: string) => setMsg(m)}
            />
          </div>

          <DevLogin onLoggedIn={(token: string) => onLoggedIn(token)} />

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Google Login is enabled on <strong>localhost</strong>. DevLogin is
            available as fallback.
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Google Login is disabled on this host in dev.
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Please open the app via <strong>http://localhost:5173</strong>.
          </div>
        </>
      )}
    </div>
  );
}
