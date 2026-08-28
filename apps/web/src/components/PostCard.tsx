import { useEffect, useRef, useState } from "react";
import { fileUrl } from "../api/fileUrl";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { t } from "../i18n/strings";
import ImageLightbox from "./ImageLightbox";

function avatarSrc(url?: string | null) {
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return fileUrl(url);
}

type PostImage = {
  url: string | null;
};

type ResolvedPostImage = {
  url: string;
  resolvedUrl: string;
};

type PostUser = {
  id?: string;
  handle: string;
  name?: string | null;
  avatarUrl?: string | null;
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
  comments?: unknown[];
  _count?: {
    likes?: number;
    comments?: number;
  };
};

type PostCourseRating = {
  overall: number;
  count: number;
};

type PostCardProps = {
  post: Post;
  isMobile: boolean;
  isCommentTarget?: boolean;
  onSelectCourse?: () => void;
  onCommentClick?: (postId: string) => void;
  onOpenPost?: (postId: string) => void;
  courseFollowed?: boolean;
  courseFollowBusy?: boolean;
  onCourseFollowToggle?: (courseId: string) => void;
  courseRating?: PostCourseRating | null;
  myRating?: { overall: number } | null;

  onPostUpdated?: (updatedPost: any) => void;
  onPostDeleted?: (postId: string) => void;
};

