import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import CourseRatingSummary from "../components/CourseRatingSummary";
import PostCard from "../components/PostCard";
import { getCourseRatingSummary } from "../data/courseRatings";

type Post = {
  id: string;
  content: string;
  createdAt: string;
  visibility?: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  course: {
    id: string;
    name: string;
    lat: number;
    lon: number;
  };
  user: {
    id: string;
    handle: string;
  };
  images?: { id: string; url: string }[];
};

type Course = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  website?: string | null;
  holes?: number | null;
  par?: number | null;
  access?: string | null;
};

type DraftRating = {
  overall: number;
  condition: number;
  layout: number;
  scenery: number;
  value: number;
};

function clampRating(value: number) {
  return Math.min(5, Math.max(1, value));
}

function roundToStep(value: number, step = 0.2) {
  return Math.round(value / step) * step;
}

function formatRatingValue(value: number) {
  return value.toFixed(1);
}

function getStarFillPercent(starIndex: number, value: number) {
  const fill = Math.max(0, Math.min(1, value - starIndex));
  return fill * 100;
}

function StarRatingPreview({ value }: { value: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        lineHeight: 1,
      }}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const fillPercent = getStarFillPercent(index, value);

        return (
          <span
            key={index}
            style={{
              position: "relative",
              display: "inline-block",
              width: 18,
              height: 18,
              fontSize: 18,
              lineHeight: "18px",
            }}
          >
            <span
              style={{
                color: "var(--muted)",
              }}
            >
              ★
            </span>

            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: `${fillPercent}%`,
                overflow: "hidden",
                whiteSpace: "nowrap",
                color: "var(--green)",
              }}
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

function RatingSliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const fillPercent = ((value - 1) / 4) * 100;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 0",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "var(--text)",
          }}
        >
          {label}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <StarRatingPreview value={value} />
          <div
            style={{
              minWidth: 34,
              textAlign: "right",
              fontSize: 14,
              fontWeight: 800,
              color: "var(--text)",
            }}
          >
            {formatRatingValue(value)}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: 28,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 8,
            borderRadius: 999,
            background: "var(--muted)",
            border: "1px solid var(--border)",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: `${fillPercent}%`,
              height: "100%",
              background: "var(--text)",
              opacity: 0.18,
            }}
          />
        </div>

        <input
          type="range"
          min={1}
          max={5}
          step={0.2}
          value={value}
          onChange={(e) =>
            onChange(clampRating(roundToStep(Number(e.target.value), 0.2)))
          }
          style={{
            width: "100%",
            margin: 0,
            position: "relative",
            zIndex: 1,
            appearance: "none",
            WebkitAppearance: "none",
            background: "transparent",
            cursor: "pointer",
            height: 28,
          }}
        />

        <style>
          {`
            input[type="range"]::-webkit-slider-runnable-track {
              height: 8px;
              background: transparent;
              border: none;
              border-radius: 999px;
            }

            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              margin-top: -5px;
              border-radius: 999px;
              background: var(--card);
              border: 2px solid var(--text);
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
            }

            input[type="range"]::-moz-range-track {
              height: 8px;
              background: transparent;
              border: none;
              border-radius: 999px;
            }

            input[type="range"]::-moz-range-thumb {
              width: 18px;
              height: 18px;
              border-radius: 999px;
              background: var(--card);
              border: 2px solid var(--text);
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
            }
          `}
        </style>
      </div>
    </div>
  );
}

