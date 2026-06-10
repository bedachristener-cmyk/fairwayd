import { useState } from "react";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import MobilePageHeader from "../components/MobilePageHeader";

export default function PrivacySecurityPage() {
  const { logout, token } = useAuth();
  const { me } = useMe(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxSizing: "border-box",
    width: "100%",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 800,
    color: "var(--text)",
    margin: 0,
  };

  const textStyle: React.CSSProperties = {
    fontSize: 14,
    lineHeight: 1.5,
    color: "var(--sub)",
    margin: 0,
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 0",
    borderTop: "1px solid var(--border)",
    flexWrap: "wrap",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text)",
    margin: 0,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--sub)",
    margin: 0,
    textAlign: "right",
    wordBreak: "break-word",
  };

  const primaryButtonStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  };

  const secondaryButtonStyle: React.CSSProperties = {
    width: "100%",
    border: "1px dashed var(--border)",
    background: "transparent",
    color: "var(--sub)",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "default",
  };

  const dangerButtonStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "11px 12px",
    background: "var(--bg)",
    color: "var(--text)",
    font: "inherit",
  };

  const changePassword = async () => {
    if (passwordBusy) return;
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("New passwords do not match.");
      return;
    }

    try {
      setPasswordBusy(true);
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = Array.isArray(data?.message)
          ? data.message.join(", ")
          : typeof data?.message === "string"
            ? data.message
            : "Could not change password.";
        throw new Error(message);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg("Password changed.");
    } catch (err) {
      setPasswordMsg(
        err instanceof Error ? err.message : "Could not change password.",
      );
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "16px 12px 100px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <MobilePageHeader
        title="Privacy & Security"
        subtitle="Manage account visibility and review future safety controls."
      />

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>1. Account Privacy</h2>
        <p style={textStyle}>
          This section is display-only for now. Editing can be added later
          without changing the layout.
        </p>

        <div style={rowStyle}>
          <div style={{ minWidth: 0, flex: "1 1 220px" }}>
            <p style={labelStyle}>Profile visibility</p>
            <p style={textStyle}>
              Controls who can view your profile and posts.
            </p>
          </div>
          <p style={valueStyle}>Current setup: unchanged</p>
        </div>

        <div style={rowStyle}>
          <div style={{ minWidth: 0, flex: "1 1 220px" }}>
            <p style={labelStyle}>Follower access</p>
            <p style={textStyle}>
              Private accounts may require approval for new followers.
            </p>
          </div>
          <p style={valueStyle}>Display only</p>
        </div>

        <div style={rowStyle}>
          <div style={{ minWidth: 0, flex: "1 1 220px" }}>
            <p style={labelStyle}>Post audience</p>
            <p style={textStyle}>
              Public, followers-only and private post visibility will remain
              supported.
            </p>
          </div>
          <p style={valueStyle}>Display only</p>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>2. Safety</h2>
        <p style={textStyle}>
          Safety tools can live here later. For now, we show clear placeholders
          so the page already feels complete.
        </p>

        <div style={rowStyle}>
          <div style={{ minWidth: 0, flex: "1 1 220px" }}>
            <p style={labelStyle}>Block users</p>
            <p style={textStyle}>
              Hide a user and stop future interaction. Placeholder for future
              implementation.
            </p>
          </div>
          <p style={valueStyle}>Coming later</p>
        </div>

        <div style={rowStyle}>
          <div style={{ minWidth: 0, flex: "1 1 220px" }}>
            <p style={labelStyle}>Report content</p>
            <p style={textStyle}>
              Report posts, comments or profiles if something feels wrong.
            </p>
          </div>
          <p style={valueStyle}>Coming later</p>
        </div>

        <button style={secondaryButtonStyle} type="button">
          Block / Report tools will be added here later
        </button>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>3. Account</h2>
        <p style={textStyle}>
          Core account actions stay in one clear place and remain
          mobile-friendly.
        </p>

        <button type="button" onClick={logout} style={primaryButtonStyle}>
          Log out
        </button>

        <button type="button" style={dangerButtonStyle}>
          Delete account (coming later)
        </button>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>4. Password</h2>
        {me?.hasPasswordLogin ? (
          <>
            <p style={textStyle}>
              Change the password used for email sign-in.
            </p>

            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              style={inputStyle}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              style={inputStyle}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              style={inputStyle}
            />

            {passwordMsg ? (
              <p
                style={{
                  ...textStyle,
                  color:
                    passwordMsg === "Password changed."
                      ? "var(--text)"
                      : "crimson",
                  fontWeight: 700,
                }}
              >
                {passwordMsg}
              </p>
            ) : null}

            <button
              type="button"
              onClick={changePassword}
              disabled={
                passwordBusy ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              style={{
                ...primaryButtonStyle,
                opacity:
                  passwordBusy ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                    ? 0.6
                    : 1,
                cursor:
                  passwordBusy ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                    ? "default"
                    : "pointer",
              }}
            >
              {passwordBusy ? "Changing..." : "Change password"}
            </button>
          </>
        ) : (
          <p style={textStyle}>
            This account uses Google Sign-In. Password management is handled by
            Google.
          </p>
        )}
      </section>
    </div>
  );
}
