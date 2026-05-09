import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { API_BASE } from "../api/base";
import { apiGet } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type HistoryFilter = "ALL" | "APPROVED" | "REJECTED";

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
  status: "APPROVED" | "REJECTED" | string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: {
    id: string;
    handle?: string | null;
    name?: string | null;
  } | null;
  images?: CourseSubmissionImage[];
};

const apiOrigin = API_BASE.replace(/\/api\/?$/, "");

function submissionImageUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/uploads")) return `${apiOrigin}${url}`;
  return url;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

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

export default function CourseSubmissionHistoryAdminPage() {
  const { token } = useAuth();
  const [filter, setFilter] = useState<HistoryFilter>("ALL");
  const [items, setItems] = useState<CourseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;

    async function run() {
      if (!token) return;

      try {
        setLoading(true);
        setErr("");

        const [approved, rejected] = await Promise.all([
          apiGet<CourseSubmission[]>("/course-submissions", {
            token,
            query: { status: "APPROVED" },
          }),
          apiGet<CourseSubmission[]>("/course-submissions", {
            token,
            query: { status: "REJECTED" },
          }),
        ]);

        if (!active) return;
        setItems(
          [...(approved ?? []), ...(rejected ?? [])].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          ),
        );
      } catch (error) {
        console.error("Course submission history load failed", error);
        if (active) setErr("Failed to load course submission history.");
      } finally {
        if (active) setLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [token]);

  const visibleItems = useMemo(
    () =>
      filter === "ALL"
        ? items
        : items.filter((item) => item.status === filter),
    [filter, items],
  );

  return (
    <div style={pageStyle}>
      <div style={{ display: "grid", gap: 4, marginBottom: 18 }}>
        <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>
          Course Submission History
        </div>
        <div style={{ color: "var(--sub)", fontSize: 14, lineHeight: 1.45 }}>
          Reviewed course suggestions that were approved or rejected.
        </div>
      </div>

      <div style={tabsStyle}>
        {(["ALL", "APPROVED", "REJECTED"] as HistoryFilter[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            style={filter === value ? activeTabStyle : tabStyle}
          >
            {value === "ALL" ? "All" : value[0] + value.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : err ? (
        <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>
      ) : null}

      {!loading && visibleItems.length === 0 ? (
        <div style={{ color: "var(--sub)" }}>No reviewed submissions found.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {visibleItems.map((item) => (
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
                  <div style={titleStyle}>{item.name}</div>
                  <div style={badgeStyle}>{item.status}</div>
                </div>

                <div style={gridStyle}>
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

                <div style={gridStyle}>
                  <Field label="Created" value={formatDate(item.createdAt)} />
                  <Field label="Updated" value={formatDate(item.updatedAt)} />
                  <Field
                    label="Submitted by"
                    value={
                      item.submittedBy?.handle
                        ? `@${item.submittedBy.handle}`
                        : item.submittedBy?.name || item.submittedBy?.id
                    }
                  />
                </div>

                {item.images?.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={labelStyle}>Images</div>
                    <div style={imageGridStyle}>
                      {item.images.map((image, index) => (
                        <a
                          key={image.id}
                          href={submissionImageUrl(image.url)}
                          target="_blank"
                          rel="noreferrer"
                          style={imageLinkStyle}
                        >
                          <img
                            src={submissionImageUrl(image.url)}
                            alt={
                              image.originalName ||
                              `${item.name} submission image ${index + 1}`
                            }
                            style={imageStyle}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

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

const titleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  lineHeight: 1.15,
  minWidth: 0,
};

const badgeStyle: CSSProperties = {
  flex: "0 0 auto",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--sub)",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
  gap: 10,
};

const tabsStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 14,
};

const tabStyle: CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  borderRadius: 999,
  padding: "9px 12px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const activeTabStyle: CSSProperties = {
  ...tabStyle,
  background: "var(--text)",
  color: "var(--bg)",
};

const imageGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
  gap: 8,
};

const imageLinkStyle: CSSProperties = {
  display: "block",
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid var(--border)",
  background: "var(--bg)",
};

const imageStyle: CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  display: "block",
};
