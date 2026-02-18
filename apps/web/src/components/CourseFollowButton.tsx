import { useState } from "react";

type Props = {
  isFollowing: boolean;
  disabled?: boolean;
  className?: string;
  onFollow: () => Promise<void> | void;
  onUnfollow: () => Promise<void> | void;
};

export function CourseFollowButton({
  isFollowing,
  disabled,
  className,
  onFollow,
  onUnfollow,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isFollowing) await onUnfollow();
      else await onFollow();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update follow state");
    } finally {
      setIsLoading(false);
    }
  }

  let label = isFollowing ? "Following" : "Follow";
  if (disabled) label = "Login required";
  if (isLoading) label = "Working...";

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={!!disabled || isLoading}
        aria-pressed={isFollowing}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.15)",
          background: isFollowing
            ? "rgba(34,197,94,0.18)"
            : "rgba(255,255,255,0.06)",
          cursor: !!disabled || isLoading ? "not-allowed" : "pointer",
        }}
      >
        {label}
      </button>

      {error ? (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>{error}</div>
      ) : null}
    </div>
  );
}
