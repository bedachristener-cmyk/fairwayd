import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { fileUrl } from "../api/fileUrl";
import { useAuth } from "../auth/AuthContext";
import { t } from "../i18n/strings";

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
  onCommentCreated?: (postId: string) => void;
};

export default function CommentModal({
  post,
  isMobile,
  onClose,
  onCommentCreated,
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

  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<string>>(
    () => new Set(),
  );

  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  const renderAvatar = (
    avatarUrl?: string | null,
    name?: string | null,
    handle?: string | null,
  ) => {
    const label = (name?.trim() || handle?.trim() || "?")
      .slice(0, 1)
      .toUpperCase();

    return (
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          border: "1px solid var(--border)",
          background: "var(--muted)",
          display: "grid",
          placeItems: "center",
          fontSize: 13,
          fontWeight: 900,
          color: "var(--text)",
        }}
      >
        {avatarUrl ? (
          <img
            src={fileUrl(avatarUrl)}
            alt={name || handle || "avatar"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          label
        )}
      </div>
    );
  };

  const validImages =
    post.images?.filter(
      (img): img is { id: string; url: string } =>
        typeof img?.url === "string" && img.url.length > 0,
    ) ?? [];

  const getVisibilityLabel = (visibility?: string | null) => {
    if (visibility === "PUBLIC") return `\u{1F30D} ${t("visibility_public")}`;
    if (visibility === "FOLLOWERS")
      return `\u{1F465} ${t("visibility_followers")}`;
    if (visibility === "PRIVATE") return `\u{1F512} ${t("visibility_private")}`;
    return null;
  };

  const getReplyCountLabel = (count: number) =>
    `${count} ${count === 1 ? t("reply_singular") : t("reply_plural")}`;

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
      onCommentCreated?.(post.id);
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
      onCommentCreated?.(post.id);
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

  const toggleReplies = (commentId: string) => {
    setExpandedReplyIds((prev) => {
      const next = new Set(prev);

      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }

      return next;
    });
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
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                {renderAvatar(
                  reply.user?.avatarUrl,
                  reply.user?.name,
                  reply.user?.handle,
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "inline-block",
                      maxWidth: "100%",
                      padding: "8px 11px",
                      borderRadius: 16,
                      background: "var(--card)",
                      border: "1px solid var(--border)",
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
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        margin: 0,
                        fontWeight: 800,
                        fontSize: 13,
                        color: "var(--text)",
                        cursor: reply.user?.handle ? "pointer" : "default",
                        textAlign: "left",
                      }}
                    >
                      {reply.user?.name || `@${reply.user?.handle ?? "user"}`}
                    </button>

                    <div
                      style={{
                        fontSize: 14,
                        marginTop: 3,
                        lineHeight: 1.45,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {reply.content}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginTop: 5,
                      paddingLeft: 8,
                      fontSize: 12,
                      color: "var(--sub)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleCommentLike(reply.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: reply.likedByMe ? "#ff4d6d" : "var(--sub)",
                        fontWeight: 800,
                        cursor: "pointer",
                        padding: 0,
                        fontSize: 12,
                      }}
                    >
                      {reply.likedByMe ? t("liked") : t("like")}
                    </button>

                    <button
                      type="button"
                      onClick={() => openReplyBox(reply.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--sub)",
                        fontWeight: 800,
                        cursor: "pointer",
                        padding: 0,
                        fontSize: 12,
                      }}
                    >
                      {isReplyBoxOpen ? t("cancel") : t("reply")}
                    </button>

                    <span>
                      {reply.createdAt
                        ? new Date(reply.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>

                    {(reply._count?.likes ?? 0) > 0 ? (
                      <span>❤️ {reply._count?.likes ?? 0}</span>
                    ) : null}
                  </div>
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
                      {t("cancel")}
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
                      {replySending ? t("posting") : t("reply_post")}
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
    const replyCount = comment.replies?.length ?? 0;

    return (
      <div key={comment.id} style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          {renderAvatar(
            comment.user?.avatarUrl,
            comment.user?.name,
            comment.user?.handle,
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "inline-block",
                maxWidth: "100%",
                padding: "8px 11px",
                borderRadius: 16,
                background: "var(--card)",
                border: "1px solid var(--border)",
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
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  margin: 0,
                  fontWeight: 800,
                  fontSize: 13,
                  color: "var(--text)",
                  cursor: comment.user?.handle ? "pointer" : "default",
                  textAlign: "left",
                }}
              >
                {comment.user?.name || `@${comment.user?.handle ?? "user"}`}
              </button>

              <div
                style={{
                  fontSize: 14,
                  marginTop: 3,
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {comment.content}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                marginTop: 5,
                paddingLeft: 8,
                fontSize: 12,
                color: "var(--sub)",
              }}
            >
              <button
                type="button"
                onClick={() => handleToggleCommentLike(comment.id)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: comment.likedByMe ? "#ff4d6d" : "var(--sub)",
                  fontWeight: 800,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12,
                }}
              >
                {comment.likedByMe ? t("liked") : t("like")}
              </button>

              <button
                type="button"
                onClick={() => openReplyBox(comment.id)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--sub)",
                  fontWeight: 800,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12,
                }}
              >
                {isReplyBoxOpen ? t("cancel") : t("reply")}
              </button>

              <span>
                {comment.createdAt
                  ? new Date(comment.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </span>

              {(comment._count?.likes ?? 0) > 0 ? (
                <span>❤️ {comment._count?.likes ?? 0}</span>
              ) : null}
            </div>

            {replyCount > 0 ? (
              <button
                type="button"
                onClick={() => toggleReplies(comment.id)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "6px 0 0 8px",
                  fontSize: 12,
                  color: "var(--sub)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {expandedReplyIds.has(comment.id)
                  ? t("replies_hide")
                  : getReplyCountLabel(replyCount)}
              </button>
            ) : null}

            {isReplyBoxOpen ? (
              <div
                style={{
                  marginTop: 8,
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
                    borderRadius: 16,
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
                      padding: "7px 11px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text)",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {t("cancel")}
                  </button>

                  <button
                    type="button"
                    onClick={handlePostReply}
                    disabled={!replyDraft.trim() || replySending}
                    style={{
                      padding: "7px 11px",
                      borderRadius: 999,
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
                    {replySending ? t("posting") : t("reply_post")}
                  </button>
                </div>
              </div>
            ) : null}

            {expandedReplyIds.has(comment.id)
              ? renderReplies(comment.replies)
              : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: isMobile
          ? "color-mix(in srgb, var(--bg) 92%, var(--green) 8%)"
          : "rgba(0,0,0,0.62)",
        zIndex: 10000,
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
          background: "color-mix(in srgb, var(--card) 96%, var(--bg))",
          color: "var(--text)",
          border: isMobile ? "none" : "1px solid var(--border)",
          borderRadius: isMobile ? 0 : 28,
          boxShadow: isMobile ? "none" : "0 24px 70px rgba(0,0,0,0.42)",
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
            gap: 12,
            padding: isMobile
              ? "calc(12px + env(safe-area-inset-top, 0px)) 16px 12px"
              : "16px 18px",
            borderBottom: "1px solid color-mix(in srgb, var(--border) 76%, transparent)",
            background: "color-mix(in srgb, var(--card) 88%, transparent)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 850, fontSize: 17, letterSpacing: -0.2 }}>
              {t("comments_title")}
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 12,
                color: "var(--sub)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {post.course.name}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            style={{
              width: 38,
              height: 38,
              border: "1px solid var(--border)",
              background: "var(--muted)",
              color: "var(--text)",
              borderRadius: 999,
              padding: 0,
              fontWeight: 800,
              fontSize: 20,
              lineHeight: 1,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: isMobile ? "14px 14px 0" : 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
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
              gap: 16,
              paddingBottom: isMobile ? 120 : 16,
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              style={{
                border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
                borderRadius: 22,
                overflow: "hidden",
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--card) 96%, var(--green) 4%), color-mix(in srgb, var(--card) 98%, var(--bg)))",
                boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
              }}
            >
              <div style={{ padding: "14px 14px 12px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: 11,
                    alignItems: "flex-start",
                  }}
                >
                  {renderAvatar(
                    post.user?.avatarUrl,
                    post.user?.name,
                    post.user?.handle,
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button
                      type="button"
                      onClick={handleOpenCourse}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: "0 0 5px 0",
                        fontWeight: 850,
                        fontSize: 17,
                        color: "var(--text)",
                        cursor: "pointer",
                        textAlign: "left",
                        lineHeight: 1.2,
                      }}
                      title="Open course"
                    >
                      {post.course.name}
                    </button>

                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--sub)",
                        marginBottom: 10,
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
                            {getVisibilityLabel(post.visibility)}
                          </span>
                        </>
                      ) : null}
                    </div>

                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.55,
                        color: "var(--text)",
                        fontSize: 14,
                      }}
                    >
                      {post.content}
                    </div>
                  </div>
                </div>
              </div>

              {validImages.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: "0 14px 14px",
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
                        height: "auto",
                        display: "block",
                        objectFit: "contain",
                        maxHeight: isMobile ? "min(260px, 32vh)" : 420,
                        borderRadius: 16,
                        border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                        background: "var(--muted)",
                        boxSizing: "border-box",
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
                paddingTop: 2,
              }}
            >
              {loading ? (
                <div
                  style={{
                    padding: 18,
                    borderRadius: 20,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 13,
                    color: "var(--sub)",
                    textAlign: "center",
                  }}
                >
                  {t("comments_loading")}
                </div>
              ) : comments.length === 0 ? (
                <div
                  style={{
                    padding: "22px 18px",
                    borderRadius: 22,
                    border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
                    background: "color-mix(in srgb, var(--muted) 72%, transparent)",
                    color: "var(--sub)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 850,
                      color: "var(--text)",
                      marginBottom: 4,
                    }}
                  >
                    {t("comments_empty")}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Be the first to add a thought.
                  </div>
                </div>
              ) : (
                comments.map((comment) => renderComment(comment))
              )}
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid color-mix(in srgb, var(--border) 76%, transparent)",
              padding: isMobile
                ? "12px 14px calc(18px + env(safe-area-inset-bottom, 0px))"
                : "14px 18px 18px",
              display: "grid",
              gap: 10,
              background: "color-mix(in srgb, var(--card) 92%, transparent)",
              backdropFilter: "blur(16px)",
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
              placeholder={t("comment_placeholder")}
              rows={2}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 12,
                borderRadius: 18,
                border: "1px solid var(--border)",
                background: "var(--muted)",
                color: "var(--text)",
                resize: "vertical",
                outline: "none",
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
                  minHeight: 40,
                  borderRadius: 999,
                  border: "1px solid color-mix(in srgb, var(--green) 72%, var(--border))",
                  background: "var(--green)",
                  color: "white",
                  fontWeight: 850,
                  cursor:
                    commentDraft.trim() && !sending ? "pointer" : "default",
                  opacity: commentDraft.trim() && !sending ? 1 : 0.5,
                }}
              >
                {sending ? t("posting") : t("comment_post")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
