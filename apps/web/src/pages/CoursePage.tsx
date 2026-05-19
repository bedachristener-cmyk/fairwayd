import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import CourseRatingSummary from "../components/CourseRatingSummary";
import PostCard from "../components/PostCard";
import { getMonetizationLinksForCourse } from "../data/monetization";
import {
  saveRating,
  getMyRating,
  getRatingSummary,
  type RatingSummary,
  type MyRating,
} from "../api/ratings";

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

function createDefaultDraftRating(): DraftRating {
  return {
    overall: 4.0,
    condition: 4.0,
    layout: 4.0,
    scenery: 4.0,
    value: 4.0,
  };
}

function mapMyRatingToDraft(data: MyRating): DraftRating {
  return {
    overall: data.overall,
    condition: data.condition ?? data.overall,
    layout: data.layout ?? data.overall,
    scenery: data.scenery ?? data.overall,
    value: data.value ?? data.overall,
  };
}

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const nav = useNavigate();
  const location = useLocation();
  const { token } = useAuth();

  const isMobile = window.innerWidth <= 980;
  const ratingSectionRef = useRef<HTMLElement | null>(null);
  const ratingPanelRef = useRef<HTMLElement | null>(null);

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
  const [showDetailedRatings, setShowDetailedRatings] = useState(false);
  const [ratingSaved, setRatingSaved] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(
    null,
  );
  const [myRating, setMyRating] = useState<MyRating | null>(null);
  const [draftRating, setDraftRating] = useState<DraftRating>(
    createDefaultDraftRating(),
  );

  const monetizationLinks = getMonetizationLinksForCourse(course?.id);

  // temporary usage to avoid TS unused error (monetization prepared for later)
  void monetizationLinks;

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
    if (!course?.id) return;

    getRatingSummary(course.id)
      .then((data) => {
        setRatingSummary(data);
      })
      .catch(() => {
        setRatingSummary(null);
      });
  }, [course?.id]);

  useEffect(() => {
    if (!course?.id || !token) {
      setMyRating(null);
      setDraftRating(createDefaultDraftRating());
      setShowDetailedRatings(false);
      return;
    }

    getMyRating(course.id, token)
      .then((data) => {
        if (!data) {
          setMyRating(null);
          setDraftRating(createDefaultDraftRating());
          setShowDetailedRatings(false);
          return;
        }

        setMyRating(data);

        const nextDraft = mapMyRatingToDraft(data);
        setDraftRating(nextDraft);

        const hasDetailedRatings =
          data.condition != null ||
          data.layout != null ||
          data.scenery != null ||
          data.value != null;

        setShowDetailedRatings(hasDetailedRatings);
      })
      .catch(() => {
        setMyRating(null);
        setDraftRating(createDefaultDraftRating());
        setShowDetailedRatings(false);
      });
  }, [course?.id, token]);

  useEffect(() => {
    if (!ratingSaved) return;

    const timer = window.setTimeout(() => {
      setRatingSaved(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [ratingSaved]);

  const draftAverage = useMemo(() => {
    if (showDetailedRatings) {
      const average =
        (draftRating.condition +
          draftRating.layout +
          draftRating.scenery +
          draftRating.value) /
        4;

      return roundToStep(average, 0.2);
    }

    return roundToStep(draftRating.overall, 0.2);
  }, [draftRating, showDetailedRatings]);

  useEffect(() => {
    const state = location.state as
      | { openRating?: boolean; scrollToRating?: boolean }
      | undefined;

    const params = new URLSearchParams(location.search);

    const shouldOpen =
      state?.openRating === true ||
      params.get("openRating") === "1" ||
      params.get("openRating") === "true";

    const shouldScroll =
      state?.scrollToRating === true ||
      params.get("scrollToRating") === "1" ||
      params.get("scrollToRating") === "true";

    if (!course || !token || !shouldOpen) return;

    if (myRating) {
      const nextDraft = mapMyRatingToDraft(myRating);
      setDraftRating(nextDraft);

      const hasDetailedRatings =
        myRating.condition != null ||
        myRating.layout != null ||
        myRating.scenery != null ||
        myRating.value != null;

      setShowDetailedRatings(hasDetailedRatings);
    } else {
      setDraftRating(createDefaultDraftRating());
      setShowDetailedRatings(false);
    }

    setShowRatingPanel(true);

    if (shouldScroll) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    nav(location.pathname, { replace: true });
  }, [
    course,
    token,
    myRating,
    location.pathname,
    location.search,
    location.state,
    nav,
  ]);

  if (loading) return null;

  const locationLine = [course?.city, course?.region, course?.country]
    .filter(Boolean)
    .join(", ");
  const websiteUrl = normalizeWebsite(course?.website);
  const directionsUrl = course
    ? `https://www.google.com/maps/dir/?api=1&destination=${course.lat},${course.lon}`
    : null;
  const metadataPills = [
    course?.holes ? `${course.holes} holes` : null,
    course?.par ? `Par ${course.par}` : null,
    course?.access ? course.access.replaceAll("_", " ") : null,
  ].filter(Boolean);

  return (
    <div
      style={{
        display: "grid",
        gap: isMobile ? 14 : 16,
        paddingBottom: isMobile ? 20 : 0,
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
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
          }}
        >
          ← Back to map
        </button>
      </div>

      {/* ===== HEADER ===== */}
      <div
        style={{
          margin: isMobile ? "0 12px" : 0,
          padding: isMobile ? 16 : 22,
          borderRadius: 26,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--green) 10%, var(--card)), var(--card) 46%, color-mix(in srgb, var(--bg) 18%, var(--card)))",
          border: "1px solid var(--border)",
          boxShadow: "0 18px 42px rgba(0,0,0,0.16)",
          display: "grid",
          gap: 16,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              fontSize: isMobile ? 22 : 31,
              fontWeight: 880,
              lineHeight: 1.14,
              letterSpacing: "-0.025em",
              color: "var(--text)",
            }}
          >
            {course?.name ?? "Course"}
          </div>

          {locationLine ? (
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.4,
                color: "var(--sub)",
              }}
            >
              {locationLine}
            </div>
          ) : null}
        </div>

        {metadataPills.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: -2,
            }}
          >
            {metadataPills.map((label) => (
              <span
                key={label}
                style={{
                  minHeight: 28,
                  padding: "0 11px",
                  borderRadius: 999,
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  textTransform: label === course?.access?.replaceAll("_", " ") ? "capitalize" : undefined,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 2,
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
              minHeight: 40,
              padding: "0 14px",
              borderRadius: 16,
              border: following
                ? "1px solid var(--green)"
                : "1px solid var(--border)",
              background: following
                ? "var(--green)"
                : "var(--muted)",
              color: following ? "white" : "var(--text)",
              fontWeight: 850,
              fontSize: 13,
              cursor: followBusy ? "default" : "pointer",
              opacity: followBusy ? 0.72 : 1,
            }}
          >
            {followBusy ? "Saving..." : following ? "Following" : "Follow"}
          </button>

          {websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                minHeight: 40,
                padding: "0 14px",
                borderRadius: 16,
                border: "1px solid var(--border)",
                background: "var(--muted)",
                color: "var(--text)",
                fontWeight: 850,
                fontSize: 13,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Website
            </a>
          ) : null}

          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                minHeight: 40,
                padding: "0 14px",
                borderRadius: 16,
                border: "1px solid var(--green)",
                background: "var(--green)",
                color: "white",
                fontWeight: 900,
                fontSize: 13,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Directions
            </a>
          ) : null}

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
            style={{
              minHeight: 40,
              padding: "0 14px",
              borderRadius: 16,
              border: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--card) 72%, transparent)",
              color: "var(--text)",
              fontWeight: 850,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Post here
          </button>
        </div>

        {!token ? (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 18,
              border: "1px solid var(--border)",
              background: "var(--muted)",
              display: "grid",
              gap: 8,
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text)" }}>
              Sign in to unlock the full course experience
            </div>

            <div
              style={{
                fontSize: 13,
                color: "var(--sub)",
                lineHeight: 1.45,
              }}
            >
              Follow this course, post updates and join the conversation.
            </div>

            <button
              onClick={() => nav("/")}
              style={{
                minHeight: 38,
                padding: "0 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontWeight: 850,
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              Sign in
            </button>
          </div>
        ) : null}
      </div>

      <section ref={ratingSectionRef}>
        <CourseRatingSummary
          rating={ratingSummary}
          canRate={!!token}
          ctaLabel={
            showRatingPanel
              ? "Hide rating form"
              : myRating
                ? "Edit your rating"
                : "Rate this course"
          }
          onRateClick={() => {
            if (!token) {
              nav("/");
              return;
            }

            setShowRatingPanel((prev) => {
              const next = !prev;

              if (next) {
                if (myRating) {
                  const nextDraft = mapMyRatingToDraft(myRating);
                  setDraftRating(nextDraft);

                  const hasDetailedRatings =
                    myRating.condition != null ||
                    myRating.layout != null ||
                    myRating.scenery != null ||
                    myRating.value != null;

                  setShowDetailedRatings(hasDetailedRatings);
                } else {
                  setDraftRating(createDefaultDraftRating());
                  setShowDetailedRatings(false);
                }
              }

              return next;
            });
          }}
        />
      </section>

      {ratingSaved && (
        <div
          style={{
            marginTop: -2,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ✅ Rating saved
        </div>
      )}

      {showRatingPanel && !!token && (
        <section
          ref={ratingPanelRef}
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
                {myRating ? "Edit your rating" : "Rate this course"}
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  color: "var(--sub)",
                  lineHeight: 1.5,
                }}
              >
                {showDetailedRatings
                  ? myRating
                    ? "Update your detailed rating. Overall is calculated automatically."
                    : "Add detailed ratings. Overall is calculated automatically."
                  : myRating
                    ? "You already rated this course. Adjust your overall rating or add detailed ratings."
                    : "Start with a quick overall rating. Detailed ratings are optional."}
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
            {!showDetailedRatings && (
              <RatingSliderRow
                label="Overall"
                value={draftRating.overall}
                onChange={(next) =>
                  setDraftRating((prev) => ({ ...prev, overall: next }))
                }
              />
            )}

            <div
              style={{
                paddingTop: 12,
                display: "flex",
                justifyContent: "flex-start",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowDetailedRatings((prev) => {
                    const next = !prev;

                    if (next) {
                      setDraftRating((current) => ({
                        ...current,
                        condition: current.overall,
                        layout: current.overall,
                        scenery: current.overall,
                        value: current.overall,
                      }));
                    }

                    return next;
                  });
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {showDetailedRatings
                  ? "Hide detailed ratings"
                  : "Add detailed ratings"}
              </button>
            </div>

            {showDetailedRatings && (
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
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
            )}
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
              onClick={async () => {
                if (!course?.id || !token) return;

                try {
                  await saveRating(course.id, token, {
                    overall: showDetailedRatings
                      ? draftAverage
                      : draftRating.overall,
                    condition: showDetailedRatings
                      ? draftRating.condition
                      : null,
                    layout: showDetailedRatings ? draftRating.layout : null,
                    scenery: showDetailedRatings ? draftRating.scenery : null,
                    value: showDetailedRatings ? draftRating.value : null,
                  });

                  const updatedSummary = await getRatingSummary(course.id);
                  setRatingSummary(updatedSummary);

                  const savedMyRating: MyRating = {
                    overall: showDetailedRatings
                      ? draftAverage
                      : draftRating.overall,
                    condition: showDetailedRatings
                      ? draftRating.condition
                      : null,
                    layout: showDetailedRatings ? draftRating.layout : null,
                    scenery: showDetailedRatings ? draftRating.scenery : null,
                    value: showDetailedRatings ? draftRating.value : null,
                  };

                  setMyRating(savedMyRating);
                  setDraftRating(mapMyRatingToDraft(savedMyRating));

                  setShowDetailedRatings(
                    savedMyRating.condition != null ||
                      savedMyRating.layout != null ||
                      savedMyRating.scenery != null ||
                      savedMyRating.value != null,
                  );
                  setShowRatingPanel(false);
                  setRatingSaved(true);
                } catch (err) {
                  console.error("Save rating failed", err);
                  alert("Failed to save rating");
                }
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
              {myRating ? "Update rating" : "Save rating"}
            </button>

            <button
              type="button"
              onClick={() => {
                if (myRating) {
                  setDraftRating(mapMyRatingToDraft(myRating));

                  const hasDetailedRatings =
                    myRating.condition != null ||
                    myRating.layout != null ||
                    myRating.scenery != null ||
                    myRating.value != null;

                  setShowDetailedRatings(hasDetailedRatings);
                } else {
                  setDraftRating(createDefaultDraftRating());
                  setShowDetailedRatings(false);
                }

                setShowRatingPanel(false);
              }}
              style={secondaryBtnStyle}
            >
              Close
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
