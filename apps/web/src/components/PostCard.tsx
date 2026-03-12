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
  return (
    <div
      style={{
        padding: isMobile ? "6px 0" : 12,
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
        <img
          src={fileUrl(post.images[0].url)}
          alt="post"
          style={{
            marginTop: 10,
            borderRadius: isMobile ? 0 : 12,
            width: "100%",
            display: "block",
            border: isMobile ? "none" : "1px solid var(--border)",
          }}
        />
      )}
    </div>
  );
}
