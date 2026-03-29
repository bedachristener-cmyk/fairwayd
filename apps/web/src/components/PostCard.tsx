import { useEffect, useRef, useState } from "react";
import { fileUrl } from "../api/fileUrl";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

type PostImage = {
  url: string | null;
};

type PostUser = {
  handle: string;
};

type PostCourse = {
  id: string;
  name: string;
  lat: number | string;
  lon: number | string;
};

type Post = {
  id: string;
  content: string;
  createdAt: string;
  visibility?: string | null;
  user: PostUser;
  course: PostCourse;
  images?: PostImage[];
  likes?: { userId: string }[];
  _count?: {
    comments?: number;
  };
};

type PostCardProps = {
  post: Post;
  isMobile: boolean;
  isCommentTarget?: boolean;
  onSelectCourse?: () => void;
  onCommentClick?: (postId: string) => void;
  courseFollowed?: boolean;
  courseFollowBusy?: boolean;
  onCourseFollowToggle?: (courseId: string) => void;
};

export default function PostCard({
  post,
  isMobile,
  isCommentTarget = false,
  onSelectCourse,
  onCommentClick,
  courseFollowed = false,
  courseFollowBusy = false,
  onCourseFollowToggle,
}: PostCardProps) {
  const { token, user } = useAuth();

  const currentUserId = user?.id ?? null;

  const [liked, setLiked] = useState(
    post.likes?.some((l: { userId: string }) => l.userId === currentUserId) ??
      false,
  );
  const [likeCount, setLikeCount] = useState(post.likes?.length ?? 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!isCommentTarget) return;

    rootRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [isCommentTarget]);

  useEffect(() => {
    if (!showHeart) return;

    const timer = window.setTimeout(() => {
      setShowHeart(false);
    }, 850);

    return () => window.clearTimeout(timer);
  }, [showHeart]);

  useEffect(() => {
    if (!shareCopied) return;

    const timer = window.setTimeout(() => {
      setShareCopied(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [shareCopied]);

  const toggleLike = async (nextLiked: boolean) => {
    if (!token) return false;

    const method = nextLiked ? "POST" : "DELETE";

    const res = await fetch(`${API_BASE}/posts/${post.id}/like`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Like request failed: ${res.status}`);
    }

    return true;
  };

  const handleLikeClick = async () => {
    if (likeBusy || !token) return;

    try {
      setLikeBusy(true);

      const nextLiked = !liked;
      await toggleLike(nextLiked);

      setLiked(nextLiked);
      setLikeCount((c: number) => Math.max(0, c + (nextLiked ? 1 : -1)));
    } catch (err) {
      console.error("Failed to toggle like", err);
    } finally {
      setLikeBusy(false);
    }
  };

  const handleImageTap = async (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();

    if (now - lastTap < 300) {
      setShowHeart(true);

      if (!liked && !likeBusy && token) {
        try {
          setLikeBusy(true);
          await toggleLike(true);
          setLiked(true);
          setLikeCount((c: number) => c + 1);
        } catch (err) {
          console.error("Failed to like post on double tap", err);
        } finally {
          setLikeBusy(false);
        }
      }
    }

    setLastTap(now);
  };

  const validImages =
    post.images?.filter(
      (img): img is { url: string } =>
        typeof img.url === "string" && img.url.length > 0,
    ) ?? [];

  const createdLabel = new Date(post.createdAt).toLocaleString();

  const actionButtonStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "var(--text)",
    fontWeight: 700,
    minWidth: isMobile ? 72 : "auto",
    textAlign: "left",
    padding: isMobile ? "6px 0" : 0,
  };

  const copyText = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const handleShareClick = async () => {
    try {
      const shareUrl = `${window.location.origin}/feed?postId=${encodeURIComponent(post.id)}&comment=1`;
      await copyText(shareUrl);
      setShareCopied(true);
    } catch (err) {
      console.error("Share copy failed", err);
    }
  };

  return (
    <div
      ref={rootRef}
      style={{
        padding: isMobile ? "10px 0" : 12,
        borderRadius: isMobile ? 0 : 14,
        background: isMobile
          ? "transparent"
          : isCommentTarget
            ? "rgba(0, 200, 100, 0.08)"
            : "rgba(0,0,0,.10)",
        border: isMobile
          ? "none"
          : isCommentTarget
            ? "1px solid var(--green)"
            : "1px solid var(--border)",
        borderBottom: isMobile ? "1px solid var(--border)" : undefined,
        boxShadow: isCommentTarget
          ? "0 0 0 2px rgba(0, 200, 100, 0.25)"
          : undefined,
        color: "var(--text)",
      }}
    >
      <div style={{ padding: "0 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onSelectCourse}
            disabled={!onSelectCourse}
            title={onSelectCourse ? "Open this course" : undefined}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              margin: 0,
              fontWeight: 900,
              fontSize: 16,
              color: "var(--text)",
              cursor: onSelectCourse ? "pointer" : "default",
              textAlign: "left",
            }}
          >
            {post.course.name}
          </button>

          {onCourseFollowToggle ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCourseFollowToggle(post.course.id);
              }}
              disabled={courseFollowBusy}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: courseFollowed
                  ? "1px solid rgba(39,196,107,0.35)"
                  : "1px solid var(--border)",
                background: courseFollowed
                  ? "rgba(39,196,107,0.16)"
                  : "var(--bg)",
                color: "var(--text)",
                fontWeight: 800,
                fontSize: 12,
                cursor: courseFollowBusy ? "default" : "pointer",
                opacity: courseFollowBusy ? 0.6 : 1,
              }}
              title={courseFollowed ? "Unfollow course" : "Follow course"}
            >
              {courseFollowBusy
                ? "..."
                : courseFollowed
                  ? "Following"
                  : "Follow"}
            </button>
          ) : null}
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--sub)",
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          <button
            type="button"
            onClick={() => nav(`/u/${post.user.handle}`)}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              margin: 0,
              color: "var(--text)",
              cursor: "pointer",
              font: "inherit",
            }}
            title={`Open @${post.user.handle}`}
          >
            @{post.user.handle}
          </button>
          {" · "}
          {createdLabel}
          {post.visibility && (
            <>
              {" · "}
              {post.visibility === "PUBLIC" && "🌍 Public"}
              {post.visibility === "FOLLOWERS" && "👥 Followers"}
              {post.visibility === "PRIVATE" && "🔒 Private"}
            </>
          )}
        </div>

        <div
          style={{
            marginTop: 8,
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}
        >
          {post.content}
        </div>
      </div>

      {validImages.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            marginTop: 12,
          }}
        >
          {validImages.map((img) => {
            const isHovered = hoveredImage === img.url;

            return (
              <div
                key={img.url}
                onClick={handleImageTap}
                onTouchEnd={handleImageTap}
                onMouseEnter={() => {
                  if (!isMobile) setHoveredImage(img.url);
                }}
                onMouseLeave={() => {
                  if (!isMobile) setHoveredImage(null);
                }}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 14,
                  background: "var(--muted)",
                  minHeight: 120,
                  border: "1px solid var(--border)",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <img
                  src={fileUrl(img.url)}
                  alt="Post image"
                  loading="lazy"
                  style={{
                    width: "100%",
                    display: "block",
                    objectFit: "cover",
                    maxHeight: isMobile ? 320 : 420,
                    transform: isHovered ? "scale(1.08)" : "scale(1)",
                    transition: "transform 180ms ease",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: showHeart
                      ? "rgba(0,0,0,0.12)"
                      : "rgba(0,0,0,0.00)",
                    transition: "background 180ms ease",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: isMobile ? 56 : 72,
                      lineHeight: 1,
                      opacity: showHeart ? 1 : 0,
                      transform: showHeart ? "scale(1)" : "scale(0.7)",
                      transition: "opacity 180ms ease, transform 180ms ease",
                      textShadow: "0 6px 20px rgba(0,0,0,0.35)",
                    }}
                  >
                    ❤️
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: isMobile ? 8 : 12,
          alignItems: "center",
          marginTop: 12,
          fontSize: 14,
          flexWrap: "wrap",
          padding: "0 12px",
        }}
      >
        <button
          onClick={handleLikeClick}
          disabled={likeBusy}
          style={{
            ...actionButtonStyle,
            flexShrink: 0,
            cursor: likeBusy ? "default" : "pointer",
            color: liked ? "#ff4d6d" : "var(--text)",
            opacity: likeBusy ? 0.7 : 1,
          }}
        >
          {liked ? "❤️" : "♡"} {likeCount}
        </button>

        <button
          style={actionButtonStyle}
          onClick={() => onCommentClick?.(post.id)}
        >
          💬 Comments {post._count?.comments ?? 0}
        </button>

        <button
          type="button"
          style={actionButtonStyle}
          onClick={handleShareClick}
          title="Copy post link"
        >
          🔗 {shareCopied ? "Copied" : "Share"}
        </button>
      </div>
    </div>
  );
}
