import { useAuth } from "../auth/AuthContext";
import MobilePageHeader from "../components/MobilePageHeader";

export default function PrivacySecurityPage() {
  const { logout } = useAuth();

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
    </div>
  );
}
