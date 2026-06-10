import { useState } from "react";
import { Link } from "react-router-dom";
import { apiPostJson } from "../api";

export default function TermsGate({
  onAccepted,
}: {
  onAccepted: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const accept = async () => {
    setMsg(null);
    try {
      setBusy(true);
      await apiPostJson("/users/me/accept-terms", { termsVersion: "v1" });
      await onAccepted();
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to accept terms");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Terms & Conditions</h1>
      <p style={{ opacity: 0.85, lineHeight: 1.5 }}>
        Please accept the Fairwayd Terms & Conditions and Privacy Policy before
        continuing.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6 }}>
          <p>
            Fairwayd is a golf travel and social planning platform. You are
            responsible for your account, the content you post, and confirming
            important travel or course information directly with providers.
          </p>
          <p>
            Read the{" "}
            <Link to="/terms" style={{ fontWeight: 800, color: "inherit" }}>
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link to="/privacy" style={{ fontWeight: 800, color: "inherit" }}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {msg && (
          <div style={{ marginTop: 12, color: "crimson", fontWeight: 700 }}>
            {msg}
          </div>
        )}

        <button
          onClick={accept}
          disabled={busy}
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            fontWeight: 800,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Accepting..." : "Accept & Continue"}
        </button>
      </div>
    </div>
  );
}
