import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { fileUrl } from "../api/fileUrl";
import { useAuth } from "../auth/AuthContext";

type PostImage = {
  id: string;
  url: string;
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

export type CommentModalPost = {
  id: string;
  content: string;
  createdAt: string;
  visibility?: string | null;
  user: PostUser;
  course: PostCourse;
  images?: PostImage[];
};

type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  likedByMe?: boolean;
  _count?: {
    likes?: number;
  };
  user: {
    id: string;
    handle: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  replies?: CommentItem[];
};

type CommentModalProps = {
  post: CommentModalPost;
  isMobile: boolean;
  onClose: () => void;
};

export default function CommentModal({
  post,
  isMobile,
  onClose,
}: CommentModalProps) {
  const { token } = useAuth();
  const nav = useNavigate();

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentDraft, setCommentDraft] = useState("");
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

  function handleCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void handlePostComment();
    }
  }

  const handleOpenCourse = () => {
    if (!post.course?.id) return;
    onClose();
    nav(`/courses/${post.course.id}`);
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
                <button
                  type="button"
                  onClick={() => {
                    const handle = reply.user?.handle?.trim();
                    if (!handle) return;
                    nav(`/u/${handle}`);
                  }}
                  disabled={!reply.user?.handle}
                  title={
                    reply.user?.handle
                      ? `Open @${reply.user.handle}`
                      : undefined
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    margin: 0,
                    fontWeight: 700,
                    color: "var(--text)",
                    cursor: reply.user?.handle ? "pointer" : "default",
                    textAlign: "left",
                  }}
                >
                  @{reply.user?.handle ?? "user"}
                </button>

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
          <button
            type="button"
            onClick={() => {
              const handle = comment.user?.handle?.trim();
              if (!handle) return;
              nav(`/u/${handle}`);
            }}
            disabled={!comment.user?.handle}
            title={
              comment.user?.handle ? `Open @${comment.user.handle}` : undefined
            }
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              margin: 0,
              fontWeight: 700,
              color: "var(--text)",
              cursor: comment.user?.handle ? "pointer" : "default",
              textAlign: "left",
            }}
          >
            @{comment.user?.handle ?? "user"}
          </button>

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
