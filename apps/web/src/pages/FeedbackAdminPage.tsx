import { useEffect, useState, type CSSProperties } from "react";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

type FeedbackItem = {
  id: string;
  message: string;
  category?: string | null;
  url?: string | null;
  device?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    handle?: string | null;
  } | null;
};

function getCategoryBadgeStyle(category?: string | null): CSSProperties {
  const base: CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid transparent",
    textTransform: "capitalize",
    lineHeight: 1,
  };

  switch ((category || "other").toLowerCase()) {
    case "bug":
      return {
        ...base,
        background: "rgba(220, 38, 38, 0.10)",
        color: "#b42318",
        borderColor: "rgba(220, 38, 38, 0.18)",
      };
    case "ui":
      return {
        ...base,
        background: "rgba(37, 99, 235, 0.10)",
        color: "#1d4ed8",
        borderColor: "rgba(37, 99, 235, 0.18)",
      };
    case "idea":
      return {
        ...base,
        background: "rgba(22, 163, 74, 0.10)",
        color: "#15803d",
        borderColor: "rgba(22, 163, 74, 0.18)",
      };
    default:
      return {
        ...base,
        background: "rgba(107, 114, 128, 0.10)",
        color: "#4b5563",
        borderColor: "rgba(107, 114, 128, 0.18)",
      };
  }
}

function getDeviceBadgeStyle(): CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--sub)",
    textTransform: "capitalize",
    lineHeight: 1,
  };
}

export default function FeedbackAdminPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;

    async function run() {
      if (!token) return;

      try {
        setLoading(true);
        setErr("");

        const res = await fetch(`${API_BASE}/feedback`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Failed to load feedback ${res.status} ${body}`);
        }

        const data = await res.json();
        if (!active) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Feedback load failed", e);
        if (!active) return;
        setErr("Failed to load feedback.");
      } finally {
        if (active) setLoading(false);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "20px 20px 96px",
        color: "var(--text)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 4,
          }}
        >
          Feedback Admin
        </div>
        <div style={{ color: "var(--sub)", fontSize: 14 }}>
          Feedback from stage testers.
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : err ? (
        <div style={{ color: "crimson" }}>{err}</div>
      ) : items.length === 0 ? (
        <div>No feedback yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid var(--border)",
                background: "var(--card)",
                borderRadius: 18,
                padding: 16,
                boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    {item.user?.handle
                      ? `@${item.user.handle}`
                      : "Unknown user"}
                  </div>

                  <div style={getCategoryBadgeStyle(item.category)}>
                    {item.category || "other"}
                  </div>

                  {item.device ? (
                    <div style={getDeviceBadgeStyle()}>{item.device}</div>
                  ) : null}
                </div>

                <div style={{ fontSize: 12, color: "var(--sub)" }}>
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                {item.message}
              </div>

              {item.url ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--sub)",
                    wordBreak: "break-all",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    marginBottom: item.userAgent ? 8 : 0,
                  }}
                >
                  {item.url}
                </div>
              ) : null}

              {item.userAgent ? (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--sub)",
                    wordBreak: "break-all",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    lineHeight: 1.45,
                  }}
                >
                  {item.userAgent}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
