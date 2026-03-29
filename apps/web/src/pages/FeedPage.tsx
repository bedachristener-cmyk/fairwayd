import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../api/base";
import { fileUrl } from "../api/fileUrl";
import { useAuth } from "../auth/AuthContext";
import { useSelectedCourse } from "../state/SelectedCourseContext";
import CourseDropdown, { type CourseLite } from "../components/CourseDropdown";
import PostCard from "../components/PostCard";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

type PostImage = { id: string; url: string };

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
  images?: PostImage[];
  likes?: { userId: string }[];
};

type Course = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

async function resizeImage(file: File): Promise<File> {
  const img = document.createElement("img");
  const reader = new FileReader();

  const dataUrl: string = await new Promise((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  img.src = dataUrl;
  await new Promise((resolve) => (img.onload = resolve));

  const canvas = document.createElement("canvas");

  const MAX_WIDTH = 1600;
  const scale = Math.min(1, MAX_WIDTH / img.width);

  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  const ctx = canvas.getContext("2d");
  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8),
  );

  return new File([blob], file.name, { type: "image/jpeg" });
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const isMobile = window.innerWidth <= 980;

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: isMobile ? 0 : 16,
        border: "1px solid var(--border)",
        padding: isMobile ? "0 0 12px" : 12,
        color: "var(--text)",
      }}
    >
      <div
        style={{
          fontWeight: 900,
          marginBottom: 10,
          padding: isMobile ? 12 : 0,
        }}
      >
        {title}
      </div>
      <div style={{ padding: isMobile ? 0 : 0 }}>{children}</div>
    </div>
  );
}

