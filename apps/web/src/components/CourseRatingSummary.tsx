import type { CourseRatingSummaryData } from "../data/courseRatings";

type Props = {
  rating: CourseRatingSummaryData | null;
};

function formatRating(value: number) {
  return value.toFixed(1);
}

function RatingRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "92px 1fr 40px",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "var(--sub)",
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(value / 5) * 100}%`,
            height: "100%",
            background: "var(--text)",
            opacity: 0.18,
          }}
        />
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text)",
          textAlign: "right",
        }}
      >
        {formatRating(value)}
      </div>
    </div>
  );
}

export default function CourseRatingSummary({ rating }: Props) {
  if (!rating) {
    return (
      <section
        style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 18,
          border: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
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
      </section>
    );
  }

  return (
    <section
      style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 18,
        border: "1px solid var(--border)",
        background: "var(--card)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
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
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text)",
            }}
          >
            Course rating
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 14,
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
            minWidth: 88,
          }}
        >
          <div
            style={{
              fontSize: 28,
              lineHeight: 1,
              fontWeight: 900,
              color: "var(--text)",
            }}
          >
            {formatRating(rating.overall)}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "var(--sub)",
              fontWeight: 600,
            }}
          >
            {rating.count} reviews
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          color: "var(--text)",
          fontWeight: 700,
        }}
      >
        <span aria-hidden="true">⭐</span>
        <span>{formatRating(rating.overall)} overall</span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <RatingRow label="Condition" value={rating.breakdown.condition} />
        <RatingRow label="Layout" value={rating.breakdown.layout} />
        <RatingRow label="Scenery" value={rating.breakdown.scenery} />
        <RatingRow label="Value" value={rating.breakdown.value} />
      </div>
    </section>
  );
}
