import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function CoursePopupActions({ courseId }: { courseId: string }) {
  const nav = useNavigate();
  const { loading, isAuthenticated } = useAuth();

  const goCompose = (e: React.MouseEvent) => {
    // wichtig in Leaflet Popups
    e.preventDefault();
    e.stopPropagation();

    nav(`/compose?courseId=${encodeURIComponent(courseId)}`);
  };

  return (
    <div
      style={{
        marginTop: 8,
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap", // 👉 wichtig für Mobile
      }}
    >
      <button onClick={goCompose} disabled={loading}>
        Post
      </button>

      {/* 👉 NEW: Follow Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          console.log("Follow course", courseId);
        }}
        disabled={loading}
      >
        Follow
      </button>

      {!loading && !isAuthenticated && (
        <span style={{ fontSize: 12, opacity: 0.75 }}>Login nötig</span>
      )}
    </div>
  );
}
