import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import MobilePageHeader from "../components/MobilePageHeader";

type ReportStatus = "OPEN" | "REVIEWED" | "DISMISSED";
type ReportFilter = ReportStatus | "ALL";
type ReportTargetType = "POST" | "COMMENT" | "PROFILE" | "OTHER";

type Person = {
  id: string;
  handle?: string | null;
  name?: string | null;
};

type ReportTarget = {
  id: string;
  postId?: string;
  content?: string;
  createdAt?: string;
  handle?: string | null;
  name?: string | null;
  user?: Person;
  course?: { id: string; name: string };
};

type ContentReport = {
  id: string;
  targetType: ReportTargetType;
  targetId?: string | null;
  targetUrl?: string | null;
  reason: string;
  details?: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reporter: Person;
  target?: ReportTarget | null;
  targetExists: boolean;
};

const cardStyle: CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--card)",
  borderRadius: 18,
  padding: 16,
  display: "grid",
  gap: 12,
  boxShadow: "0 10px 26px rgba(0,0,0,0.06)",
};

const buttonStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--bg)",
  color: "var(--text)",
  minHeight: 40,
  padding: "9px 13px",
  fontWeight: 750,
  cursor: "pointer",
};

function personLabel(person?: Person | null) {
  if (!person) return "Unknown";
  return person.name?.trim() || (person.handle ? `@${person.handle}` : person.id);
}

function statusColour(status: ReportStatus) {
  if (status === "OPEN") return "#d97706";
  if (status === "REVIEWED") return "#15803d";
  return "var(--sub)";
}

function internalTargetLink(report: ContentReport) {
  if (report.targetType === "POST" && report.targetId) {
    return `/feed?postId=${encodeURIComponent(report.targetId)}&comment=1`;
  }
  if (report.targetType === "COMMENT" && report.target?.postId) {
    return `/feed?postId=${encodeURIComponent(report.target.postId)}&comment=1`;
  }
  if (report.targetType === "PROFILE" && report.target?.handle) {
    return `/u/${encodeURIComponent(report.target.handle)}`;
  }
  return null;
}

