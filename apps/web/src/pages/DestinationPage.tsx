import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import PostCard from "../components/PostCard";
import CommentModal from "../components/CommentModal";
import BackToTopButton from "../components/BackToTopButton";
import { DESTINATION_INFO } from "../data/destinationInfo";
import { t } from "../i18n/strings";

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
  JP: "Japan",
  US: "United States",
};

function getCountryName(code?: string) {
  if (!code) return "";
  return COUNTRY_NAMES[code] || code;
}

function getFlagUrl(countryCode?: string) {
  if (!countryCode) return "";

  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
}

const TRAVEL_TIP_ICONS = ["✈️", "🕒", "🌦️", "🚗"];
const LOCAL_KNOWLEDGE_ICONS = ["💡", "🏌️", "📍", "🍽️"];

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
  followerCount?: number;
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
  const { token, logout, user } = useAuth();
  const isMobile = window.innerWidth <= 980;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [slug]);

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
  const [destinationFollowing, setDestinationFollowing] = useState(false);
  const [destinationFollowerCount, setDestinationFollowerCount] = useState(0);
  const [destinationFollowBusy, setDestinationFollowBusy] = useState(false);
  const [followedCourseIds, setFollowedCourseIds] = useState<string[]>([]);
  const [courseFollowBusyId, setCourseFollowBusyId] = useState<string | null>(
    null,
  );

  const featuredCourses = (data?.items ?? []).slice(0, 3);
  const featuredPosts = (posts ?? []).slice(0, 2);
  const info = slug ? DESTINATION_INFO[slug] : undefined;

  const isOwnPost = (p: DestinationPost) => {
    return user?.id && p.user?.id === user.id;
  };

  const isFromFollowedUser = (p: DestinationPost) => {
    return !isOwnPost(p) && p.visibility === "FOLLOWERS";
  };

  const openCoursesTab = () => setActiveTab("courses");
  const openPostsTab = () => setActiveTab("posts");

  const loadDestinationFollowStatus = useCallback(async () => {
    if (!slug) return;

    if (!token) {
      setDestinationFollowing(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/destinations/${slug}/follow-status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        throw new Error(
          `Failed to load destination follow status: ${res.status}`,
        );
      }

      const json = await res.json();

      setDestinationFollowing(!!json?.following);

      if (typeof json?.followerCount === "number") {
        setDestinationFollowerCount(json.followerCount);
      }
    } catch (err) {
      console.error("Failed to load destination follow status", err);
    }
  }, [slug, token, logout]);

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

  const handleToggleDestinationFollow = useCallback(async () => {
    if (!slug) return;
    if (destinationFollowBusy) return;

    if (!token) {
      navigate("/");
      return;
    }

    const currentlyFollowing = destinationFollowing;

    try {
      setDestinationFollowBusy(true);

      setDestinationFollowing(!currentlyFollowing);
      setDestinationFollowerCount((prev) =>
        currentlyFollowing ? Math.max(0, prev - 1) : prev + 1,
      );

      const res = await fetch(`${API_BASE}/destinations/${slug}/follow`, {
        method: currentlyFollowing ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error("Unauthorized");
      }

      if (!res.ok) {
        throw new Error(`Destination follow request failed: ${res.status}`);
      }

      const json = await res.json();

      if (typeof json?.following === "boolean") {
        setDestinationFollowing(json.following);
      }

      if (typeof json?.followerCount === "number") {
        setDestinationFollowerCount(json.followerCount);
      }
    } catch (err) {
      setDestinationFollowing(currentlyFollowing);
      setDestinationFollowerCount((prev) =>
        currentlyFollowing ? prev + 1 : Math.max(0, prev - 1),
      );
      console.error("Destination follow toggle failed", err);
    } finally {
      setDestinationFollowBusy(false);
    }
  }, [
    slug,
    token,
    logout,
    navigate,
    destinationFollowBusy,
    destinationFollowing,
  ]);

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

        setDestinationFollowerCount(
          typeof destination.followerCount === "number"
            ? destination.followerCount
            : 0,
        );

        setPostsLoading(true);
        try {
          const postsRes = await fetch(
            `${API_BASE}/destinations/${slug}/posts`,
            token
              ? {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              : undefined,
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
  }, [slug, token]);

  useEffect(() => {
    loadFollowedCourses();
  }, [loadFollowedCourses]);

  useEffect(() => {
    loadDestinationFollowStatus();
  }, [loadDestinationFollowStatus]);

  const activeCommentPost =
    posts.find((p) => p.id === activeCommentPostId) ?? null;

  if (loading) return <div style={{ padding: 20 }}>{t("loading")}</div>;
  if (!data) return <div style={{ padding: 20 }}>{t("no_data")}</div>;

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
        ← {t("back_to_destinations")}
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 18,
          position: "sticky",
          top: 10,
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: 4,
            borderRadius: 999,
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
            maxWidth: "100%",
            overflowX: "auto",
          }}
        >
          {[
            { key: "overview", label: t("overview") },
            { key: "courses", label: t("courses") },
            { key: "posts", label: t("posts") },
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
                  border: isActive ? "none" : "1px solid transparent",
                  background: isActive ? "var(--text)" : "transparent",
                  color: isActive ? "var(--bg)" : "var(--sub)",
                  fontWeight: isActive ? 800 : 700,
                  fontSize: 13,
                  padding: "9px 16px",
                  borderRadius: 999,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  opacity: isActive ? 1 : 0.95,
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
          placeholder={t("search_courses")}
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
                position: "relative",
                zIndex: 1,
                display: "grid",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 44,
                    minWidth: 64,
                    maxWidth: 64,
                    minHeight: 44,
                    maxHeight: 44,
                    borderRadius: 8,
                    overflow: "hidden",
                    flexShrink: 0,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                >
                  <img
                    src={getFlagUrl(data.destination?.code)}
                    alt={data.destination?.code || data.country}
                    style={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 2,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      color: "var(--sub)",
                      textTransform: "uppercase",
                    }}
                  >
                    {t("golf_destination")}
                  </div>

                  <div
                    style={{
                      fontSize: isMobile ? 36 : 52,
                      fontWeight: 900,
                      lineHeight: 1.05,
                      color: "var(--text)",
                      letterSpacing: -0.6,
                    }}
                  >
                    {data.destination?.name || getCountryName(data.country)}
                  </div>
                </div>
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
                    fontSize: isMobile ? 15 : 17,
                    lineHeight: 1.65,
                    color: "var(--sub)",
                    maxWidth: 760,
                  }}
                >
                  {t("destination_intro_prefix")}
                  {data.destination?.name || getCountryName(data.country)}
                  {t("destination_intro_suffix")}
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
                  ⛳ {data.courseCount} {t("course_plural")}
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
                  👥 {destinationFollowerCount}{" "}
                  {destinationFollowerCount === 1
                    ? t("follower_singular")
                    : t("follower_plural")}
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 13px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <span>
                    {data.destination?.name || getCountryName(data.country)}
                  </span>
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
                  🏌️ {t("explore_experience")}
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
                  onClick={handleToggleDestinationFollow}
                  disabled={destinationFollowBusy}
                  style={{
                    border: destinationFollowing
                      ? "1px solid var(--border)"
                      : "none",
                    background: destinationFollowing
                      ? "rgba(255,255,255,0.05)"
                      : "var(--text)",
                    color: destinationFollowing ? "var(--text)" : "var(--bg)",
                    height: 44,
                    padding: "0 18px",
                    borderRadius: 999,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: destinationFollowBusy ? "default" : "pointer",
                    width: isMobile ? "100%" : "auto",
                    opacity: destinationFollowBusy ? 0.7 : 1,
                  }}
                >
                  {destinationFollowBusy
                    ? t("please_wait")
                    : destinationFollowing
                      ? t("following_destination")
                      : t("follow_destination")}
                </button>

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
                  {t("explore_courses")}
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
                  {t("view_latest_posts")}
                </button>
              </div>
            </div>
          </div>

          {info?.bestTime ? (
            <div
              style={{
                padding: isMobile ? 16 : 20,
                borderRadius: 18,
                border: "1px solid var(--border)",
                background: "var(--card)",
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? 20 : 22,
                  fontWeight: 800,
                  color: "var(--text)",
                }}
              >
                ⛳ {t("best_time_to_play")}
              </div>

              <div
                style={{
                  fontSize: 14,
                  color: "var(--sub)",
                  lineHeight: 1.45,
                }}
              >
                {t("seasonal_golf_overview_prefix")}
                {data.destination?.name || getCountryName(data.country)}.
              </div>

              {info.bestTime.map((item: any, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 13,
                    borderTop: i === 0 ? "none" : "1px solid var(--border)",
                    paddingTop: i === 0 ? 0 : 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text)" }}>
                    {item.label}
                  </div>

                  <div
                    style={{
                      color: "var(--sub)",
                      textAlign: isMobile ? "left" : "right",
                      maxWidth: isMobile ? "100%" : "60%",
                    }}
                  >
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {info?.highlights?.length ? (
            <div
              style={{
                padding: isMobile ? 14 : 18,
                borderRadius: 18,
                border: "1px solid var(--border)",
                background: "var(--card)",
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--text)",
                }}
              >
                📍 {t("highlights")}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "var(--sub)",
                  lineHeight: 1.45,
                }}
              >
                {t("highlights_hint_prefix")}
                {data.destination?.name || getCountryName(data.country)}.
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 10,
                }}
              >
                {info.highlights.map(
                  (
                    item: {
                      label: string;
                      query: string;
                    },
                    i: number,
                  ) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSearch(item.query);
                        setActiveTab("courses");
                      }}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 999,
                        background: "var(--bg)",
                        padding: "8px 11px",
                        fontSize: 13,
                        color: "var(--text)",
                        lineHeight: 1.2,
                        textAlign: "left",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      {item.label}
                    </button>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {info?.travelTips?.length ? (
            <div
              style={{
                padding: isMobile ? 14 : 18,
                borderRadius: 18,
                border: "1px solid var(--border)",
                background: "var(--card)",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div
                  style={{
                    fontSize: isMobile ? 19 : 21,
                    fontWeight: 850,
                    color: "var(--text)",
                  }}
                >
                  Travel Tips
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--sub)",
                    lineHeight: 1.45,
                  }}
                >
                  Practical notes for planning a smoother golf trip.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {info.travelTips.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      background: "var(--bg)",
                      padding: "12px",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--text)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {TRAVEL_TIP_ICONS[i % TRAVEL_TIP_ICONS.length]}
                    </div>
                    <div
                      style={{
                        minWidth: 0,
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "var(--text)",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--sub)",
                          lineHeight: 1.45,
                        }}
                      >
                        {item.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {info?.localKnowledge?.length ? (
            <div
              style={{
                padding: isMobile ? 16 : 20,
                borderRadius: 18,
                border: "1px solid var(--border)",
                background: "var(--card)",
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div
                  style={{
                    fontSize: isMobile ? 19 : 21,
                    fontWeight: 850,
                    color: "var(--text)",
                  }}
                >
                  Local Knowledge
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--sub)",
                    lineHeight: 1.45,
                  }}
                >
                  Small details that help the destination feel familiar faster.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 10,
                }}
              >
                {info.localKnowledge.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      background: "var(--bg)",
                      padding: "12px",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--text)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {LOCAL_KNOWLEDGE_ICONS[i % LOCAL_KNOWLEDGE_ICONS.length]}
                    </div>
                    <div
                      style={{
                        minWidth: 0,
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "var(--text)",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--sub)",
                          lineHeight: 1.45,
                        }}
                      >
                        {item.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {info?.featuredRegions?.length ? (
            <div
              style={{
                padding: isMobile ? 16 : 20,
                borderRadius: 18,
                border: "1px solid var(--border)",
                background: "var(--card)",
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div
                  style={{
                    fontSize: isMobile ? 19 : 21,
                    fontWeight: 850,
                    color: "var(--text)",
                  }}
                >
                  Featured Regions
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--sub)",
                    lineHeight: 1.45,
                  }}
                >
                  Start with the most recognizable golf areas for this
                  destination.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {info.featuredRegions.map((region) => (
                  <button
                    key={region.query}
                    type="button"
                    onClick={() => {
                      setSearch(region.query);
                      setActiveTab("courses");
                    }}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 999,
                      background: "var(--bg)",
                      color: "var(--text)",
                      padding: "9px 12px",
                      fontSize: 13,
                      fontWeight: 800,
                      lineHeight: 1.2,
                      cursor: "pointer",
                    }}
                  >
                    {region.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div
            style={{
              padding: isMobile ? 16 : 20,
              borderRadius: 18,
              border: "1px solid var(--border)",
              background: "var(--card)",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                flexShrink: 0,
              }}
            >
              💬
            </div>

            <div style={{ minWidth: 0, display: "grid", gap: 5 }}>
              <div
                style={{
                  fontSize: isMobile ? 18 : 20,
                  fontWeight: 850,
                  color: "var(--text)",
                }}
              >
                Community Tips
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--sub)",
                  lineHeight: 1.45,
                }}
              >
                Coming soon: player notes, recent tips, and local updates from
                Fairwayd golfers.
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
                  {t("featured_courses")}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    color: "var(--sub)",
                  }}
                >
                  {t("featured_courses_intro_prefix")}
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
                {t("see_all_courses")}
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
                {t("no_courses_found")}
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
                      borderRadius: 18,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      cursor: "pointer",
                      overflow: "hidden",
                      transition: "transform 0.18s ease, box-shadow 0.18s ease",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 18px rgba(0,0,0,0.10)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 14px rgba(0,0,0,0.08)";
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "scale(0.98)";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                  >
                    <div
                      style={{
                        height: 46,
                        background:
                          "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(79,140,255,0.10) 45%, rgba(255,255,255,0.02) 100%)",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "var(--text)",
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          padding: "6px 10px",
                          borderRadius: 999,
                          letterSpacing: 0.2,
                        }}
                      >
                        {c.access || t("course")}
                      </div>
                    </div>

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
                  {t("latest_posts")}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    color: "var(--sub)",
                  }}
                >
                  {t("latest_posts_intro_prefix")}
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
                {t("see_all_posts")}
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
                {t("loading_posts")}
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
                {t("no_posts_destination")}
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
              {t("no_courses_found")}
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
                  marginBottom: 12,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ padding: 14, display: "grid", gap: 8 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: 999,
                      width: "fit-content",
                      background:
                        c.access === "PRIVATE"
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(39,196,107,0.18)",
                      color:
                        c.access === "PRIVATE"
                          ? "var(--text)"
                          : "rgb(39,196,107)",
                      border:
                        c.access === "PRIVATE"
                          ? "1px solid var(--border)"
                          : "1px solid rgba(39,196,107,0.35)",
                    }}
                  >
                    {c.access || t("course")}
                  </div>
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
            {t("posts_from")}{" "}
            {data.destination?.name || getCountryName(data.country)}
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
              {t("loading_posts")}
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
              {t("no_posts_destination")}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {posts.map((p) => (
                <div key={p.id} style={{ display: "grid", gap: 6 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--sub)",
                      marginLeft: 6,
                    }}
                  >
                    {isOwnPost(p)
                      ? t("your_post")
                      : isFromFollowedUser(p)
                        ? t("from_someone_you_follow")
                        : t("public_post")}
                  </div>

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

      <BackToTopButton />
    </div>
  );
}