function normalizeWebsite(url?: string | null) {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const nav = useNavigate();
  const { token } = useAuth();

  const isMobile = window.innerWidth <= 980;

  const secondaryBtnStyle = {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text)",
    fontWeight: 800,
    cursor: "pointer",
  } as const;
  const [course, setCourse] = useState<Course | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [showRatingPanel, setShowRatingPanel] = useState(false);
  const [draftRating, setDraftRating] = useState<DraftRating>({
    overall: 4.0,
    condition: 4.0,
    layout: 4.0,
    scenery: 4.0,
    value: 4.0,
  });

  const ratingSummary = getCourseRatingSummary(course?.id);

  // Load course + posts
  useEffect(() => {
    if (!courseId) return;

    const run = async () => {
      try {
        setLoading(true);

        // ✅ Course IMMER laden (ohne Token)
        const cRes = await fetch(`${API_BASE}/courses/${courseId}`);
        if (cRes.ok) {
          const c = await cRes.json();
          setCourse(c);
        }

        // ✅ Follow nur wenn eingeloggt
        if (token) {
          const fRes = await fetch(
            `${API_BASE}/courses/${courseId}/following`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (fRes.ok) {
            const f = await fRes.json();
            setFollowing(!!f?.following);
          }
        }

        // ✅ Posts (optional public später)

        const pRes = await fetch(`${API_BASE}/posts/course/${courseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (pRes.ok) {
          const data = await pRes.json();

          const nextPosts = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.posts)
                ? data.posts
                : [];

          setPosts(nextPosts);
        }
      } catch (err) {
        console.error("Course page load failed", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [courseId, token]);

  useEffect(() => {
    if (!ratingSummary) return;

    setDraftRating({
      overall: ratingSummary.overall,
      condition: ratingSummary.breakdown.condition,
      layout: ratingSummary.breakdown.layout,
      scenery: ratingSummary.breakdown.scenery,
      value: ratingSummary.breakdown.value,
    });
  }, [ratingSummary]);

  const draftAverage = useMemo(() => {
    const average =
      (draftRating.overall +
        draftRating.condition +
        draftRating.layout +
        draftRating.scenery +
        draftRating.value) /
      5;

    return roundToStep(average, 0.2);
  }, [draftRating]);

  if (loading) return null;

  return (
    <div
      style={{
        display: "grid",
        gap: isMobile ? 10 : 12,
        paddingBottom: isMobile ? 16 : 0,
      }}
    >
      <div style={{ padding: isMobile ? "8px 12px 0" : 0 }}>
        <button
          type="button"
          onClick={() => nav("/map")}
          style={{
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Back to map
        </button>
      </div>

      {/* ===== HEADER ===== */}
      <div
        style={{
          padding: isMobile ? 12 : 18,
          borderRadius: 16,
          background: isMobile ? "rgba(0,0,0,0.03)" : "var(--card)",
          border: isMobile ? "none" : "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontSize: isMobile ? 20 : 24,
            fontWeight: 900,
            lineHeight: 1.2,
          }}
        >
          ⛳ {course?.name ?? "Course"}
        </div>

        <div style={{ fontSize: 13, color: "var(--sub)", marginTop: 4 }}>
          {[course?.city, course?.region, course?.country]
            .filter(Boolean)
            .join(", ")}
        </div>
        {(course?.holes || course?.par || course?.access) && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            {course?.holes ? (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                🏌️ {course.holes} holes
              </span>
            ) : null}

            {course?.par ? (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Par {course.par}
              </span>
            ) : null}

            {course?.access ? (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {course.access}
              </span>
            ) : null}
          </div>
        )}

        {normalizeWebsite(course?.website) && (
          <div style={{ marginTop: 10 }}>
            <a
              href={normalizeWebsite(course?.website)!}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--green)",
                textDecoration: "none",
                wordBreak: "break-word",
              }}
            >
              🌐 Visit website ↗
            </a>
          </div>
        )}

        {/* Guest sign-in banner */}
        {!token && (
          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800 }}>
              🔒 Sign in to unlock full experience
            </div>

            <div
              style={{
                fontSize: 13,
                color: "var(--sub)",
                lineHeight: 1.5,
              }}
            >
              Follow this course, post updates and join the conversation.
            </div>

            <button
              onClick={() => nav("/")}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontWeight: 800,
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              Sign in
            </button>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={async () => {
              if (!courseId || !token || followBusy) return;

              try {
                setFollowBusy(true);

                const res = await fetch(
                  `${API_BASE}/courses/${courseId}/follow`,
                  {
                    method: following ? "DELETE" : "POST",
                    headers: { Authorization: `Bearer ${token}` },
                  },
                );

                if (!res.ok) {
                  throw new Error(`Follow toggle failed: ${res.status}`);
                }

                setFollowing((prev) => !prev);
              } catch (err) {
                console.error("Course follow toggle failed", err);
              } finally {
                setFollowBusy(false);
              }
            }}
            disabled={followBusy}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: following ? "rgba(0,0,0,0.06)" : "var(--card)",
              color: "var(--text)",
              fontWeight: 800,
              cursor: followBusy ? "default" : "pointer",
              opacity: followBusy ? 0.7 : 1,
              boxShadow: "none",
            }}
          >
            {followBusy ? "Saving..." : following ? "✓ Following" : "+ Follow"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!course) return;

              nav("/feed", {
                state: {
                  focusCourse: {
                    id: course.id,
                    name: course.name,
                    lat: course.lat,
                    lon: course.lon,
                  },
                },
              });
            }}
            style={secondaryBtnStyle}
          >
            Post here
          </button>
        </div>
      </div>

      <CourseRatingSummary
        rating={ratingSummary}
        canRate={!!token}
        ctaLabel={showRatingPanel ? "Hide rating form" : undefined}
        onRateClick={() => {
          if (!token) {
            nav("/");
            return;
          }

          setShowRatingPanel((prev) => !prev);
        }}
      />

      {showRatingPanel && !!token && (
        <section
          style={{
            padding: 16,
            borderRadius: 16,
            background: "var(--card)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--text)",
                }}
              >
                Rate this course
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  color: "var(--sub)",
                  lineHeight: 1.5,
                }}
              >
                Prototype only for now. Move the sliders and see how the stars
                react live.
              </div>
            </div>

            <div
              style={{
                minWidth: 76,
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "var(--text)",
                }}
              >
                {formatRatingValue(draftAverage)}
              </div>

              <div
                style={{
                  marginTop: 6,
                }}
              >
                <StarRatingPreview value={draftAverage} />
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 8,
              borderTop: "1px solid var(--border)",
            }}
          >
            <RatingSliderRow
              label="Overall"
              value={draftRating.overall}
              onChange={(next) =>
                setDraftRating((prev) => ({ ...prev, overall: next }))
              }
            />

            <RatingSliderRow
              label="Condition"
              value={draftRating.condition}
              onChange={(next) =>
                setDraftRating((prev) => ({ ...prev, condition: next }))
              }
            />

            <RatingSliderRow
              label="Layout"
              value={draftRating.layout}
              onChange={(next) =>
                setDraftRating((prev) => ({ ...prev, layout: next }))
              }
            />

            <RatingSliderRow
              label="Scenery"
              value={draftRating.scenery}
              onChange={(next) =>
                setDraftRating((prev) => ({ ...prev, scenery: next }))
              }
            />

            <RatingSliderRow
              label="Value"
              value={draftRating.value}
              onChange={(next) =>
                setDraftRating((prev) => ({ ...prev, value: next }))
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 14,
            }}
          >
            <button
              type="button"
              onClick={() => {
                alert("Save comes in the backend step.");
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Save rating
            </button>

            <button
              type="button"
              onClick={() => {
                if (ratingSummary) {
                  setDraftRating({
                    overall: ratingSummary.overall,
                    condition: ratingSummary.breakdown.condition,
                    layout: ratingSummary.breakdown.layout,
                    scenery: ratingSummary.breakdown.scenery,
                    value: ratingSummary.breakdown.value,
                  });
                } else {
                  setDraftRating({
                    overall: 4.0,
                    condition: 4.0,
                    layout: 4.0,
                    scenery: 4.0,
                    value: 4.0,
                  });
                }

                setShowRatingPanel(false);
              }}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* ===== POSTS ===== */}
      <div style={{ display: "grid", gap: 10 }}>
        {posts.length === 0 ? (
          <div
            style={{
              color: "var(--sub)",
              fontSize: 13,
              padding: 16,
              border: "1px solid var(--border)",
              borderRadius: 14,
              background: "var(--card)",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: 18, marginBottom: 8, color: "var(--text)" }}
            >
              {!token
                ? "Noch keine öffentlichen Posts verfügbar"
                : "Noch keine Posts zu diesem Platz"}
            </div>

            <div style={{ opacity: 0.85, lineHeight: 1.5 }}>
              Sei der Erste und teile etwas zu diesem Golfplatz.
            </div>
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} isMobile={isMobile} />)
        )}
      </div>
    </div>
  );
}
