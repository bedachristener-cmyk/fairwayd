import { useEffect, useRef, useState } from "react";
import { fileUrl } from "../api/fileUrl";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

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

type PostCardProps = {
  post: Post;
  isMobile: boolean;
  isCommentTarget?: boolean;
  onSelectCourse?: () => void;
  onCommentClick?: (postId: string) => void;
  courseFollowed?: boolean;
  courseFollowBusy?: boolean;
  onCourseFollowToggle?: (courseId: string) => void;

  onPostUpdated?: (updatedPost: any) => void;
  onPostDeleted?: (postId: string) => void;
};

export default function PostCard({
  post,
  isMobile,
  isCommentTarget,
  onSelectCourse,
  onCommentClick,
  courseFollowed,
  courseFollowBusy,
  onCourseFollowToggle,
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
  const displayName = post.user?.name?.trim() || post.user?.handle || "User";
  const avatarLabel = displayName.slice(0, 1).toUpperCase();

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
      setEditError("Post content cannot be empty.");
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
      setEditError("Could not save changes.");
    } finally {
      setSaveBusy(false);
    }
  }

  const [deleteBusy, setDeleteBusy] = useState(false);

  async function handleDeletePost() {
    if (!auth?.token) return;
    if (deleteBusy) return;

    const confirmed = window.confirm("Do you really want to delete this post?");

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
      window.alert("Could not delete post.");
    } finally {
      setDeleteBusy(false);
    }
  }

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
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  minHeight: 36,
                  maxWidth: 36,
                  maxHeight: 36,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                  background: "var(--muted)",
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
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  minHeight: 36,
                  maxWidth: 36,
                  maxHeight: 36,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  background: "var(--muted)",
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
                onClick={() => nav(`/u/${post.user.handle}`)}
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
                  lineHeight: 1.2,
                  maxWidth: "100%",
                }}
                title={`Open @${post.user.handle}`}
              >
                {displayName}
              </button>

              <div
                style={{
                  fontSize: 12,
                  color: "var(--sub)",
                  lineHeight: 1.35,
                  marginTop: 2,
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
                  marginTop: 6,
                  minWidth: 0,
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
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--text)",
                    cursor: onSelectCourse ? "pointer" : "default",
                    textAlign: "left",
                    minWidth: 0,
                  }}
                >
                  ⛳ {post.course.name}
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
                {localVisibility === "PUBLIC" && "🌍 Public"}
                {localVisibility === "FOLLOWERS" && "👥 Followers"}
                {localVisibility === "PRIVATE" && "🔒 Private"}
              </div>
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
                  onClick={() => {
                    setIsMenuOpen((v) => !v);
                  }}
                  title="Post actions"
                  aria-label="Post actions"
                  style={{
                    border: "none",
                    background: isMenuOpen
                      ? "rgba(255,255,255,0.08)"
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
                      border: "1px solid var(--line, rgba(255,255,255,0.08))",
                      borderRadius: 18,
                      boxShadow: "0 18px 40px rgba(0,0,0,0.24)",
                      padding: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      zIndex: 30,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEditContent(localContent);
                        setEditVisibility(localVisibility);
                        setEditError("");
                        setIsEditing(true);
                        setIsMenuOpen(false);
                      }}
                      style={{
                        border: "none",
                        background: "rgba(255,255,255,0.03)",
                        color: "var(--text)",
                        textAlign: "left",
                        padding: isMobile ? "11px 12px" : "10px 12px",
                        borderRadius: 14,
                        cursor: "pointer",
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        minHeight: isMobile ? 40 : 36,
                      }}
                    >
                      Edit post
                    </button>

                    <button
                      type="button"
                      onClick={() => {
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
                      Delete post
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
              <option value="PUBLIC">🌍 Public</option>
              <option value="FOLLOWERS">👥 Followers</option>
              <option value="PRIVATE">🔒 Private</option>
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
                onClick={handleSaveEdit}
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
                {saveBusy ? "Saving..." : "Save"}
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
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 8,
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
              wordBreak: "break-word",
            }}
          >
            {localContent}
          </div>
        )}
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
                className="fw-post-image-wrap"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: isMobile ? 0 : 12,
                  background: "var(--muted)",
                  minHeight: 60,
                  border: "1px solid var(--border)",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <img
                  className="fw-post-img"
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
          type="button"
          style={actionButtonStyle}
          onClick={() => onCommentClick?.(post.id)}
        >
          💬 Comments {commentCount}
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
