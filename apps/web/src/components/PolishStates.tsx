import type { CSSProperties, ReactNode } from "react";

type SkeletonBlockProps = {
  height: number | string;
  width?: number | string;
  radius?: number;
  style?: CSSProperties;
};

export function SkeletonBlock({
  height,
  width = "100%",
  radius = 12,
  style,
}: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        width,
        maxWidth: "100%",
        borderRadius: radius,
        background:
          "linear-gradient(90deg, color-mix(in srgb, var(--muted) 72%, transparent), color-mix(in srgb, var(--border) 34%, transparent), color-mix(in srgb, var(--muted) 72%, transparent))",
        opacity: 0.72,
        ...style,
      }}
    />
  );
}

export function DestinationRowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            minHeight: 96,
            borderRadius: 22,
            overflow: "hidden",
            border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
            background: "var(--card)",
            display: "grid",
            alignContent: "end",
            padding: 14,
            boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
          }}
        >
          <SkeletonBlock height={14} width="42%" radius={999} />
          <SkeletonBlock height={11} width="62%" radius={999} style={{ marginTop: 8 }} />
          <SkeletonBlock height={10} width="48%" radius={999} style={{ marginTop: 12 }} />
        </div>
      ))}
    </div>
  );
}

export function FeedCardsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SkeletonBlock height={38} width={38} radius={999} />
            <div style={{ flex: 1, display: "grid", gap: 7 }}>
              <SkeletonBlock height={12} width="42%" radius={999} />
              <SkeletonBlock height={10} width="28%" radius={999} />
            </div>
          </div>
          <SkeletonBlock height={12} width="86%" radius={999} />
          <SkeletonBlock height={12} width="66%" radius={999} />
          <SkeletonBlock height={160} radius={16} />
        </div>
      ))}
    </div>
  );
}

export function NotificationRowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "grid", borderTop: "1px solid var(--border)" }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            gap: 12,
            padding: "13px 14px",
            borderBottom:
              index === count - 1
                ? "none"
                : "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
          }}
        >
          <SkeletonBlock height={36} width={36} radius={14} />
          <div style={{ flex: 1, display: "grid", gap: 8, paddingTop: 3 }}>
            <SkeletonBlock height={12} width="54%" radius={999} />
            <SkeletonBlock height={10} width="78%" radius={999} />
          </div>
          <SkeletonBlock height={10} width={34} radius={999} style={{ marginTop: 4 }} />
        </div>
      ))}
    </div>
  );
}

export function TripCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            borderRadius: 22,
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <SkeletonBlock height={88} radius={18} />
          <SkeletonBlock height={14} width="58%" radius={999} />
          <SkeletonBlock height={11} width="72%" radius={999} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  style,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 22,
        border: "1px solid color-mix(in srgb, var(--border) 76%, transparent)",
        background:
          "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), var(--card))",
        color: "var(--text)",
        display: "grid",
        gap: 7,
        boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      <div style={{ fontSize: 16, lineHeight: 1.2, fontWeight: 900 }}>
        {title}
      </div>
      <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.45 }}>
        {body}
      </div>
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  );
}
