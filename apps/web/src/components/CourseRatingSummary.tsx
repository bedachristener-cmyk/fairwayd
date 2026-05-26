import type { RatingSummary as CourseRatingSummaryData } from "../api/ratings";

type Props = {
  rating: CourseRatingSummaryData | null;
  canRate?: boolean;
  onRateClick?: () => void;
  ctaLabel?: string;
};

function formatRating(value: number) {
  return value.toFixed(1);
}

function StarPreview({ value }: { value: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        lineHeight: 1,
      }}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, value - index));

        return (
          <span
            key={index}
            style={{
              position: "relative",
              width: 14,
              height: 14,
              fontSize: 14,
              lineHeight: "14px",
            }}
          >
            <span style={{ color: "var(--muted)" }}>★</span>

            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: `${fill * 100}%`,
                overflow: "hidden",
                whiteSpace: "nowrap",
                color: "var(--text)",
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

function RatingRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "86px 1fr 38px",
        alignItems: "center",
        gap: 12,
        padding: "2px 0",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "var(--sub)",
          fontWeight: 750,
        }}
      >
        {label}
      </div>

      <div
        style={{
          height: 9,
          borderRadius: 999,
          background: "var(--muted)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(value / 5) * 100}%`,
            height: "100%",
            background: "var(--green)",
            opacity: 0.72,
          }}
        />
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 850,
          color: "var(--text)",
          textAlign: "right",
        }}
      >
        {formatRating(value)}
      </div>
    </div>
  );
}

export default function CourseRatingSummary({
  rating,
  canRate = false,
  onRateClick,
  ctaLabel,
}: Props) {
  const resolvedCtaLabel =
    ctaLabel ?? (canRate ? "Rate this course" : "Sign in to rate");

  if (!rating) {
    return (
      <section
        className="fw-atmosphere-card"
        style={{
          padding: 16,
          borderRadius: 22,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--green) 8%, var(--card)), var(--card))",
          border: "1px solid var(--border)",
          boxShadow: "0 14px 34px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 900,
            color: "var(--text)",
          }}
        >
          Course rating
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            color: "var(--sub)",
            lineHeight: 1.5,
          }}
        >
          No ratings yet. Be the first golfer to rate this course.
        </div>

        <button
          type="button"
          onClick={onRateClick}
          style={{
            marginTop: 14,
            minHeight: 40,
            padding: "0 14px",
            borderRadius: 16,
            border: "1px solid var(--green)",
            background: "var(--green)",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {resolvedCtaLabel}
        </button>
      </section>
    );
  }

  return (
    <section
      className="fw-atmosphere-card"
      style={{
        padding: 18,
        borderRadius: 24,
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--green) 8%, var(--card)), var(--card) 52%, color-mix(in srgb, var(--bg) 14%, var(--card)))",
        border: "1px solid var(--border)",
        boxShadow: "0 16px 38px rgba(0,0,0,0.14)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
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
        <div style={{ minWidth: 0 }}>
          <div
            style={{
            fontSize: 17,
            fontWeight: 900,
              color: "var(--text)",
            }}
          >
            Course rating
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "var(--sub)",
            }}
          >
            Based on golfer feedback
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            minWidth: 96,
            padding: "8px 10px",
            borderRadius: 18,
            background: "var(--muted)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 34,
              lineHeight: 1,
              fontWeight: 950,
              color: "var(--text)",
            }}
          >
            {formatRating(rating.overall)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          color: "var(--text)",
          fontWeight: 800,
          padding: "10px 12px",
          borderRadius: 18,
          background: "color-mix(in srgb, var(--muted) 72%, transparent)",
          border: "1px solid var(--border)",
        }}
      >
        <span aria-hidden="true">⭐</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {formatRating(rating.overall)}
          <StarPreview value={rating.overall} />
          <span style={{ color: "var(--sub)", fontWeight: 600 }}>
            • {rating.count} reviews
          </span>
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 11,
        }}
      >
        <RatingRow label="Condition" value={rating.breakdown.condition} />
        <RatingRow label="Layout" value={rating.breakdown.layout} />
        <RatingRow label="Scenery" value={rating.breakdown.scenery} />
        <RatingRow label="Value" value={rating.breakdown.value} />
      </div>

      <button
        type="button"
        onClick={onRateClick}
        style={{
          marginTop: 2,
          minHeight: 40,
          padding: "0 14px",
          borderRadius: 16,
          border: "1px solid var(--green)",
          background: "var(--green)",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
          width: "fit-content",
        }}
      >
        {resolvedCtaLabel}
      </button>
    </section>
  );
}
