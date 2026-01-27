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
    <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={goCompose} disabled={loading}>
        Post
      </button>

      {!loading && !isAuthenticated && (
        <span style={{ fontSize: 12, opacity: 0.75 }}>Login nötig</span>
      )}
    </div>
  );
}