export default function ContentReportsAdminPage() {
  const { token } = useAuth();
  const [filter, setFilter] = useState<ReportFilter>("OPEN");
  const [items, setItems] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const authFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof data?.message === "string"
            ? data.message
            : `Request failed (${response.status})`;
        throw new Error(message);
      }
      return data;
    },
    [token],
  );

  const loadReports = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const data = await authFetch(
        `/safety/admin/reports?status=${encodeURIComponent(filter)}`,
      );
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, filter, token]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function updateStatus(id: string, status: "REVIEWED" | "DISMISSED") {
    try {
      setBusyId(id);
      setError("");
      await authFetch(`/safety/admin/reports/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Moderation failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeTarget(report: ContentReport) {
    const label = report.targetType === "POST" ? "post" : "comment";
    if (
      !window.confirm(
        `Permanently remove this reported ${label}? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setBusyId(report.id);
      setError("");
      await authFetch(
        `/safety/admin/reports/${encodeURIComponent(report.id)}/target`,
        { method: "DELETE" },
      );
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Content removal failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "12px 16px 96px",
        boxSizing: "border-box",
        color: "var(--text)",
      }}
    >
      <MobilePageHeader title="Content reports" />

      <div style={{ margin: "12px 0 18px" }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>
          Content reports
        </h1>
        <p style={{ margin: "7px 0 0", color: "var(--sub)", lineHeight: 1.5 }}>
          Review reported posts, comments and profiles. Removing content is
          permanent; resolving or dismissing only closes the report.
        </p>
      </div>

      <div
        className="fw-segmented"
        style={{ width: "100%", marginBottom: 16 }}
        aria-label="Report status"
      >
        {(["OPEN", "REVIEWED", "DISMISSED", "ALL"] as ReportFilter[]).map(
          (status) => (
            <button
              key={status}
              type="button"
              className={
                filter === status
                  ? "fw-segmented__item fw-segmented__item--active"
                  : "fw-segmented__item"
              }
              onClick={() => setFilter(status)}
              style={{ flex: 1 }}
            >
              {status === "OPEN"
                ? "Open"
                : status === "REVIEWED"
                  ? "Resolved"
                  : status === "DISMISSED"
                    ? "Dismissed"
                    : "All"}
            </button>
          ),
        )}
      </div>

      {error ? (
        <div
          style={{
            border: "1px solid color-mix(in srgb, var(--danger) 45%, var(--border))",
            background: "var(--danger-soft)",
            color: "var(--danger)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div style={{ color: "var(--sub)" }}>Loading reports…</div>
      ) : items.length === 0 ? (
        <div style={cardStyle}>No reports in this status.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {items.map((report) => {
            const internalLink = internalTargetLink(report);
            const canRemove =
              report.targetExists &&
              (report.targetType === "POST" ||
                report.targetType === "COMMENT");
            const busy = busyId === report.id;
            const content =
              report.target?.content?.trim() ||
              (report.targetType === "PROFILE"
                ? personLabel(report.target)
                : report.targetExists
                  ? "Referenced content"
                  : "The referenced content no longer exists.");

            return (
              <article key={report.id} style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className="fw-pill fw-pill--meta fw-pill--info">
                      {report.targetType}
                    </span>
                    <span className="fw-pill fw-pill--meta fw-pill--info">
                      {report.reason}
                    </span>
                    <span
                      className="fw-pill fw-pill--meta"
                      style={{
                        borderColor: statusColour(report.status),
                        color: statusColour(report.status),
                      }}
                    >
                      {report.status}
                    </span>
                  </div>
                  <time style={{ color: "var(--sub)", fontSize: 12 }}>
                    {new Date(report.createdAt).toLocaleString()}
                  </time>
                </div>

                <div
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 12,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 5 }}>
                    {report.target?.user
                      ? personLabel(report.target.user)
                      : report.targetType === "PROFILE"
                        ? personLabel(report.target)
                        : report.targetType}
                  </div>
                  <div>{content}</div>
                  {report.target?.course?.name ? (
                    <div style={{ color: "var(--sub)", marginTop: 7 }}>
                      ⛳ {report.target.course.name}
                    </div>
                  ) : null}
                </div>

                {report.details ? (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>
                      Reporter details
                    </div>
                    <div style={{ color: "var(--sub)", whiteSpace: "pre-wrap" }}>
                      {report.details}
                    </div>
                  </div>
                ) : null}

                <div style={{ fontSize: 13, color: "var(--sub)" }}>
                  Reported by {personLabel(report.reporter)}
                  {report.reporter.handle ? (
                    <>
                      {" · "}
                      <Link
                        to={`/u/${encodeURIComponent(report.reporter.handle)}`}
                        style={{ color: "var(--text)" }}
                      >
                        open reporter
                      </Link>
                    </>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {internalLink ? (
                    <Link
                      to={internalLink}
                      style={{
                        ...buttonStyle,
                        display: "inline-flex",
                        alignItems: "center",
                        textDecoration: "none",
                      }}
                    >
                      Open content
                    </Link>
                  ) : report.targetUrl ? (
                    <a
                      href={report.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...buttonStyle,
                        display: "inline-flex",
                        alignItems: "center",
                        textDecoration: "none",
                      }}
                    >
                      Open reference
                    </a>
                  ) : null}

                  {report.status === "OPEN" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateStatus(report.id, "REVIEWED")}
                        style={{
                          ...buttonStyle,
                          borderColor: "color-mix(in srgb, var(--green) 65%, var(--border))",
                        }}
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateStatus(report.id, "DISMISSED")}
                        style={buttonStyle}
                      >
                        Dismiss
                      </button>
                      {canRemove ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeTarget(report)}
                          style={{
                            ...buttonStyle,
                            borderColor: "var(--danger)",
                            color: "var(--danger)",
                          }}
                        >
                          Remove content
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
