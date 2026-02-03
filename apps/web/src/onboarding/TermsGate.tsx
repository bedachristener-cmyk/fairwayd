import { useState } from "react";
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
        Bitte akzeptiere die Terms & Conditions, bevor du Fairwayd benutzen
        kannst. (Platzhaltertext – später ersetzen wir das durch dein echtes
        Dokument.)
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
          <p>- Du bist verantwortlich für Inhalte, die du postest.</p>
          <p>- Bilder müssen deine Rechte respektieren.</p>
          <p>
            - Wir können Terms updaten; dann brauchst du ggf. eine neue
            Zustimmung.
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
