import { useState } from "react";
import { fileUrl } from "../api/fileUrl";

type PostImage = {
  url: string;
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
};

type PostCardProps = {
  post: Post;
  isMobile: boolean;
};

export default function PostCard({ post, isMobile }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const handleImageTap = () => {
    const now = Date.now();

    if (now - lastTap < 300) {
      setLiked(true);
      setShowHeart(true);

      setTimeout(() => {
        setShowHeart(false);
      }, 700);
    }

    setLastTap(now);
  };
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

      {post.images?.[0]?.url && (
        <div
          style={{
            position: "relative",
            marginTop: 10,
          }}
        >
          <img
            src={fileUrl(post.images[0].url)}
            alt="post"
            onClick={handleImageTap}
            style={{
              borderRadius: isMobile ? 0 : 12,
              width: "100%",
              display: "block",
              border: isMobile ? "none" : "1px solid var(--border)",
            }}
          />

          {showHeart && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                pointerEvents: "none",
              }}
            >
              ❤️
            </div>
          )}
        </div>
      )}

      {/* Like / Comment / Share */}
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
          onClick={() => setLiked(!liked)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: liked ? "#ff4d6d" : "var(--text)",
            fontWeight: 700,
            minWidth: isMobile ? 72 : "auto",
            textAlign: "left",
            padding: isMobile ? "6px 0" : 0,
          }}
        >
          {liked ? "❤️ 1" : "♡ 0"}
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
