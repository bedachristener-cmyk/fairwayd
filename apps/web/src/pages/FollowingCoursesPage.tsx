import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { useSelectedCourse } from "../state/SelectedCourseContext";

type Course = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  postalCode?: string | null;
  website?: string | null;
  holes?: number | null;
  access?: string | null;
};

export default function FollowingCoursesPage() {
  const nav = useNavigate();
  const { token, loading, isAuthenticated } = useAuth();
  const { setSelectedCourse } = useSelectedCourse();

  const [items, setItems] = useState<Course[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) return;

      try {
        setBusy(true);
        setErr(null);

        const res = await fetch(`${API_BASE}/courses/me/following`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} ${t}`.trim());
        }

        const data = await res.json();

        // Backend kann entweder direkt Course[] liefern oder { items: Course[] }
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        if (!cancelled) {
          setItems(list);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? "Failed to load followed courses");
          setItems([]);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const headerText = useMemo(() => {
    if (busy) return "Following Courses";
    if (items.length === 1) return "Following Courses · 1";
    return `Following Courses · ${items.length}`;
  }, [busy, items.length]);

  if (loading) {
    return <div style={{ padding: 16, color: "var(--sub)" }}>Lädt Auth…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: 16 }}>
        Bitte einloggen, um deine gefolgten Courses zu sehen.
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 950, fontSize: 18 }}>{headerText}</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link
            to="/courses"
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              fontSize: 12,
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Courses
          </Link>

          <Link
            to="/feed"
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              fontSize: 12,
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Back
          </Link>
        </div>
      </div>

      {busy ? (
        <div style={{ color: "var(--sub)", fontSize: 13 }}>Lädt…</div>
      ) : null}

      {err ? (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: "rgba(255,0,0,.08)",
            border: "1px solid var(--border)",
            fontSize: 13,
          }}
        >
          <b>Error:</b> {err}
        </div>
      ) : null}

      {items.length === 0 && !err && !busy ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ color: "var(--sub)", fontSize: 13 }}>
            Du folgst noch keinen Courses.
          </div>

          <Link
            to="/courses"
            style={{
              width: "fit-content",
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              fontSize: 12,
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Courses entdecken
          </Link>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((c) => {
            const loc = [c.city, c.region, c.country]
              .filter(Boolean)
              .join(", ");
            const web = c.website ? c.website.replace(/^https?:\/\//, "") : "";

            return (
              <div
                key={c.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontWeight: 950 }}>{c.name}</div>

                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCourse(c);
                        nav("/feed");
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text)",
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Select
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCourse(c);
                        nav("/map");
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text)",
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Open Map
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                  {loc ? (
                    <div style={{ color: "var(--sub)" }}>{loc}</div>
                  ) : null}

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {typeof c.holes === "number" ? (
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          background: "var(--muted)",
                          fontWeight: 900,
                          fontSize: 12,
                        }}
                      >
                        {c.holes} holes
                      </span>
                    ) : null}

                    {c.access ? (
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          background: "var(--muted)",
                          fontWeight: 900,
                          fontSize: 12,
                        }}
                      >
                        {String(c.access).toUpperCase()}
                      </span>
                    ) : null}

                    {web ? (
                      <a
                        href={c.website!}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          fontWeight: 900,
                          fontSize: 12,
                          color: "var(--text)",
                          textDecoration: "underline",
                        }}
                      >
                        {web}
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