export default function PostCard({
  post,
  isMobile,
  isCommentTarget,
  onSelectCourse,
  onCommentClick,
  onOpenPost,
  courseFollowed,
  courseFollowBusy,
  onCourseFollowToggle,
  courseRating,
  myRating,
  onPostUpdated,
  onPostDeleted,
}: PostCardProps) {
  const { token, user } = useAuth();

  const currentUserId = user?.id ?? null;

  const initialLiked =
    post.likes?.some((l: { userId: string }) => l.userId === currentUserId) ??
    false;

  const initialLikeCount =
    typeof post._count?.likes === "number"
      ? post._count.likes
      : (post.likes?.length ?? 0);

  const initialCommentCount =
    typeof post._count?.comments === "number"
      ? post._count.comments
      : (post.comments?.length ?? 0);

  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [likeBusy, setLikeBusy] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(
    null,
  );
  const [shareCopied, setShareCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const imagePointerStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    pointerId: number;
  } | null>(null);
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

  const handleIntentionalImageTap = async (
    e: React.PointerEvent<HTMLDivElement>,
    imageIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setLightboxImageIndex(imageIndex);

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

  const showPreviousImage = () => {
    setActiveImageIndex((index) =>
      index === 0 ? validImages.length - 1 : index - 1,
    );
  };

  const showNextImage = () => {
    setActiveImageIndex((index) =>
      index === validImages.length - 1 ? 0 : index + 1,
    );
  };

  const handleImagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    imagePointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      pointerId: e.pointerId,
    };
  };

  const handleImagePointerUp = async (
    e: React.PointerEvent<HTMLDivElement>,
    imageIndex: number,
  ) => {
    const start = imagePointerStartRef.current;
    imagePointerStartRef.current = null;

    if (!start || start.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;
    const distance = Math.hypot(deltaX, deltaY);
    const duration = Date.now() - start.time;

    if (hasMultipleImages) {
      if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        e.preventDefault();
        e.stopPropagation();

        if (deltaX < 0) {
          showNextImage();
        } else {
          showPreviousImage();
        }

        return;
      }
    }

    if (distance <= 10 && duration < 500) {
      await handleIntentionalImageTap(e, imageIndex);
    }
  };

  const handleImagePointerCancel = () => {
    imagePointerStartRef.current = null;
  };

  const suppressImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const stopGalleryControlEvent = (
    e:
      | React.MouseEvent<HTMLButtonElement>
      | React.PointerEvent<HTMLButtonElement>
      | React.TouchEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validImages: ResolvedPostImage[] =
    post.images?.filter(
      (img): img is { url: string } =>
        typeof img.url === "string" && img.url.length > 0,
    ).map((img) => ({
      url: img.url,
      resolvedUrl: fileUrl(img.url),
    })) ?? [];
  const activeImage =
    validImages[Math.min(activeImageIndex, Math.max(validImages.length - 1, 0))];
  const hasMultipleImages = validImages.length > 1;
  const displayedImages =
    hasMultipleImages && activeImage
      ? [{ image: activeImage, index: activeImageIndex }]
      : validImages.map((image, index) => ({ image, index }));

  const createdLabel = new Date(post.createdAt).toLocaleString();
  const displayName = post.user?.name?.trim() || post.user?.handle || "User";
  const avatarLabel = displayName.slice(0, 1).toUpperCase();

  const getVisibilityLabel = (visibility?: string | null) => {
    if (visibility === "PUBLIC") return `🌍 ${t("visibility_public")}`;
    if (visibility === "FOLLOWERS") return `👥 ${t("visibility_followers")}`;
    if (visibility === "PRIVATE") return `🔒 ${t("visibility_private")}`;
    return "";
  };

  const auth = useAuth() as any;

  const viewerId =
    auth?.user?.id || auth?.me?.id || auth?.user?.sub || auth?.me?.sub || null;

  const isOwnPost =
    !!viewerId &&
    (post.user?.id === viewerId ||
      (post as any).userId === viewerId ||
      (post as any).feedContext?.isSelf === true);

  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;

      const target = event.target;
      if (target instanceof Node && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isMenuOpen]);
  const [saveBusy, setSaveBusy] = useState(false);
  const [editError, setEditError] = useState("");

  const [localContent, setLocalContent] = useState(post.content ?? "");
  const [localVisibility, setLocalVisibility] = useState<
    "PUBLIC" | "FOLLOWERS" | "PRIVATE"
  >((post.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE") ?? "PUBLIC");

  const [editContent, setEditContent] = useState(post.content ?? "");
  const [editVisibility, setEditVisibility] = useState<
    "PUBLIC" | "FOLLOWERS" | "PRIVATE"
  >((post.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE") ?? "PUBLIC");

  useEffect(() => {
    setLocalContent(post.content ?? "");
    setLocalVisibility(
      (post.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE") ?? "PUBLIC",
    );
    setEditContent(post.content ?? "");
    setEditVisibility(
      (post.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE") ?? "PUBLIC",
    );

    const nextLiked =
      post.likes?.some((l: { userId: string }) => l.userId === currentUserId) ??
      false;

    const nextLikeCount =
      typeof post._count?.likes === "number"
        ? post._count.likes
        : (post.likes?.length ?? 0);

    const nextCommentCount =
      typeof post._count?.comments === "number"
        ? post._count.comments
        : (post.comments?.length ?? 0);

    setLiked(nextLiked);
    setLikeCount(nextLikeCount);
    setCommentCount(nextCommentCount);

    setIsEditing(false);
    setEditError("");
    setActiveImageIndex(0);
  }, [
    post.id,
    post.content,
    post.visibility,
    post.likes,
    post.comments,
    post._count,
    currentUserId,
  ]);

  async function handleSaveEdit() {
    if (!auth?.token) return;

    const trimmed = editContent.trim();
    const currentTrimmed = (localContent ?? "").trim();

    if (!trimmed && currentTrimmed) {
      setEditError(t("post_content_empty"));
      return;
    }

    try {
      setSaveBusy(true);
      setEditError("");

      const payload: {
        content?: string;
        visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
      } = {
        visibility: editVisibility,
      };

      if (trimmed) {
        payload.content = trimmed;
      }

      const res = await fetch(`${API_BASE}/posts/${post.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to update post: ${res.status}`);
      }

      const updated = await res.json();

      setLocalContent(updated?.content ?? localContent);
      setLocalVisibility(
        (updated?.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE") ??
          editVisibility,
      );

      setEditContent(updated?.content ?? editContent);
      setEditVisibility(
        (updated?.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE") ??
          editVisibility,
      );

      onPostUpdated?.(updated);

      setIsEditing(false);
    } catch (err) {
      console.error("Post update failed", err);
      setEditError(t("save_changes_failed"));
    } finally {
      setSaveBusy(false);
    }
  }

  const [deleteBusy, setDeleteBusy] = useState(false);

  async function handleDeletePost() {
    if (!auth?.token) return;
    if (deleteBusy) return;

    const confirmed = window.confirm(t("delete_post_confirm"));

    if (!confirmed) return;

    try {
      setDeleteBusy(true);

      const res = await fetch(`${API_BASE}/posts/${post.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to delete post: ${res.status}`);
      }

      onPostDeleted?.(post.id);
    } catch (err) {
      console.error("Post delete failed", err);
      window.alert(t("delete_post_failed"));
    } finally {
      setDeleteBusy(false);
    }
  }

  const actionButtonStyle: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
    borderRadius: 999,
    cursor: "pointer",
    color: "var(--sub)",
    fontWeight: 620,
    minWidth: "auto",
    textAlign: "center",
    minHeight: isMobile ? 28 : 32,
    padding: isMobile ? "4px 8px" : "7px 11px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: isMobile ? 4 : 6,
    lineHeight: 1,
    fontSize: isMobile ? 12 : 12.5,
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

  const handleOpenPost = () => {
    if (isEditing) return;
    if (isMenuOpen) return;
    onOpenPost?.(post.id);
  };

  const handleShareClick = async () => {
    const shareUrl = `${window.location.origin}/feed?postId=${encodeURIComponent(post.id)}&comment=1`;

    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Fairwayd post",
            text: "Check out this golf post on Fairwayd",
            url: shareUrl,
          });
          return;
        } catch {
          // Fall back to the existing copy-link behavior when native sharing is unavailable or dismissed.
        }
      }

      await copyText(shareUrl);
      setShareCopied(true);
    } catch (err) {
      console.error("Share copy failed", err);
    }
  };

  return (
    <div
      className="fw-post-card"
      ref={rootRef}
      onClick={handleOpenPost}
      style={{
        padding: isMobile ? "12px 0" : 14,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflowX: "hidden",
        borderRadius: isMobile ? 18 : 20,
        background: isMobile
          ? "var(--card)"
          : isCommentTarget
            ? "color-mix(in srgb, var(--green) 5%, var(--card))"
            : "var(--card)",
        border: isMobile
          ? "1px solid color-mix(in srgb, var(--border) 82%, transparent)"
          : isCommentTarget
            ? "1px solid color-mix(in srgb, var(--green) 42%, var(--border))"
            : "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
        borderBottom: isMobile
          ? "1px solid color-mix(in srgb, var(--border) 82%, transparent)"
          : undefined,
        boxShadow: isCommentTarget
          ? "0 0 0 2px color-mix(in srgb, var(--green) 16%, transparent)"
          : isMobile
            ? "0 4px 14px rgba(15, 23, 20, 0.05)"
            : "0 10px 24px rgba(15, 23, 20, 0.06)",
        color: "var(--text)",
        cursor: onOpenPost && !isEditing && !isMenuOpen ? "pointer" : "default",
      }}
    >
      <div
        style={{
          padding: isMobile ? "0 11px" : "0 12px",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              minWidth: 0,
              flex: 1,
            }}
          >
            {avatarSrc(post.user?.avatarUrl) ? (
              <div
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  minHeight: 40,
                  maxWidth: 40,
                  maxHeight: 40,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border:
                    "1px solid color-mix(in srgb, var(--border) 86%, transparent)",
                  flexShrink: 0,
                  background: "var(--card)",
                }}
              >
                <img
                  className="fw-avatar-img"
                  src={avatarSrc(post.user?.avatarUrl) ?? ""}
                  alt={displayName}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    minWidth: "100%",
                    minHeight: "100%",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: "50%",
                  }}
                />
              </div>
            ) : (
              <div
                className="fw-avatar-wrap"
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  minHeight: 40,
                  maxWidth: 40,
                  maxHeight: 40,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border:
                    "1px solid color-mix(in srgb, var(--border) 86%, transparent)",
                  background: "var(--card)",
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {avatarLabel}
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nav(`/u/${post.user.handle}`);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  color: "var(--text)",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "block",
                  fontSize: 14,
                  fontWeight: 800,
                  lineHeight: 1.18,
                  maxWidth: "100%",
                }}
                title={`${t("open_user_profile")} @${post.user.handle}`}
              >
                {displayName}
              </button>

              <div
                style={{
                  fontSize: 12,
                  color: "var(--sub)",
                  lineHeight: 1.35,
                  marginTop: 3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                @{post.user.handle}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 8,
                  minWidth: 0,
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCourse?.();
                  }}
                  disabled={!onSelectCourse}
                  title={onSelectCourse ? t("open_this_course") : undefined}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    fontWeight: 760,
                    fontSize: 13,
                    color: "var(--text)",
                    cursor: onSelectCourse ? "pointer" : "default",
                    textAlign: "left",
                    minWidth: 0,
                  }}
                >
                  ⛳ {post.course.name}
                </button>
                  <div
                    style={{
                      display: "inline-flex",
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 0,
                      padding: 0,
                      borderRadius: 999,
                      background: "transparent",
                      border: "none",
                      minWidth: 0,
                    }}
                  >
                  <button
                    type="button"
                    className="fw-pill fw-pill--meta fw-pill--info"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      nav(`/courses/${post.course.id}`, {
                        state: {
                          openRating: true,
                          scrollToRating: true,
                        },
                      });
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    title={myRating ? t("edit_your_rating") : t("rate_this_course")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0,
                      flexWrap: "nowrap",
                      minHeight: 28,
                      maxWidth: "100%",
                      padding: "4px 9px",
                      margin: 0,
                      border:
                        "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
                      borderRadius: 14,
                      background: "var(--card)",
                      color: "color-mix(in srgb, var(--text) 82%, var(--sub))",
                      fontSize: 11.5,
                      fontWeight: 520,
                      letterSpacing: 0,
                      lineHeight: 1.2,
                      textAlign: "left",
                      cursor: "pointer",
                      width: "fit-content",
                      minWidth: 0,
                      overflow: "hidden",
                      position: "relative",
                      zIndex: 2,
                      pointerEvents: "auto",
                    }}
                  >
                    <span
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {courseRating && courseRating.count > 0
                        ? `\u2B50 ${courseRating.overall.toFixed(1)} \u2022 ${
                            courseRating.count
                          } ${
                            courseRating.count === 1 ? "rating" : "ratings"
                          } \u2022 Rate course`
                        : "No course rating yet \u2022 Be the first"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
              flexShrink: 0,
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--sub)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {createdLabel}
            </div>

            {localVisibility ? (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--sub)",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                {getVisibilityLabel(localVisibility)}
              </div>
            ) : null}
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
                  marginTop: 5,
                  border: courseFollowed
                    ? "1px solid var(--fw-pill-active-bg)"
                    : "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
                  background: courseFollowed
                    ? "var(--fw-pill-active-bg)"
                    : "var(--card)",
                  color: courseFollowed ? "var(--text)" : "var(--sub)",
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontWeight: 620,
                  fontSize: 11,
                  lineHeight: 1,
                  cursor: courseFollowBusy ? "default" : "pointer",
                  opacity: courseFollowBusy ? 0.5 : 0.9,
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {courseFollowBusy
                  ? "..."
                  : courseFollowed
                    ? `✓ ${t("following")}`
                    : `+ ${t("follow")}`}
              </button>
            ) : null}
            {isOwnPost ? (
              <div
                ref={menuRef}
                style={{
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  position: "relative",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen((v) => !v);
                  }}
                  title={t("post_actions")}
                  aria-label={t("post_actions")}
                  style={{
                    border: "none",
                    background: isMenuOpen
                      ? "color-mix(in srgb, var(--muted) 52%, transparent)"
                      : "transparent",
                    padding: 0,
                    margin: 0,
                    color: "var(--sub)",
                    fontSize: isMobile ? 20 : 18,
                    lineHeight: 1,
                    cursor: "pointer",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: isMobile ? 32 : 30,
                    height: isMobile ? 32 : 30,
                    transition: "background 0.15s ease, transform 0.15s ease",
                  }}
                >
                  ⋮
                </button>

                {isMenuOpen ? (
                  <div
                    style={{
                      position: "absolute",
                      top: isMobile ? 34 : 30,
                      right: 0,
                      minWidth: isMobile ? 170 : 156,
                      background: "var(--card)",
                      border:
                        "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
                      borderRadius: 14,
                      boxShadow: "0 14px 32px rgba(15, 23, 20, 0.14)",
                      padding: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      zIndex: 30,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditContent(localContent);
                        setEditVisibility(localVisibility);
                        setEditError("");
                        setIsEditing(true);
                        setIsMenuOpen(false);
                      }}
                      style={{
                        border: "none",
                        background: "var(--card)",
                        color: "var(--text)",
                        textAlign: "left",
                        padding: isMobile ? "11px 12px" : "10px 12px",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        minHeight: isMobile ? 40 : 36,
                      }}
                    >
                      {t("edit_post")}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        handleDeletePost();
                      }}
                      disabled={deleteBusy}
                      style={{
                        border: "none",
                        background: "var(--danger-soft)",
                        color: deleteBusy ? "var(--sub)" : "var(--danger)",
                        textAlign: "left",
                        padding: isMobile ? "11px 12px" : "10px 12px",
                        borderRadius: 14,
                        cursor: deleteBusy ? "default" : "pointer",
                        fontSize: 14,
                        opacity: deleteBusy ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        minHeight: isMobile ? 40 : 36,
                      }}
                    >
                      {t("delete_post")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {isEditing ? (
          <div
            style={{
              marginTop: 10,
              display: "grid",
              gap: 10,
            }}
          >
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                boxSizing: "border-box",
                font: "inherit",
                lineHeight: 1.5,
              }}
            />

            <select
              value={editVisibility}
              onChange={(e) =>
                setEditVisibility(
                  e.target.value as "PUBLIC" | "FOLLOWERS" | "PRIVATE",
                )
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                boxSizing: "border-box",
                font: "inherit",
              }}
            >
              <option value="PUBLIC">🌍 {t("visibility_public")}</option>
              <option value="FOLLOWERS">👥 {t("visibility_followers")}</option>
              <option value="PRIVATE">🔒 {t("visibility_private")}</option>
            </select>

            {editError ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#ff9a9a",
                }}
              >
                {editError}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditContent(localContent);
                  handleSaveEdit();
                }}
                disabled={saveBusy}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(39,196,107,0.35)",
                  background: "rgba(39,196,107,0.16)",
                  color: "var(--text)",
                  fontWeight: 800,
                  cursor: saveBusy ? "default" : "pointer",
                  opacity: saveBusy ? 0.7 : 1,
                }}
              >
                {saveBusy ? t("saving") : t("save")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditContent(localContent);
                  setEditVisibility(localVisibility);
                  setEditError("");
                  setIsEditing(false);
                }}
                disabled={saveBusy}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  fontWeight: 800,
                  cursor: saveBusy ? "default" : "pointer",
                  opacity: saveBusy ? 0.7 : 1,
                }}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 7,
              whiteSpace: "pre-wrap",
              lineHeight: 1.54,
              wordBreak: "break-word",
              fontSize: 14,
              color: "var(--text)",
            }}
          >
            <div
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: expanded ? "unset" : 4,
                overflow: "hidden",
              }}
            >
              {localContent}
            </div>

            {localContent && localContent.length > 140 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                style={{
                  marginTop: 6,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: "var(--text)",
                  fontWeight: 500,
                  opacity: 0.6,

                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {expanded ? t("show_less") : t("more")}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {validImages.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 10,
            marginTop: 12,
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            overflowX: "hidden",
          }}
        >
          {displayedImages.map(({ image: img, index }) => {
            return (
              <div
                key={img.url}
                onPointerDown={handleImagePointerDown}
                onPointerUp={(event) => handleImagePointerUp(event, index)}
                onPointerCancel={handleImagePointerCancel}
                onClick={suppressImageClick}
                className="fw-post-image-wrap"
                style={{
                  position: "relative",
                  overflow: "visible",
                  borderRadius: 0,
                  background: "transparent",
                  minHeight: 60,
                  border: "none",
                  boxShadow: "none",
                  cursor: "pointer",
                  userSelect: "none",
                  touchAction: hasMultipleImages ? "pan-y" : "auto",
                }}
              >
                <img
                  className="fw-post-img"
                  src={img.resolvedUrl}
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    console.debug("Post feed image loaded", {
                      rawImageUrl: img.url,
                      imageUrl: img.resolvedUrl,
                      naturalWidth: image.naturalWidth,
                      naturalHeight: image.naturalHeight,
                    });
                  }}
                  onError={() => {
                    console.error("Post feed image failed to load", {
                      rawImageUrl: img.url,
                      imageUrl: img.resolvedUrl,
                    });
                  }}
                  alt={t("post_image_alt")}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                    maxHeight: isMobile
                      ? "min(80dvh, 720px)"
                      : "min(80dvh, 860px)",
                    borderRadius: 0,
                    transform: "none",
                    transition: "none",
                  }}
                />

                {hasMultipleImages ? (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "rgba(0,0,0,0.58)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 800,
                        lineHeight: 1,
                        pointerEvents: "none",
                      }}
                    >
                      {activeImageIndex + 1} / {validImages.length}
                    </div>

                    <button
                      type="button"
                      onPointerDown={stopGalleryControlEvent}
                      onMouseDown={stopGalleryControlEvent}
                      onTouchStart={stopGalleryControlEvent}
                      onTouchEnd={(e) => {
                        stopGalleryControlEvent(e);
                        showPreviousImage();
                      }}
                      onClick={(e) => {
                        stopGalleryControlEvent(e);
                        showPreviousImage();
                      }}
                      aria-label="Previous image"
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: isMobile ? 34 : 38,
                        height: isMobile ? 34 : 38,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.45)",
                        background: "rgba(0,0,0,0.52)",
                        color: "#fff",
                        fontSize: isMobile ? 22 : 24,
                        fontWeight: 900,
                        lineHeight: 1,
                        zIndex: 3,
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onPointerDown={stopGalleryControlEvent}
                      onMouseDown={stopGalleryControlEvent}
                      onTouchStart={stopGalleryControlEvent}
                      onTouchEnd={(e) => {
                        stopGalleryControlEvent(e);
                        showNextImage();
                      }}
                      onClick={(e) => {
                        stopGalleryControlEvent(e);
                        showNextImage();
                      }}
                      aria-label="Next image"
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: isMobile ? 34 : 38,
                        height: isMobile ? 34 : 38,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.45)",
                        background: "rgba(0,0,0,0.52)",
                        color: "#fff",
                        fontSize: isMobile ? 22 : 24,
                        fontWeight: 900,
                        lineHeight: 1,
                        zIndex: 3,
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      ›
                    </button>
                  </>
                ) : null}

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

      {lightboxImageIndex !== null ? (
        <ImageLightbox
          images={validImages}
          initialIndex={lightboxImageIndex}
          isMobile={isMobile}
          onClose={() => setLightboxImageIndex(null)}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          gap: isMobile ? 7 : 10,
          alignItems: "center",
          marginTop: 12,
          fontSize: 13,
          flexWrap: "wrap",
          padding: isMobile ? "0 11px" : "0 12px",
          color: "var(--sub)",
        }}
      >
        <button
          className="fw-pill fw-pill--meta"
          onClick={(e) => {
            e.stopPropagation();
            handleLikeClick();
          }}
          disabled={likeBusy}
          style={{
            ...actionButtonStyle,
            flexShrink: 0,
            cursor: likeBusy ? "default" : "pointer",
            color: liked ? "#e54867" : "var(--sub)",
            background: liked
              ? "color-mix(in srgb, #ff4d6d 8%, var(--card))"
              : "var(--card)",
            opacity: likeBusy ? 0.7 : 1,
          }}
        >
          {liked ? "❤️" : "♡"} {likeCount}
        </button>

        <button
          type="button"
          className="fw-pill fw-pill--meta fw-pill--info"
          style={actionButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            onCommentClick?.(post.id);
          }}
        >
          {isMobile ? `💬 ${commentCount}` : `💬 ${t("comments")} ${commentCount}`}
        </button>

        <button
          type="button"
          className="fw-pill fw-pill--meta fw-pill--info"
          style={actionButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            handleShareClick();
          }}
          title={t("copy_post_link")}
        >
          {isMobile ? (shareCopied ? "✓" : "🔗") : `🔗 ${shareCopied ? t("copied") : t("share")}`}
        </button>
      </div>
    </div>
  );
}

