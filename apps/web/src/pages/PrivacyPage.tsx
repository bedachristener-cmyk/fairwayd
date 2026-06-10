import type { CSSProperties } from "react";

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

export default function PrivacyPage() {
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
            Fairwayd Privacy Policy
          </h1>
          <p style={{ margin: "8px 0 0", color: "var(--sub)" }}>
            MVP version v1. Last updated June 10, 2026.
          </p>
        </div>

        <section style={sectionStyle}>
          <h2>What Fairwayd Is</h2>
          <p>
            Fairwayd is a golf travel and social planning platform. We use the
            data needed to run accounts, profiles, course discovery, posts,
            trip planning, and related service messages.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Account Data</h2>
          <p>
            We collect account information such as name, email address,
            password hash for email/password accounts, login provider details
            for OAuth accounts, email verification status, and legal acceptance
            records.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Profile And Social Data</h2>
          <p>
            Fairwayd may store your handle, avatar, profile fields, follow
            relationships, notifications, likes, comments, posts, reviews, and
            course or destination follows according to the features you use.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Trip, Course, And Image Data</h2>
          <p>
            If you use planning or posting features, we may store trip details,
            itinerary items, documents, course ratings, course submissions,
            uploaded images, and related metadata needed to display and manage
            that content.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Email Use</h2>
          <p>
            We use email for login, account verification, security, and service
            messages. We do not currently use email for marketing campaigns.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Cookies And Local Storage</h2>
          <p>
            Fairwayd uses essential browser storage such as localStorage,
            session storage, and similar mechanisms to keep you signed in,
            remember session preferences, and run the app. We do not currently
            use marketing or tracking cookies.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Sharing And Visibility</h2>
          <p>
            Content you publish or share may be visible to other users depending
            on privacy settings and feature behavior. Private trip and account
            data is used to provide the service and is not intended for public
            display unless you choose to share it.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Contact</h2>
          <p>
            For privacy questions or account requests, contact:
            privacy@fairwayd.example.
          </p>
        </section>
      </div>
    </main>
  );
}
