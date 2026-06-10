import type { CSSProperties } from "react";

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

export default function TermsPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--text)",
        padding: "32px 18px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          display: "grid",
          gap: 22,
          lineHeight: 1.55,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>
            Fairwayd Terms & Conditions
          </h1>
          <p style={{ margin: "8px 0 0", color: "var(--sub)" }}>
            MVP version v1. Last updated June 10, 2026.
          </p>
        </div>

        <section style={sectionStyle}>
          <h2>About Fairwayd</h2>
          <p>
            Fairwayd is a golf travel and social planning platform for finding
            courses, following golf activity, planning trips, and sharing golf
            content with other users.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Your Account</h2>
          <p>
            You are responsible for keeping your account secure and for the
            activity that happens through it. Use accurate registration
            information and do not share access to your account with others.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Acceptable Use</h2>
          <p>
            Do not misuse Fairwayd, interfere with the service, scrape it at
            scale, impersonate others, post unlawful content, or harass other
            users. We may remove content or restrict accounts that harm the
            service or community.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>User Content</h2>
          <p>
            You remain responsible for posts, images, reviews, trip details, and
            other content you upload. Only upload content you have the right to
            share. By posting content, you allow Fairwayd to display it as part
            of the service.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Information Accuracy</h2>
          <p>
            Course, travel, location, pricing, and availability information may
            be incomplete, outdated, or user-generated. Fairwayd does not
            guarantee the accuracy of travel or course information. Always
            confirm important details directly with the course, venue, provider,
            or travel operator.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Liability</h2>
          <p>
            Fairwayd is provided as-is for planning and social use. To the
            fullest extent allowed by law, Fairwayd is not liable for indirect
            losses, travel disruption, inaccurate course information, user
            content, or decisions made based on information in the app.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Contact</h2>
          <p>For legal or account questions, contact: legal@fairwayd.golf.</p>
        </section>
      </div>
    </main>
  );
}
