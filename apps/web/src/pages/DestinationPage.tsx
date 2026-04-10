import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import PostCard from "../components/PostCard";
import CommentModal from "../components/CommentModal";

const COUNTRY_NAMES: Record<string, string> = {
  TH: "Thailand",
  VN: "Vietnam",
  PT: "Portugal",
  ES: "Spain",
  TR: "Turkey",
  AE: "United Arab Emirates",
  CH: "Switzerland",
  DE: "Germany",
  AT: "Austria",
  FR: "France",
  IT: "Italy",
  US: "United States",
};

function getCountryName(code?: string) {
  if (!code) return "";
  return COUNTRY_NAMES[code] || code;
}

function getFlagEmoji(countryCode?: string) {
  if (!countryCode) return "";
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

type Course = {
  id: string;
  name: string;
  city?: string;
  region?: string;
  holes?: number;
  access?: string;
};

type DestinationDetail = {
  id: string;
  code: string;
  name: string;
  slug: string;
  courseCount: number;
};

type PostImage = { id: string; url: string };

type DestinationPost = {
  id: string;
  content: string;
  createdAt: string;
  visibility?: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  course: {
    id: string;
    name: string;
    lat: string | number;
    lon: string | number;
    country?: string;
    region?: string;
  };
  user: {
    id: string;
    handle: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  images?: PostImage[];
  likes?: { userId: string }[];
  comments?: unknown[];
  _count?: {
    likes?: number;
    comments?: number;
  };
};

type CountryPageData = {
  country: string;
  courseCount: number;
  items: Course[];
  destination?: DestinationDetail | null;
};

export default function DestinationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const isMobile = window.innerWidth <= 980;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CountryPageData | null>(null);
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<DestinationPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"overview" | "courses" | "posts">(
    "overview",
  );

  const featuredCourses = (data?.items ?? []).slice(0, 3);
  const featuredPosts = (posts ?? []).slice(0, 2);

  const openCoursesTab = () => setActiveTab("courses");
  const openPostsTab = () => setActiveTab("posts");
  const [followedCourseIds, setFollowedCourseIds] = useState<string[]>([]);
  const [courseFollowBusyId, setCourseFollowBusyId] = useState<string | null>(
    null,
  );
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

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      setLoading(true);
      try {
        const destinationRes = await fetch(`${API_BASE}/destinations/${slug}`);
        const destinationJson = await destinationRes.json();

        const destination: DestinationDetail | null =
          destinationJson && destinationJson.code ? destinationJson : null;

        if (!destination?.code) {
          setData(null);
          setPosts([]);
          return;
        }

        const coursesRes = await fetch(
          `${API_BASE}/courses/by-country/${destination.code}`,
        );
        const coursesJson = await coursesRes.json();

        setData({
          country: destination.code,
          courseCount: destination.courseCount || 0,
          items: Array.isArray(coursesJson?.items) ? coursesJson.items : [],
          destination,
        });

        setPostsLoading(true);
        try {
          const postsRes = await fetch(
            `${API_BASE}/destinations/${slug}/posts`,
          );
          const postsJson = await postsRes.json();
          const items = Array.isArray(postsJson?.items) ? postsJson.items : [];

          setPosts(
            items.map((post: any) => ({
              ...post,
              course: {
                ...post.course,
                lat: post?.course?.lat ?? 0,
                lon: post?.course?.lon ?? 0,
              },
              likes: Array.isArray(post?.likes) ? post.likes : [],
              comments: Array.isArray(post?.comments) ? post.comments : [],
              _count: {
                likes:
                  typeof post?._count?.likes === "number"
                    ? post._count.likes
                    : Array.isArray(post?.likes)
                      ? post.likes.length
                      : 0,
                comments:
                  typeof post?._count?.comments === "number"
                    ? post._count.comments
                    : Array.isArray(post?.comments)
                      ? post.comments.length
                      : 0,
              },
            })),
          );
        } catch (err) {
          console.error("Failed to load destination posts", err);
          setPosts([]);
        } finally {
          setPostsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load country", err);
        setData(null);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  useEffect(() => {
    loadFollowedCourses();
  }, [loadFollowedCourses]);
  const activeCommentPost =
    posts.find((p) => p.id === activeCommentPostId) ?? null;

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  if (!data) return <div style={{ padding: 20 }}>No data</div>;

  const filteredItems = (data.items || []).filter((c: Course) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.region || "").toLowerCase().includes(q)
    );
  });
  return (
    <div
      style={{
        padding: isMobile ? 12 : 20,
        boxSizing: "border-box",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/destinations")}
        style={{
          border: "none",
          background: "transparent",
          padding: 0,
          marginBottom: 16,
          color: "var(--sub)",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        ← Back to destinations
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 20,
          position: "sticky",
          top: 10,
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: 6,
            borderRadius: 999,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(6px)",
            maxWidth: "100%",
            overflowX: "auto",
          }}
        >
          {[
            { key: "overview", label: "Overview" },
            { key: "courses", label: "Courses" },
            { key: "posts", label: "Posts" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setActiveTab(tab.key as "overview" | "courses" | "posts")
                }
                style={{
                  border: "none",
                  background: isActive
                    ? "var(--text)"
                    : "rgba(255,255,255,0.06)",
                  color: isActive ? "var(--bg)" : "var(--text)",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "8px 14px",
                  borderRadius: 999,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  opacity: isActive ? 1 : 0.75,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "courses" && (
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            marginBottom: 16,
            background: "var(--card)",
            color: "var(--text)",
            outline: "none",
            display: "block",
          }}
        />
      )}

      {activeTab === "overview" && (
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gap: 20,
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: isMobile ? 18 : 28,
              borderRadius: 24,
              border: "1px solid var(--border)",
              background:
                "linear-gradient(135deg, rgba(39,196,107,0.16) 0%, rgba(255,255,255,0.03) 45%, var(--card) 100%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: isMobile ? -30 : -10,
                top: isMobile ? -30 : -20,
                width: isMobile ? 140 : 220,
                height: isMobile ? 140 : 220,
                borderRadius: "50%",
                background: "rgba(39,196,107,0.12)",
                filter: "blur(6px)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: isMobile ? -40 : -20,
                bottom: isMobile ? -50 : -30,
                width: isMobile ? 120 : 180,
                height: isMobile ? 120 : 180,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                filter: "blur(8px)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "grid",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  width: "fit-content",
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text)",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                <span>{getFlagEmoji(data.destination?.code)}</span>
                <span>Golf destination</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  maxWidth: 820,
                }}
              >
                <div
                  style={{
                    fontSize: isMobile ? 32 : 46,
                    fontWeight: 900,
                    lineHeight: 1.02,
                    color: "var(--text)",
                    letterSpacing: -0.8,
                  }}
                >
                  Golf in{" "}
                  {data.destination?.name || getCountryName(data.country)}
                </div>

                <div
                  style={{
                    fontSize: isMobile ? 15 : 17,
                    lineHeight: 1.65,
                    color: "var(--sub)",
                    maxWidth: 760,
                  }}
                >
                  Discover courses, explore local golf activity, and turn{" "}
                  {data.destination?.name || getCountryName(data.country)} into
                  a real destination experience instead of just a simple list of
                  places.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    padding: "9px 13px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  ⛳ {data.courseCount} courses
                </div>

                <div
                  style={{
                    padding: "9px 13px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  🌍 {data.destination?.code || data.country}
                </div>

                <div
                  style={{
                    padding: "9px 13px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  🏌️ Explore experience
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 12,
                  alignItems: isMobile ? "stretch" : "center",
                }}
              >
                <button
                  type="button"
                  onClick={openCoursesTab}
                  style={{
                    border: "none",
                    background: "var(--text)",
                    color: "var(--bg)",
                    height: 44,
                    padding: "0 18px",
                    borderRadius: 999,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  Explore courses
                </button>

                <button
                  type="button"
                  onClick={openPostsTab}
                  style={{
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text)",
                    height: 44,
                    padding: "0 18px",
                    borderRadius: 999,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  View latest posts
                </button>
              </div>
            </div>
          </div>
          <div
            style={{
              padding: isMobile ? 16 : 20,
              borderRadius: 18,
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: isMobile ? 20 : 22,
                    fontWeight: 800,
                    color: "var(--text)",
                  }}
                >
                  Featured Courses
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    color: "var(--sub)",
                  }}
                >
                  A first look at golf courses in{" "}
                  {data.destination?.name || getCountryName(data.country)}.
                </div>
              </div>

              <button
                type="button"
                onClick={openCoursesTab}
                style={{
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  height: 42,
                  padding: "0 16px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontWeight: 700,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                See all courses
              </button>
            </div>

            {featuredCourses.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--sub)",
                  fontSize: 14,
                }}
              >
                No courses found.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {featuredCourses.map((c: Course) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/courses/${c.id}`)}
                    style={{
                      minWidth: isMobile ? 260 : "auto",
                      flex: isMobile ? "0 0 auto" : "1 1 0",
                      borderRadius: 20,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      cursor: "pointer",
                      overflow: "hidden",
                      transition: "all 0.18s ease",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* IMAGE PLACEHOLDER */}
                    <div
                      style={{
                        height: 150,
                        background:
                          "linear-gradient(135deg, rgba(79,140,255,0.55) 0%, rgba(32,48,88,0.55) 55%, rgba(255,255,255,0.06) 100%)",
                        display: "flex",
                        alignItems: "flex-end",
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: "white",
                          background: "rgba(0,0,0,0.45)",
                          padding: "6px 10px",
                          borderRadius: 999,
                          letterSpacing: 0.2,
                        }}
                      >
                        {c.access || "Course"}
                      </div>
                    </div>

                    {/* CONTENT */}
                    <div style={{ padding: 14 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 17,
                          letterSpacing: -0.2,
                          color: "var(--text)",
                          marginBottom: 6,
                        }}
                      >
                        {c.name}
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--sub)",
                          marginBottom: 10,
                        }}
                      >
                        {[c.city, c.region].filter(Boolean).join(" • ")}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          fontSize: 12,
                          color: "var(--sub)",
                        }}
                      >
                        {c.holes && <div>⛳ {c.holes}</div>}
                        {c.access && <div>🌍 {c.access}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              padding: isMobile ? 16 : 20,
              borderRadius: 18,
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: isMobile ? 20 : 22,
                    fontWeight: 800,
                    color: "var(--text)",
                  }}
                >
                  Latest Posts
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    color: "var(--sub)",
                  }}
                >
                  Recent golf activity from{" "}
                  {data.destination?.name || getCountryName(data.country)}.
                </div>
              </div>

              <button
                type="button"
                onClick={openPostsTab}
                style={{
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  height: 42,
                  padding: "0 16px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontWeight: 700,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                See all posts
              </button>
            </div>

            {postsLoading ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--sub)",
                  fontSize: 14,
                }}
              >
                Loading posts...
              </div>
            ) : featuredPosts.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--sub)",
                  fontSize: 14,
                }}
              >
                No posts yet for this destination.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  maxWidth: 700,
                }}
              >
                {featuredPosts.map((p) => (
                  <div key={p.id} style={{ display: "grid", gap: 6 }}>
                    <PostCard
                      post={p}
                      isMobile={isMobile}
                      isCommentTarget={activeCommentPostId === p.id}
                      onCommentClick={(postId) => {
                        setActiveCommentPostId(postId);
                      }}
                      onOpenPost={(postId) => {
                        setActiveCommentPostId(postId);
                      }}
                      onSelectCourse={
                        p.course?.id
                          ? () => {
                              const courseId = p.course?.id;
                              if (!courseId) return;
                              navigate(`/courses/${courseId}`);
                            }
                          : undefined
                      }
                      courseFollowed={followedCourseIds.includes(p.course.id)}
                      courseFollowBusy={courseFollowBusyId === p.course.id}
                      onPostDeleted={(postId) => {
                        setPosts((prev) =>
                          prev.filter((item) => item.id !== postId),
                        );
                      }}
                      onCourseFollowToggle={handleToggleCourseFollow}
                      onPostUpdated={(updatedPost) => {
                        setPosts((prev) =>
                          prev.map((item) =>
                            item.id === updatedPost.id
                              ? {
                                  ...item,
                                  ...updatedPost,
                                }
                              : item,
                          ),
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "courses" && (
        <div style={{ marginTop: 20 }}>
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: 16,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--sub)",
                fontSize: 14,
              }}
            >
              No courses found.
            </div>
          ) : (
            filteredItems.map((c: Course) => (
              <div
                key={c.id}
                onClick={() => navigate(`/courses/${c.id}`)}
                style={{
                  borderRadius: 20,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  cursor: "pointer",
                  overflow: "hidden",
                  transition: "all 0.18s ease",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* HEADER / IMAGE */}
                <div
                  style={{
                    height: 120,
                    background:
                      "linear-gradient(135deg, rgba(79,140,255,0.35), rgba(255,255,255,0.05))",
                    display: "flex",
                    alignItems: "flex-end",
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "white",
                      background: "rgba(0,0,0,0.35)",
                      padding: "4px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {c.access || "Course"}
                  </div>
                </div>

                {/* CONTENT */}
                <div style={{ padding: 14 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 17,
                      letterSpacing: -0.2,
                      color: "var(--text)",
                      marginBottom: 6,
                    }}
                  >
                    {c.name}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--sub)",
                      marginBottom: 10,
                    }}
                  >
                    {[c.city, c.region].filter(Boolean).join(" • ")}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      fontSize: 12,
                      color: "var(--sub)",
                    }}
                  >
                    {c.holes && <div>⛳ {c.holes}</div>}
                    {c.access && <div>🌍 {c.access}</div>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "posts" && (
        <div
          style={{
            marginTop: 28,
            width: "100%",
            minWidth: 0,
            overflowX: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "var(--text)",
              marginBottom: 12,
            }}
          >
            Posts from {data.destination?.name || getCountryName(data.country)}
          </div>

          {postsLoading ? (
            <div
              style={{
                padding: 16,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--sub)",
                fontSize: 14,
              }}
            >
              Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div
              style={{
                padding: 16,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--sub)",
                fontSize: 14,
              }}
            >
              No posts yet for this destination.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {posts.map((p) => (
                <div key={p.id} style={{ display: "grid", gap: 8 }}>
                  <PostCard
                    post={p}
                    isMobile={isMobile}
                    isCommentTarget={activeCommentPostId === p.id}
                    onCommentClick={(postId) => {
                      setActiveCommentPostId(postId);
                    }}
                    onOpenPost={(postId) => {
                      setActiveCommentPostId(postId);
                    }}
                    onSelectCourse={
                      p.course?.id
                        ? () => {
                            const courseId = p.course?.id;
                            if (!courseId) return;
                            navigate(`/courses/${courseId}`);
                          }
                        : undefined
                    }
                    courseFollowed={followedCourseIds.includes(p.course.id)}
                    courseFollowBusy={courseFollowBusyId === p.course.id}
                    onPostDeleted={(postId) => {
                      setPosts((prev) =>
                        prev.filter((item) => item.id !== postId),
                      );
                    }}
                    onCourseFollowToggle={handleToggleCourseFollow}
                    onPostUpdated={(updatedPost) => {
                      setPosts((prev) =>
                        prev.map((item) =>
                          item.id === updatedPost.id
                            ? {
                                ...item,
                                ...updatedPost,
                              }
                            : item,
                        ),
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {activeCommentPost ? (
        <CommentModal
          post={activeCommentPost}
          isMobile={isMobile}
          onClose={() => setActiveCommentPostId(null)}
        />
      ) : null}
    </div>
  );
}