function CommentModal({
  post,
  isMobile,
  onClose,
}: {
  post: Post;
  isMobile: boolean;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const nav = useNavigate();
  const { setSelectedCourse } = useSelectedCourse();

  type CommentItem = {
    id: string;
    content: string;
    createdAt: string;
    parentId?: string | null;
    likedByMe?: boolean;
    _count?: {
      likes?: number;
    };
    user?: {
      id: string;
      handle: string;
    };
    replies?: CommentItem[];
  };

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentDraft, setCommentDraft] = useState("");

  // 👇 HIER NEU
  function handleCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void handlePostComment();
    }
  }
  const [sending, setSending] = useState(false);

  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replySending, setReplySending] = useState(false);

  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const validImages =
    post.images?.filter(
      (img): img is { id: string; url: string } =>
        typeof img?.url === "string" && img.url.length > 0,
    ) ?? [];

  const handleOpenCourse = () => {
    const lat = Number(post.course.lat);
    const lon = Number(post.course.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    setSelectedCourse({
      id: post.course.id,
      name: post.course.name,
      lat,
      lon,
    });

    onClose();
    nav(`/map?courseId=${post.course.id}`);
  };

  const loadComments = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/posts/${post.id}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load comments: ${res.status}`);
      }

      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Comments load failed", err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [token, post.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!replyTargetId) return;

    const t = window.setTimeout(() => {
      replyInputRef.current?.focus();
    }, 30);

    return () => window.clearTimeout(t);
  }, [replyTargetId]);

  const handlePostComment = async () => {
    if (!commentDraft.trim() || !token) return;

    try {
      setSending(true);

      const res = await fetch(`${API_BASE}/posts/${post.id}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: commentDraft.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to post comment: ${res.status}`);
      }

      setCommentDraft("");
      await loadComments();
    } catch (err) {
      console.error("Comment post failed", err);
    } finally {
      setSending(false);
    }
  };

  const handlePostReply = async () => {
    if (!replyDraft.trim() || !token || !replyTargetId) return;

    try {
      setReplySending(true);

      const res = await fetch(`${API_BASE}/posts/${post.id}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: replyDraft.trim(),
          parentId: replyTargetId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to post reply: ${res.status}`);
      }

      setReplyDraft("");
      setReplyTargetId(null);
      await loadComments();
    } catch (err) {
      console.error("Reply post failed", err);
    } finally {
      setReplySending(false);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/posts/comments/${commentId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to toggle comment like: ${res.status}`);
      }

      const data = await res.json();
      const liked = !!data?.liked;

      const updateTree = (items: CommentItem[]): CommentItem[] =>
        items.map((item) => {
          if (item.id === commentId) {
            const currentLikes = item._count?.likes ?? 0;
            const nextLikes = liked
              ? currentLikes + 1
              : Math.max(0, currentLikes - 1);

            return {
              ...item,
              likedByMe: liked,
              _count: {
                ...item._count,
                likes: nextLikes,
              },
            };
          }

          return {
            ...item,
            replies: item.replies ? updateTree(item.replies) : item.replies,
          };
        });

      setComments((prev) => updateTree(prev));
    } catch (err) {
      console.error("Comment like toggle failed", err);
    }
  };
  const openReplyBox = (commentId: string) => {
    if (replyTargetId === commentId) {
      setReplyTargetId(null);
      setReplyDraft("");
      return;
    }

    setReplyTargetId(commentId);
    setReplyDraft("");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const renderReplies = (
    replies: CommentItem[] | undefined,
  ): React.ReactNode => {
    if (!replies?.length) return null;

    return (
      <div
        style={{
          display: "grid",
          gap: 10,
          marginTop: 10,
          marginLeft: 18,
          paddingLeft: 12,
          borderLeft: "2px solid var(--border)",
        }}
      >
        {replies.map((reply) => {
          const isReplyBoxOpen = replyTargetId === reply.id;

          return (
            <div key={reply.id} style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 10,
                  background: "var(--card)",
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  @{reply.user?.handle ?? "user"}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "var(--sub)",
                    marginTop: 2,
                  }}
                >
                  {reply.createdAt
                    ? new Date(reply.createdAt).toLocaleString()
                    : ""}
                </div>

                <div
                  style={{
                    fontSize: 14,
                    marginTop: 6,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {reply.content}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleCommentLike(reply.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: reply.likedByMe ? "#ff4d6d" : "var(--text)",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {reply.likedByMe ? "❤️" : "♡"} {reply._count?.likes ?? 0}
                  </button>

                  <button
                    type="button"
                    onClick={() => openReplyBox(reply.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--text)",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {isReplyBoxOpen ? "Cancel" : "Reply"}
                  </button>
                </div>
              </div>

              {isReplyBoxOpen ? (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    marginLeft: 8,
                  }}
                >
                  <textarea
                    ref={replyInputRef}
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder={`Reply to @${reply.user?.handle ?? "user"}...`}
                    rows={2}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      resize: "vertical",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTargetId(null);
                        setReplyDraft("");
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text)",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handlePostReply}
                      disabled={!replyDraft.trim() || replySending}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--muted)",
                        color: "var(--text)",
                        fontWeight: 800,
                        cursor:
                          replyDraft.trim() && !replySending
                            ? "pointer"
                            : "default",
                        opacity: replyDraft.trim() && !replySending ? 1 : 0.5,
                      }}
                    >
                      {replySending ? "Posting..." : "Post reply"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  const renderComment = (comment: CommentItem): React.ReactNode => {
    const isReplyBoxOpen = replyTargetId === comment.id;

    return (
      <div key={comment.id} style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 12,
            background: "var(--card)",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            @{comment.user?.handle ?? "user"}
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--sub)",
              marginTop: 2,
            }}
          >
            {comment.createdAt
              ? new Date(comment.createdAt).toLocaleString()
              : ""}
          </div>

          <div
            style={{
              fontSize: 14,
              marginTop: 6,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {comment.content}
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => handleToggleCommentLike(comment.id)}
              style={{
                border: "none",
                background: "transparent",
                color: comment.likedByMe ? "#ff4d6d" : "var(--text)",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {comment.likedByMe ? "❤️" : "♡"} {comment._count?.likes ?? 0}
            </button>

            <button
              type="button"
              onClick={() => openReplyBox(comment.id)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text)",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {isReplyBoxOpen ? "Cancel" : "Reply"}
            </button>

            {comment.replies?.length ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--sub)",
                }}
              >
                {comment.replies.length} repl
                {comment.replies.length === 1 ? "y" : "ies"}
              </div>
            ) : null}
          </div>
        </div>

        {isReplyBoxOpen ? (
          <div
            style={{
              marginLeft: 8,
              display: "grid",
              gap: 8,
            }}
          >
            <textarea
              ref={replyInputRef}
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder={`Reply to @${comment.user?.handle ?? "user"}...`}
              rows={2}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 10,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                resize: "vertical",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setReplyTargetId(null);
                  setReplyDraft("");
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePostReply}
                disabled={!replyDraft.trim() || replySending}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--muted)",
                  color: "var(--text)",
                  fontWeight: 800,
                  cursor:
                    replyDraft.trim() && !replySending ? "pointer" : "default",
                  opacity: replyDraft.trim() && !replySending ? 1 : 0.5,
                }}
              >
                {replySending ? "Posting..." : "Post reply"}
              </button>
            </div>
          </div>
        ) : null}

        {renderReplies(comment.replies)}
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: isMobile ? "var(--bg)" : "rgba(0,0,0,0.55)",
        zIndex: 2000,
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? "100%" : "min(760px, 100%)",
          height: isMobile ? "100dvh" : "min(85vh, 900px)",
          maxHeight: isMobile ? "100dvh" : "85vh",
          overflow: "hidden",
          background: isMobile ? "var(--bg)" : "var(--card)",
          color: "var(--text)",
          border: isMobile ? "none" : "1px solid var(--border)",
          borderRadius: isMobile ? 0 : 18,
          boxShadow: isMobile ? "none" : "0 20px 60px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            background: isMobile ? "var(--bg)" : "var(--card)",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>Post & Comments</div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid var(--text)",
              background: "var(--text)",
              color: "var(--bg)",
              borderRadius: 10,
              padding: "8px 12px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        <div
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* ===== Scrollbarer Bereich ===== */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "grid",
              gap: 14,
              paddingBottom: 8,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* ===== Post Preview ===== */}
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                overflow: "hidden",
                background: "var(--card)",
              }}
            >
              <div style={{ padding: "12px 12px 10px 12px" }}>
                <button
                  type="button"
                  onClick={handleOpenCourse}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    margin: "0 0 4px 0",
                    fontWeight: 800,
                    fontSize: 16,
                    color: "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  title="Open course"
                >
                  {post.course.name}
                </button>

                <div
                  style={{
                    fontSize: 12,
                    color: "var(--sub)",
                    marginBottom: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <span>@{post.user.handle}</span>
                  <span>·</span>
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                  {post.visibility ? (
                    <>
                      <span>·</span>
                      <span>
                        {post.visibility === "PUBLIC" && "🌍 Public"}
                        {post.visibility === "FOLLOWERS" && "👥 Followers"}
                        {post.visibility === "PRIVATE" && "🔒 Private"}
                      </span>
                    </>
                  ) : null}
                </div>

                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                    color: "var(--text)",
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
                    padding: "0 12px 10px 12px",
                  }}
                >
                  {validImages.map((img) => (
                    <img
                      key={img.id}
                      src={fileUrl(img.url)}
                      alt="Post image"
                      loading="lazy"
                      style={{
                        width: "100%",
                        display: "block",
                        objectFit: "cover",
                        maxHeight: isMobile ? 220 : 420,
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {/* ===== Comments ===== */}
            <div
              style={{
                display: "grid",
                gap: 12,
                paddingTop: 6,
                borderTop: "1px solid var(--border)",
              }}
            >
              {loading ? (
                <div style={{ fontSize: 13, color: "var(--sub)" }}>
                  Loading comments...
                </div>
              ) : comments.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--sub)" }}>
                  No comments yet.
                </div>
              ) : (
                comments.map((comment) => renderComment(comment))
              )}
            </div>
          </div>

          {/* ===== FIXER COMMENT COMPOSER ===== */}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              padding: "12px 16px 16px 16px",
              display: "grid",
              gap: 10,
              background: isMobile ? "var(--bg)" : "var(--card)",
              position: "sticky",
              bottom: 0,
              zIndex: 10,
            }}
          >
            <textarea
              autoFocus
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={handleCommentKeyDown}
              placeholder="Write a comment..."
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 12,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                resize: "vertical",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={handlePostComment}
                disabled={!commentDraft.trim() || sending}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--muted)",
                  color: "var(--text)",
                  fontWeight: 800,
                  cursor:
                    commentDraft.trim() && !sending ? "pointer" : "default",
                  opacity: commentDraft.trim() && !sending ? 1 : 0.5,
                }}
              >
                {sending ? "Posting..." : "Post comment"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const isMobile = window.innerWidth <= 980;
  const location = useLocation();
  const { selectedCourse, setSelectedCourse, clearSelectedCourse } =
    useSelectedCourse();

  const { token, user, loading, logout, isAuthenticated } = useAuth();

  const handle =
    user?.handle || localStorage.getItem("fairwayd_handle") || "me";

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const focusCourse = (location.state as any)?.focusCourse ?? null;
  const focusPostIdFromState = (location.state as any)?.focusPostId ?? null;
  const openCommentFromState = (location.state as any)?.openComment ?? false;

  const focusPostIdFromQuery = searchParams.get("postId");
  const openCommentFromQuery = searchParams.get("comment") === "1";

  const focusPostId = focusPostIdFromState ?? focusPostIdFromQuery;
  const openComment = openCommentFromState || openCommentFromQuery;

  const [posts, setPosts] = useState<Post[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );

  const [followedCourseIds, setFollowedCourseIds] = useState<string[]>([]);
  const [courseFollowBusyId, setCourseFollowBusyId] = useState<string | null>(
    null,
  );

  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<
    "PUBLIC" | "FOLLOWERS" | "PRIVATE"
  >("PUBLIC");

  const [err, setErr] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch(`${API_BASE}/courses`);
        if (!r.ok) return;
        const d = await r.json();
        setCourses(Array.isArray(d) ? d : []);
      } catch {
        setCourses([]);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const loadFeed = useCallback(async () => {
    if (!token) return;

    try {
      setErr(null);

      const res = await fetch(`${API_BASE}/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${t}`.trim());
      }

      const data = await res.json();
      setPosts(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load feed");
    }
  }, [token, logout]);

  const loadFollowedCourses = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/courses/me/following`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load followed courses: ${res.status}`);
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      setFollowedCourseIds(
        items
          .map((course: { id?: string }) => course.id)
          .filter(
            (id: string | undefined): id is string =>
              typeof id === "string" && id.length > 0,
          ),
      );
    } catch (err) {
      console.error("Failed to load followed courses", err);
      setFollowedCourseIds([]);
    }
  }, [token, logout]);

  useEffect(() => {
    if (loading) return;
    if (!token) return;
    loadFeed();
  }, [loading, token, loadFeed]);

  useEffect(() => {
    if (loading) return;
    if (!token) return;
    loadFollowedCourses();
  }, [loading, token, loadFollowedCourses]);

  useEffect(() => {
    if (!selectedCourse) return;
    const t = window.setTimeout(() => {
      draftRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [selectedCourse]);

  useEffect(() => {
    if (!focusCourse) return;

    setSelectedCourse({
      id: focusCourse.id,
      name: focusCourse.name,
      lat: Number(focusCourse.lat ?? 0),
      lon: Number(focusCourse.lon ?? 0),
    });
  }, [focusCourse, setSelectedCourse]);

  useEffect(() => {
    if (!openComment) return;
    if (!focusPostId) return;

    setActiveCommentPostId(focusPostId);
  }, [openComment, focusPostId]);

  const coursesLite: CourseLite[] = useMemo(
    () => courses.map((c) => ({ id: c.id, name: c.name })),
    [courses],
  );

  const selectedName = selectedCourse?.name;
  const selectedLat = selectedCourse?.lat;
  const selectedLon = selectedCourse?.lon;

  const selectedIsComplete =
    Boolean(selectedCourse?.id) &&
    typeof selectedName === "string" &&
    selectedName.trim().length > 0 &&
    typeof selectedLat === "number" &&
    typeof selectedLon === "number";
  const handleToggleCourseFollow = useCallback(
    async (courseId: string) => {
      if (!token) return;
      if (courseFollowBusyId) return;

      const currentlyFollowed = followedCourseIds.includes(courseId);

      try {
        setCourseFollowBusyId(courseId);

        setFollowedCourseIds((prev) =>
          currentlyFollowed
            ? prev.filter((id: string) => id !== courseId)
            : prev.includes(courseId)
              ? prev
              : [...prev, courseId],
        );

        const res = await fetch(`${API_BASE}/courses/${courseId}/follow`, {
          method: currentlyFollowed ? "DELETE" : "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          logout();
          throw new Error("Unauthorized");
        }

        if (!res.ok) {
          throw new Error(`Course follow request failed: ${res.status}`);
        }
      } catch (err) {
        setFollowedCourseIds((prev) =>
          currentlyFollowed
            ? prev.includes(courseId)
              ? prev
              : [...prev, courseId]
            : prev.filter((id: string) => id !== courseId),
        );
        console.error("Course follow toggle failed", err);
      } finally {
        setCourseFollowBusyId(null);
      }
    },
    [token, logout, courseFollowBusyId, followedCourseIds],
  );
  const submitPost = async () => {
    console.log("submitPost clicked", {
      selectedCourse,
      selectedIsComplete,
      draft,
      file,
      token: Boolean(token),
      visibility,
      selectedName,
      selectedLat,
      selectedLon,
      typeLat: typeof selectedLat,
      typeLon: typeof selectedLon,
    });

    if (!selectedCourse) {
      setErr("Choose a course first.");
      alert("Choose a course first.");
      return;
    }

    if (!selectedIsComplete) {
      setErr(
        "Selected course is missing details (name/coordinates). Please re-select the course.",
      );
      alert("Selected course is missing details. Please re-select the course.");
      return;
    }

    const text = draft.trim();
    if (!text && !file) {
      setErr("Write something or add a photo.");
      alert("Write something or add a photo.");
      return;
    }

    if (!token) {
      setErr("Missing auth token. Please login again.");
      alert("Missing auth token. Please login again.");
      return;
    }

    setPosting(true);
    setErr(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Post = {
      id: optimisticId,
      content: text,
      createdAt: new Date().toISOString(),
      visibility,
      course: {
        id: selectedCourse.id,
        name: selectedName!,
        lat: selectedLat!,
        lon: selectedLon!,
      },
      user: { id: "me", handle },
      images: preview ? [{ id: "preview", url: preview }] : [],
    };

    setPosts((prev) => [optimistic, ...prev]);

    try {
      const fd = new FormData();
      fd.append("courseId", selectedCourse.id);
      fd.append("content", text);
      fd.append("visibility", visibility);
      if (file) {
        const resized = await resizeImage(file);
        fd.append("image", resized);
      }

      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error("Unauthorized. Please login again.");
      }

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${t}`.trim());
      }

      const created = (await res.json()) as Post;

      setDraft("");
      setFile(null);
      setPreview(null);

      setPosts((prev) => {
        const rest = prev.filter((p) => p.id !== optimisticId);
        return [created, ...rest];
      });
    } catch (e: any) {
      setPosts((prev) => prev.filter((p) => p.id !== optimisticId));
      setErr(e?.message ?? "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const activeCommentPost =
    posts.find((p) => p.id === activeCommentPostId) ?? null;

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Card title="Feed">
          <div style={{ color: "var(--sub)", fontSize: 13 }}>
            Bitte neu einloggen (DB Reset hat den alten Token ungültig gemacht).
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gap: 12 }}>
        {err && (
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              background: "rgba(255,0,0,.08)",
              border: "1px solid var(--border)",
              fontSize: 13,
            }}
          >
            <strong>Error:</strong> {err}
          </div>
        )}

        <Card title="Feed">
          <div
            style={{
              position: "sticky",
              top: 12,
              zIndex: 20,
              paddingBottom: 12,
            }}
          >
            <div
              style={{
                padding: isMobile ? "0 12px 12px" : 12,
                borderRadius: isMobile ? 0 : 14,
                background: isMobile ? "transparent" : "var(--muted)",
                border: isMobile ? "none" : "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <CourseDropdown
                    courses={coursesLite}
                    selectedCourseId={selectedCourse?.id ?? null}
                    onSelect={(id) => {
                      const c = courses.find((x) => x.id === id);
                      if (c) setSelectedCourse(c);
                    }}
                    onClear={() => clearSelectedCourse()}
                    placeholder="Choose course"
                  />

                  {!selectedCourse ? (
                    <div style={{ fontSize: 12, color: "var(--sub)" }}>
                      Pick a course before posting.
                    </div>
                  ) : null}
                </div>

                <div style={{ marginLeft: "auto" }}>
                  <select
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(
                        e.target.value as "PUBLIC" | "FOLLOWERS" | "PRIVATE",
                      )
                    }
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      fontWeight: 800,
                    }}
                    disabled={posting}
                  >
                    <option value="PUBLIC">🌍 Public</option>
                    <option value="FOLLOWERS">👥 Followers</option>
                    <option value="PRIVATE">🔒 Private</option>
                  </select>
                </div>
              </div>

              <textarea
                ref={draftRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (err) setErr(null);
                }}
                placeholder="What’s your golf moment?"
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: 10,
                  borderRadius: isMobile ? 0 : 12,
                  border: isMobile ? "none" : "1px solid var(--border)",
                  padding: 10,
                  background: isMobile ? "transparent" : "var(--card)",
                  color: "var(--text)",
                }}
                disabled={posting}
              />

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginTop: 10,
                  flexWrap: isMobile ? "wrap" : "nowrap",
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={posting}
                />

                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {!selectedCourse && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--sub)",
                      }}
                    >
                      Choose a course first
                    </span>
                  )}

                  {selectedCourse && !draft.trim() && !file && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--sub)",
                      }}
                    >
                      Write something or add an image
                    </span>
                  )}

                  <button
                    onClick={submitPost}
                    disabled={posting || (!draft.trim() && !file)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "var(--text)",
                      color: "var(--bg)",
                      fontWeight: 800,
                      cursor:
                        posting || !selectedCourse || (!draft.trim() && !file)
                          ? "default"
                          : "pointer",
                      opacity:
                        posting || !selectedCourse || (!draft.trim() && !file)
                          ? 0.5
                          : 1,
                    }}
                    type="button"
                  >
                    {posting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>

              {preview && (
                <img
                  src={preview}
                  alt="preview"
                  style={{
                    marginTop: 10,
                    borderRadius: 12,
                    maxWidth: "100%",
                    border: "1px solid var(--border)",
                  }}
                />
              )}
            </div>
          </div>

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
                  style={{
                    fontSize: 18,
                    marginBottom: 8,
                    color: "var(--text)",
                  }}
                >
                  Dein Feed ist noch leer 👀
                </div>

                <div style={{ opacity: 0.85, lineHeight: 1.5 }}>
                  Folge anderen Golfern oder Golfplätzen, um Posts in deinem
                  Feed zu sehen.
                </div>

                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => nav("/map")}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      cursor: "pointer",
                    }}
                  >
                    Plätze entdecken
                  </button>
                </div>
              </div>
            ) : null}

            {posts.map((p) => {
              const lat = Number(p.course.lat);
              const lon = Number(p.course.lon);
              const canSelectCourse =
                Number.isFinite(lat) && Number.isFinite(lon);
              const isCourseFollowed = followedCourseIds.includes(p.course.id);
              const isCourseFollowBusy = courseFollowBusyId === p.course.id;

              return (
                <div key={p.id}>
                  <PostCard
                    post={p}
                    isMobile={isMobile}
                    isCommentTarget={activeCommentPostId === p.id}
                    onCommentClick={(postId) => setActiveCommentPostId(postId)}
                    onSelectCourse={
                      canSelectCourse
                        ? () => {
                            setSelectedCourse({
                              id: p.course.id,
                              name: p.course.name,
                              lat,
                              lon,
                            });
                            nav(`/map?courseId=${p.course.id}`);
                          }
                        : undefined
                    }
                    courseFollowed={isCourseFollowed}
                    courseFollowBusy={isCourseFollowBusy}
                    onCourseFollowToggle={handleToggleCourseFollow}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {activeCommentPost ? (
        <CommentModal
          post={activeCommentPost}
          isMobile={isMobile}
          onClose={() => setActiveCommentPostId(null)}
        />
      ) : null}
    </>
  );
}
