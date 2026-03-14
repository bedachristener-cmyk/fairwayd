import { useState } from "react";
import { fileUrl } from "../api/fileUrl";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

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
};

type PostCardProps = {
  post: Post;
  isMobile: boolean;
};

export default function PostCard({ post, isMobile }: PostCardProps) {
  const { token, user } = useAuth();

  const currentUserId = user?.id ?? null;

  const [liked, setLiked] = useState(
    post.likes?.some((l) => l.userId === currentUserId) ?? false,
  );
  const [likeCount, setLikeCount] = useState(post.likes?.length ?? 0);
  const [likeBusy, setLikeBusy] = useState(false);

  const handleLikeClick = async () => {
    console.log("LIKE CLICKED");

    if (likeBusy || !token) return;

    try {
      setLikeBusy(true);

      const method = liked ? "DELETE" : "POST";

      const res = await fetch(`${API_BASE}/posts/${post.id}/like`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Like request failed: ${res.status}`);
      }

      if (liked) {
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } catch (err) {
      console.error("Failed to toggle like", err);
    } finally {
      setLikeBusy(false);
    }
  };

  const validImages =
    post.images?.filter(
      (img): img is { url: string } =>
        typeof img.url === "string" && img.url.length > 0,
    ) ?? [];

  return (
    <div
      style={{
        padding: isMobile ? 0 : 12,
        borderRadius: isMobile ? 0 : 14,
        background: isMobile ? "transparent" : "rgba(0,0,0,.10)",
        border: isMobile ? "none" : "1px solid var(--border)",
        borderBottom: isMobile ? "1px solid var(--border)" : undefined,
        color: "var(--text)",
      }}
    >
      <div style={{ fontWeight: 900 }}>{post.course.name}</div>

      <div style={{ fontSize: 12, color: "var(--sub)" }}>
        @{post.user.handle} · {new Date(post.createdAt).toLocaleString()}
        {post.visibility ? ` · ${post.visibility}` : ""}
      </div>

      <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{post.content}</div>

      {validImages.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            marginTop: 10,
          }}
        >
          {validImages.map((img) => (
            <div
              key={img.url}
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 14,
                background: "var(--muted)",
                minHeight: 120,
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
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: isMobile ? 8 : 12,
          alignItems: "center",
          marginTop: 10,
          fontSize: 14,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleLikeClick}
          disabled={likeBusy}
          style={{
            background: "transparent",
            border: "none",
            cursor: likeBusy ? "default" : "pointer",
            color: liked ? "#ff4d6d" : "var(--text)",
            fontWeight: 700,
            minWidth: isMobile ? 72 : "auto",
            textAlign: "left",
            padding: isMobile ? "6px 0" : 0,
            opacity: likeBusy ? 0.7 : 1,
          }}
        >
          {liked ? "❤️" : "♡"} {likeCount}
        </button>

        <button
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text)",
            fontWeight: 700,
            minWidth: isMobile ? 72 : "auto",
            textAlign: "left",
            padding: isMobile ? "6px 0" : 0,
          }}
        >
          💬 Comment
        </button>

        <button
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text)",
            fontWeight: 700,
            minWidth: isMobile ? 72 : "auto",
            textAlign: "left",
            padding: isMobile ? "6px 0" : 0,
          }}
        >
          🔗 Share
        </button>
      </div>
    </div>
  );
}
