import { useEffect, useState, type CSSProperties } from "react";
import { ExternalLink, MapPinned } from "lucide-react";
import { apiGet, apiPatch } from "../api/client";
import { fileUrl } from "../api/fileUrl";
import { useAuth } from "../auth/AuthContext";

type CourseSubmissionImage = {
  id: string;
  url: string;
  originalName?: string | null;
};

type CourseSubmission = {
  id: string;
  name: string;
  country: string;
  city?: string | null;
  region?: string | null;
  website?: string | null;
  lat?: number | null;
  lon?: number | null;
  notes?: string | null;
  status: string;
  images?: CourseSubmissionImage[];
};

const pageStyle: CSSProperties = {
  width: "100%",
  maxWidth: 980,
  margin: "0 auto",
  padding: "16px 12px 96px",
  boxSizing: "border-box",
  color: "var(--text)",
};

const cardStyle: CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--card)",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
  display: "grid",
  gap: 12,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "var(--sub)",
  textTransform: "uppercase",
  letterSpacing: 0,
};

const valueStyle: CSSProperties = {
  fontSize: 14,
  color: "var(--text)",
  lineHeight: 1.4,
  overflowWrap: "anywhere",
};

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>
        {value === null || value === "" || value === undefined ? "-" : value}
      </div>
    </div>
  );
}

function getMapsUrl(submission: CourseSubmission) {
  if (
    typeof submission.lat === "number" &&
    typeof submission.lon === "number"
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${submission.lat},${submission.lon}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [submission.name, submission.city, submission.region, submission.country]
      .filter(Boolean)
      .join(" "),
  )}`;
}

export default function CourseSubmissionsAdminPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<CourseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;

    async function run() {
      if (!token) return;

      try {
        setLoading(true);
        setErr("");
        const data = await apiGet<CourseSubmission[]>("/course-submissions", {
          token,
          query: { status: "PENDING" },
        });
        if (active) setItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Course submissions load failed", error);
        if (active) setErr("Failed to load course submissions.");
      } finally {
        if (active) setLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [token]);

  async function moderate(id: string, action: "approve" | "reject") {
    if (!token || busyId) return;

    const previous = items;
    setBusyId(id);
    setErr("");
    setItems((current) => current.filter((item) => item.id !== id));

    try {
      await apiPatch(`/course-submissions/${id}/${action}`, { token });
    } catch (error) {
      console.error(`Course submission ${action} failed`, error);
      setItems(previous);
      setErr(`Could not ${action} this course submission.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: "grid", gap: 4, marginBottom: 18 }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            lineHeight: 1.1,
          }}
        >
          Course Submissions
        </div>
        <div style={{ color: "var(--sub)", fontSize: 14, lineHeight: 1.45 }}>
          Review pending course suggestions before they enter Fairwayd.
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : err ? (
        <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div style={{ color: "var(--sub)" }}>No pending course submissions.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {items.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      lineHeight: 1.15,
                      minWidth: 0,
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      flex: "0 0 auto",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--sub)",
                      borderRadius: 999,
                      padding: "5px 9px",
                      fontSize: 11,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {item.status}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
                    gap: 10,
                  }}
                >
                  <Field label="Country" value={item.country} />
                  <Field label="City" value={item.city} />
                  <Field label="Region" value={item.region} />
                  <Field
                    label="Lat/Lon"
                    value={
                      typeof item.lat === "number" &&
                      typeof item.lon === "number"
                        ? `${item.lat}, ${item.lon}`
                        : null
                    }
                  />
                </div>

                <Field label="Website" value={item.website} />
                <Field label="Notes" value={item.notes} />

                {item.images?.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={labelStyle}>Images</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(112px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {item.images.map((image, index) => (
                        <a
                          key={image.id}
                          href={fileUrl(image.url)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "block",
                            borderRadius: 12,
                            overflow: "hidden",
                            border: "1px solid var(--border)",
                            background: "var(--bg)",
                          }}
                        >
                          <img
                            src={fileUrl(image.url)}
                            alt={
                              image.originalName ||
                              `${item.name} submission image ${index + 1}`
                            }
                            style={{
                              width: "100%",
                              aspectRatio: "1 / 1",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => moderate(item.id, "approve")}
                  style={primaryButtonStyle}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => moderate(item.id, "reject")}
                  style={secondaryButtonStyle}
                >
                  Reject
                </button>
                <a
                  href={getMapsUrl(item)}
                  target="_blank"
                  rel="noreferrer"
                  style={mapsButtonStyle}
                >
                  <MapPinned size={16} strokeWidth={2.2} />
                  Maps
                  <ExternalLink size={14} strokeWidth={2.2} />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const buttonBaseStyle: CSSProperties = {
  minHeight: 42,
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  textAlign: "center",
  boxSizing: "border-box",
};

const primaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: "1px solid var(--text)",
  background: "var(--text)",
  color: "var(--bg)",
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
};

const mapsButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};
