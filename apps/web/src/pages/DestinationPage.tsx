import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { fileUrl } from "../api/fileUrl";
import { useAuth } from "../auth/AuthContext";
import PostCard from "../components/PostCard";
import CommentModal from "../components/CommentModal";
import BackToTopButton from "../components/BackToTopButton";
import ImageLightbox from "../components/ImageLightbox";
import { DestinationRowsSkeleton, EmptyState } from "../components/PolishStates";
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

type DestinationTip = {
  id: string;
  text: string;
  createdAt: string;
  helpfulCount: number;
  viewerHasMarkedHelpful: boolean;
  user: {
    id: string;
    handle?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  };
};

type CountryPageData = {
  country: string;
  courseCount: number;
  items: Course[];
  destination?: DestinationDetail | null;
};

function formatTipDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function DestinationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { token, logout, user } = useAuth();
  const isMobile = window.innerWidth <= 980;
  const overviewExperienceRef = useRef<HTMLDivElement | null>(null);
  const galleryTouchStartXRef = useRef<number | null>(null);
  const galleryTouchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [slug]);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CountryPageData | null>(null);
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<DestinationPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [destinationTips, setDestinationTips] = useState<DestinationTip[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipText, setTipText] = useState("");
  const [tipSubmitting, setTipSubmitting] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);
  const [helpfulBusyTipId, setHelpfulBusyTipId] = useState<string | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );
  const [galleryImageIndex, setGalleryImageIndex] = useState<number | null>(
    null,
  );
  const [galleryCarouselIndex, setGalleryCarouselIndex] = useState(0);
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
  const heroImage = info?.heroImage;
  const galleryImages = info?.galleryImages ?? [];
  const hasMultipleGalleryImages = galleryImages.length > 1;

  useEffect(() => {
    setGalleryCarouselIndex(0);
  }, [slug, galleryImages.length]);

  const showPreviousGalleryImage = () => {
    if (!hasMultipleGalleryImages) return;
    setGalleryCarouselIndex((index) =>
      index === 0 ? galleryImages.length - 1 : index - 1,
    );
  };

  const showNextGalleryImage = () => {
    if (!hasMultipleGalleryImages) return;
    setGalleryCarouselIndex((index) =>
      index === galleryImages.length - 1 ? 0 : index + 1,
    );
  };

  const handleGalleryTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    galleryTouchStartXRef.current = touch.clientX;
    galleryTouchStartYRef.current = touch.clientY;
  };

  const handleGalleryTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = galleryTouchStartXRef.current;
    const startY = galleryTouchStartYRef.current;
    galleryTouchStartXRef.current = null;
    galleryTouchStartYRef.current = null;

    const touch = event.changedTouches[0];
    if (
      !hasMultipleGalleryImages ||
      startX === null ||
      startY === null ||
      !touch
    ) {
      return;
    }

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaX) < 35 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) {
      return;
    }

    if (deltaX < 0) {
      showNextGalleryImage();
    } else {
      showPreviousGalleryImage();
    }
  };

  const isOwnPost = (p: DestinationPost) => {
    return user?.id && p.user?.id === user.id;
  };

  const isFromFollowedUser = (p: DestinationPost) => {
    return !isOwnPost(p) && p.visibility === "FOLLOWERS";
  };

  const openCoursesTab = () => setActiveTab("courses");
  const openPostsTab = () => setActiveTab("posts");
  const scrollToOverviewExperience = () => {
    overviewExperienceRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const loadDestinationTips = useCallback(async () => {
    if (!slug) return;

    setTipsLoading(true);
    setTipError(null);

    try {
      const res = await fetch(`${API_BASE}/destinations/${slug}/tips`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        throw new Error(`Failed to load destination tips: ${res.status}`);
      }

      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];

      setDestinationTips(
        items
          .filter(
            (tip: any): tip is DestinationTip =>
              typeof tip?.id === "string" && typeof tip?.text === "string",
          )
          .map((tip: DestinationTip) => ({
            ...tip,
            helpfulCount:
              typeof tip.helpfulCount === "number" ? tip.helpfulCount : 0,
            viewerHasMarkedHelpful: Boolean(tip.viewerHasMarkedHelpful),
            user: tip.user || {
              id: "",
              handle: null,
              name: null,
              avatarUrl: null,
            },
          })),
      );
    } catch (err) {
      console.error("Failed to load destination tips", err);
      setDestinationTips([]);
      setTipError("Community tips could not be loaded right now.");
    } finally {
      setTipsLoading(false);
    }
  }, [slug, token]);

  const handleSubmitTip = useCallback(async () => {
    if (!slug || !token || tipSubmitting) return;

    const text = tipText.trim();
    if (!text) return;

    setTipSubmitting(true);
    setTipError(null);

    try {
      const res = await fetch(`${API_BASE}/destinations/${slug}/tips`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error("Unauthorized");
      }

      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Failed to create tip: ${res.status}`);
      }

      const createdTip = await res.json();

      if (
        typeof createdTip?.id === "string" &&
        typeof createdTip?.text === "string"
      ) {
        setDestinationTips((prev) => [
          {
            ...createdTip,
            helpfulCount:
              typeof createdTip.helpfulCount === "number"
                ? createdTip.helpfulCount
                : 0,
            viewerHasMarkedHelpful: Boolean(createdTip.viewerHasMarkedHelpful),
            user: createdTip.user || {
              id: user?.id || "",
              handle: user?.handle ?? null,
              name: user?.name ?? null,
              avatarUrl: user?.avatarUrl ?? null,
            },
          },
          ...prev,
        ]);
      } else {
        await loadDestinationTips();
      }

      setTipText("");
    } catch (err) {
      console.error("Failed to create destination tip", err);
      setTipError("Could not share this tip. Please try again.");
    } finally {
      setTipSubmitting(false);
    }
  }, [
    loadDestinationTips,
    logout,
    slug,
    tipSubmitting,
    tipText,
    token,
    user?.avatarUrl,
    user?.handle,
    user?.id,
    user?.name,
  ]);

  const handleToggleTipHelpful = useCallback(
    async (tip: DestinationTip) => {
      if (!slug || !token || helpfulBusyTipId) return;

      const wasMarked = tip.viewerHasMarkedHelpful;
      const nextMarked = !wasMarked;
      const nextCount = Math.max(0, tip.helpfulCount + (nextMarked ? 1 : -1));

      setHelpfulBusyTipId(tip.id);
      setTipError(null);
      setDestinationTips((prev) =>
        prev.map((item) =>
          item.id === tip.id
            ? {
                ...item,
                helpfulCount: nextCount,
                viewerHasMarkedHelpful: nextMarked,
              }
            : item,
        ),
      );

      try {
        const res = await fetch(
          `${API_BASE}/destinations/${slug}/tips/${tip.id}/helpful`,
          {
            method: wasMarked ? "DELETE" : "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (res.status === 401 || res.status === 403) {
          logout();
          throw new Error("Unauthorized");
        }

        if (!res.ok) {
          const message = await res.text().catch(() => "");
          throw new Error(
            message || `Failed to update useful marker: ${res.status}`,
          );
        }

        const json = await res.json();
        setDestinationTips((prev) =>
          prev.map((item) =>
            item.id === tip.id
              ? {
                  ...item,
                  helpfulCount:
                    typeof json?.helpfulCount === "number"
                      ? json.helpfulCount
                      : nextCount,
                  viewerHasMarkedHelpful: Boolean(
                    json?.viewerHasMarkedHelpful ?? nextMarked,
                  ),
                }
              : item,
          ),
        );
      } catch (err) {
        console.error("Failed to update destination tip useful marker", err);
        setDestinationTips((prev) =>
          prev.map((item) =>
            item.id === tip.id
              ? {
                  ...item,
                  helpfulCount: tip.helpfulCount,
                  viewerHasMarkedHelpful: wasMarked,
                }
              : item,
          ),
        );
        setTipError("Could not update this tip right now.");
      } finally {
        setHelpfulBusyTipId(null);
      }
    },
    [helpfulBusyTipId, logout, slug, token],
  );

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
          setDestinationTips([]);
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

        await loadDestinationTips();

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
        setDestinationTips([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [loadDestinationTips, slug, token]);

  useEffect(() => {
    loadFollowedCourses();
  }, [loadFollowedCourses]);

  useEffect(() => {
    loadDestinationFollowStatus();
  }, [loadDestinationFollowStatus]);

  const activeCommentPost =
    posts.find((p) => p.id === activeCommentPostId) ?? null;

  if (loading) {
    return (
      <div style={{ padding: 14, display: "grid", gap: 12 }}>
        <DestinationRowsSkeleton count={3} />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 14 }}>
        <EmptyState
          title="Destination unavailable"
          body="This golf destination could not be loaded right now."
        />
      </div>
    );
  }

  const filteredItems = (data.items || []).filter((c: Course) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.region || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="fw-page">
      <div className="fw-page-atmosphere" aria-hidden="true">
        <div className="fw-page-atmosphere-overlay" />
      </div>
      <div
        className="fw-page-shell"
        style={{
          padding: isMobile ? 12 : 20,
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
            marginBottom: 16,
            position: "sticky",
            top: 8,
            zIndex: 5,
          }}
        >
          <div className="fw-segmented">
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
                  className={`fw-segmented__item${
                    isActive ? " fw-segmented__item--active" : ""
                  }`}
                  onClick={() =>
                    setActiveTab(tab.key as "overview" | "courses" | "posts")
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "courses" && (
          <div
            style={{
              marginBottom: 16,
              padding: 10,
              borderRadius: 22,
              border:
                "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
              background: "color-mix(in srgb, var(--card) 92%, transparent)",
              boxShadow: "0 10px 26px rgba(0,0,0,0.075)",
              boxSizing: "border-box",
            }}
          >
            <input
              type="text"
              placeholder={t("search_courses")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: 999,
                border:
                  "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
                background: "color-mix(in srgb, var(--muted) 62%, transparent)",
                color: "var(--text)",
                outline: "none",
                display: "block",
                fontSize: 14,
                fontWeight: 650,
              }}
            />
          </div>
        )}

        {activeTab === "overview" && (
          <div
            style={{
              marginTop: 20,
              display: "grid",
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  minHeight: isMobile ? 300 : 380,
                  padding: isMobile ? "18px 18px 46px" : "30px 30px 38px",
                  borderRadius: 24,
                  border:
                    "1px solid var(--fw-destination-hero-border, rgba(255,255,255,0.14))",
                  background: "var(--fw-destination-hero-bg, #111)",
                  boxSizing: "border-box",
                  boxShadow: "0 18px 44px rgba(0,0,0,0.12)",
                }}
              >
                {heroImage ? (
                  <>
                    <img
                      src={heroImage}
                      alt={`${data.destination?.name || getCountryName(data.country)} golf destination`}
                      loading="lazy"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "var(--fw-destination-hero-overlay, linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.4), rgba(0,0,0,0.2)))",
                        pointerEvents: "none",
                      }}
                    />
                  </>
                ) : null}

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "grid",
                    alignContent: "end",
                    gap: 18,
                    minHeight: isMobile ? 236 : 312,
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
                        width: 48,
                        minWidth: 48,
                        borderRadius: 6,
                        overflow: "hidden",
                        flexShrink: 0,
                        alignSelf: "flex-end",
                        marginBottom: 2,
                        border: "1px solid rgba(255,255,255,0.28)",
                        boxShadow: "0 6px 16px rgba(0,0,0,0.22)",
                      }}
                    >
                      <img
                        src={getFlagUrl(data.destination?.code || data.country)}
                        alt={data.destination?.code || data.country}
                        style={{
                          display: "block",
                          width: "100%",
                          height: "auto",
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
                          color:
                            "var(--fw-destination-hero-subtle, rgba(255,255,255,0.76))",
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
                          color: "var(--fw-destination-hero-title, #fff)",
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
                        color:
                          "var(--fw-destination-hero-copy, rgba(255,255,255,0.86))",
                        maxWidth: 760,
                      }}
                    >
                      {info?.overviewDescription ? (
                        info.overviewDescription
                      ) : (
                        <>
                          {t("destination_intro_prefix")}
                          {data.destination?.name ||
                            getCountryName(data.country)}
                          {t("destination_intro_suffix")}
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={openCoursesTab}
                      aria-label={`Show ${data.courseCount} courses for ${
                        data.destination?.name || getCountryName(data.country)
                      }`}
                      style={{
                        padding: "9px 13px",
                        borderRadius: 999,
                        border:
                          "1px solid var(--fw-destination-hero-pill-border, rgba(255,255,255,0.24))",
                        background:
                          "var(--fw-destination-hero-pill-bg, rgba(0,0,0,0.34))",
                        color: "var(--fw-destination-hero-pill-text, #fff)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "var(--fw-destination-hero-pill-bg-hover, rgba(0,0,0,0.48))";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "var(--fw-destination-hero-pill-bg, rgba(0,0,0,0.34))";
                      }}
                    >
                      ⛳ {data.courseCount} {t("course_plural")}
                    </button>

                    <div
                      title="Followers list coming soon"
                      style={{
                        padding: "9px 13px",
                        borderRadius: 999,
                        border:
                          "1px solid var(--fw-destination-hero-pill-border, rgba(255,255,255,0.24))",
                        background:
                          "var(--fw-destination-hero-pill-bg, rgba(0,0,0,0.34))",
                        color: "var(--fw-destination-hero-pill-text, #fff)",
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
                        border:
                          "1px solid var(--fw-destination-hero-pill-border, rgba(255,255,255,0.24))",
                        background:
                          "var(--fw-destination-hero-pill-bg, rgba(0,0,0,0.34))",
                        color: "var(--fw-destination-hero-pill-text, #fff)",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      <span>
                        {data.destination?.name || getCountryName(data.country)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      className={destinationFollowing ? "fw-pill fw-pill--active" : undefined}
                      onClick={handleToggleDestinationFollow}
                      disabled={destinationFollowBusy}
                      style={{
                        border: destinationFollowing
                          ? "1px solid var(--fw-pill-active-bg)"
                          : "1px solid rgba(255,255,255,0.32)",
                        background: destinationFollowing
                          ? "var(--fw-pill-active-bg)"
                          : "var(--accent)",
                        color: destinationFollowing ? "var(--text)" : "#f8fbf6",
                        height: 44,
                        padding: "0 18px",
                        borderRadius: 999,
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: destinationFollowBusy ? "default" : "pointer",
                        flex: isMobile ? "1 1 150px" : "0 0 auto",
                        minWidth: 0,
                        opacity: destinationFollowBusy ? 0.7 : 1,
                      }}
                    >
                      {destinationFollowBusy
                        ? t("please_wait")
                        : destinationFollowing
                          ? `✓ ${t("following_destination")}`
                          : t("follow_destination")}
                    </button>
                  </div>
                </div>

                {heroImage ? (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 7,
                      right: 10,
                      fontSize: 10,
                      color:
                        "var(--fw-destination-hero-subtle, rgba(255,255,255,0.48))",
                      background:
                        "var(--fw-destination-hero-pill-bg, rgba(0,0,0,0.24))",
                      padding: "3px 6px",
                      borderRadius: 6,
                      backdropFilter: "blur(4px)",
                      pointerEvents: "none",
                      zIndex: 2,
                    }}
                  >
                    Images may be AI-generated
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  marginTop: 14,
                }}
              >
                <button
                  type="button"
                  onClick={scrollToOverviewExperience}
                  aria-label="Scroll to destination experience overview"
                  style={{
                    padding: "9px 13px",
                    borderRadius: 999,
                    border:
                      "1px solid var(--fw-destination-hero-pill-border, rgba(255,255,255,0.24))",
                    background:
                      "var(--fw-destination-hero-pill-bg, rgba(0,0,0,0.34))",
                    color: "var(--fw-destination-hero-pill-text, #fff)",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--fw-destination-hero-pill-bg-hover, rgba(0,0,0,0.48))";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "var(--fw-destination-hero-pill-bg, rgba(0,0,0,0.34))";
                  }}
                >
                  🏌️ {t("explore_experience")}
                </button>
              </div>
            </div>

            {galleryImages.length > 0 ? (
              <div
                style={{
                  padding: isMobile ? 14 : 18,
                  borderRadius: 18,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  display: "grid",
                  gap: 12,
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: isMobile ? 19 : 21,
                        fontWeight: 850,
                        color: "var(--text)",
                      }}
                    >
                      {info?.galleryTitle ?? "Destination Gallery"}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--sub)",
                        lineHeight: 1.45,
                      }}
                    >
                      {info?.gallerySubtitle ??
                        `A quick visual preview of ${
                          data.destination?.name || getCountryName(data.country)
                        }.`}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--sub)",
                        lineHeight: 1.35,
                        opacity: 0.78,
                      }}
                    >
                      Some destination images may be AI-generated.
                    </div>
                  </div>

                  {hasMultipleGalleryImages && !isMobile ? (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={showPreviousGalleryImage}
                        aria-label="Previous destination image"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          background: "var(--muted)",
                          color: "var(--text)",
                          cursor: "pointer",
                          fontSize: 18,
                          fontWeight: 900,
                          lineHeight: 1,
                        }}
                      >
                        {"<"}
                      </button>
                      <div
                        style={{
                          minWidth: 42,
                          textAlign: "center",
                          color: "var(--sub)",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {galleryCarouselIndex + 1}/{galleryImages.length}
                      </div>
                      <button
                        type="button"
                        onClick={showNextGalleryImage}
                        aria-label="Next destination image"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          background: "var(--muted)",
                          color: "var(--text)",
                          cursor: "pointer",
                          fontSize: 18,
                          fontWeight: 900,
                          lineHeight: 1,
                        }}
                      >
                        {">"}
                      </button>
                    </div>
                  ) : null}
                </div>

                {isMobile ? (
                  <>
                    {hasMultipleGalleryImages ? (
                      <div
                        style={{
                          color: "var(--sub)",
                          fontSize: 12,
                          fontWeight: 750,
                          lineHeight: 1.2,
                          marginTop: -2,
                        }}
                      >
                        Swipe to explore · {galleryCarouselIndex + 1}/
                        {galleryImages.length}
                      </div>
                    ) : null}

                    <div
                      onTouchStart={handleGalleryTouchStart}
                      onTouchEnd={handleGalleryTouchEnd}
                      style={{
                        display: "block",
                        maxWidth: "100%",
                        width: "100%",
                        boxSizing: "border-box",
                        overflow: "hidden",
                        borderRadius: 16,
                        touchAction: "pan-y",
                      }}
                    >
                      {galleryImages[galleryCarouselIndex] ? (
                        <button
                          key={galleryImages[galleryCarouselIndex].src}
                          type="button"
                          onClick={() =>
                            setGalleryImageIndex(galleryCarouselIndex)
                          }
                          style={{
                            border: "1px solid var(--border)",
                            background: "var(--bg)",
                            color: "var(--text)",
                            borderRadius: 16,
                            padding: 0,
                            minWidth: "100%",
                            maxWidth: "100%",
                            width: "100%",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <img
                            src={galleryImages[galleryCarouselIndex].src}
                            alt={galleryImages[galleryCarouselIndex].alt}
                            loading="lazy"
                            style={{
                              display: "block",
                              width: "100%",
                              height: 190,
                              objectFit: "cover",
                              background: "var(--card)",
                            }}
                          />
                          {galleryImages[galleryCarouselIndex].caption ? (
                            <div
                              style={{
                                padding: "9px 10px",
                                color: "var(--sub)",
                                fontSize: 12,
                                fontWeight: 750,
                                lineHeight: 1.25,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {galleryImages[galleryCarouselIndex].caption}
                            </div>
                          ) : null}
                        </button>
                      ) : null}
                    </div>

                    {hasMultipleGalleryImages ? (
                      <div
                        aria-label="Destination gallery slides"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 7,
                          paddingTop: 2,
                        }}
                      >
                        {galleryImages.map((image, index) => {
                          const isActive = index === galleryCarouselIndex;

                          return (
                            <button
                              key={image.src}
                              type="button"
                              onClick={() => setGalleryCarouselIndex(index)}
                              aria-label={`Show destination image ${index + 1}`}
                              aria-current={isActive ? "true" : undefined}
                              style={{
                                width: isActive ? 22 : 7,
                                height: 7,
                                borderRadius: 999,
                                border: "0",
                                padding: 0,
                                background: isActive
                                  ? "var(--green)"
                                  : "color-mix(in srgb, var(--sub) 38%, transparent)",
                                cursor: "pointer",
                                transition:
                                  "width 160ms ease, background 160ms ease",
                              }}
                            />
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div
                    style={{
                      maxWidth: "100%",
                      width: "100%",
                      boxSizing: "border-box",
                      overflow: "hidden",
                      borderRadius: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: "100%",
                        transform: `translateX(-${galleryCarouselIndex * 100}%)`,
                        transition: "transform 220ms ease",
                      }}
                    >
                      {galleryImages.map((image, index) => (
                        <button
                          key={image.src}
                          type="button"
                          onClick={() => setGalleryImageIndex(index)}
                          style={{
                            border: "1px solid var(--border)",
                            background: "var(--bg)",
                            color: "var(--text)",
                            borderRadius: 16,
                            padding: 0,
                            minWidth: "100%",
                            maxWidth: "100%",
                            width: "100%",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            cursor: "pointer",
                            textAlign: "left",
                            flex: "0 0 100%",
                          }}
                        >
                          <img
                            src={image.src}
                            alt={image.alt}
                            loading="lazy"
                            style={{
                              display: "block",
                              width: "100%",
                              height: 300,
                              objectFit: "cover",
                              background: "var(--card)",
                            }}
                          />
                          {image.caption ? (
                            <div
                              style={{
                                padding: "9px 10px",
                                color: "var(--sub)",
                                fontSize: 12,
                                fontWeight: 750,
                                lineHeight: 1.25,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {image.caption}
                            </div>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div ref={overviewExperienceRef} style={{ scrollMarginTop: 90 }} />

            {info?.bestTime ? (
              <div
                style={{
                  padding: isMobile ? 18 : 22,
                  borderRadius: 24,
                  border:
                    "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  background:
                    "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 92%, var(--green) 3%))",
                  boxShadow: "0 14px 34px rgba(0,0,0,0.075)",
                  display: "grid",
                  gap: 13,
                }}
              >
                <div
                  style={{
                    fontSize: isMobile ? 19 : 22,
                    fontWeight: 850,
                    letterSpacing: "-0.02em",
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
                      border:
                        "1px solid color-mix(in srgb, var(--border) 66%, transparent)",
                      background:
                        "color-mix(in srgb, var(--muted) 52%, transparent)",
                      borderRadius: 18,
                      padding: "11px 12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontWeight: 850, color: "var(--text)" }}>
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
                  padding: isMobile ? 16 : 20,
                  borderRadius: 24,
                  border:
                    "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  background:
                    "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 92%, var(--green) 3%))",
                  boxShadow: "0 14px 34px rgba(0,0,0,0.075)",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 850,
                    letterSpacing: "-0.01em",
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
                          border:
                            "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                          borderRadius: 999,
                          background:
                            "color-mix(in srgb, var(--muted) 62%, transparent)",
                          padding: "9px 12px",
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
                  padding: isMobile ? 16 : 20,
                  borderRadius: 24,
                  border:
                    "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  background:
                    "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 92%, var(--green) 3%))",
                  boxShadow: "0 14px 34px rgba(0,0,0,0.075)",
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
                        border:
                          "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                        borderRadius: 18,
                        background:
                          "color-mix(in srgb, var(--muted) 56%, transparent)",
                        padding: "13px",
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
                          border:
                            "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                          background:
                            "color-mix(in srgb, var(--card) 88%, var(--green) 4%)",
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
                  padding: isMobile ? 18 : 22,
                  borderRadius: 24,
                  border:
                    "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  background:
                    "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 92%, var(--green) 3%))",
                  boxShadow: "0 14px 34px rgba(0,0,0,0.075)",
                  display: "grid",
                  gap: 14,
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
                    Small details that help the destination feel familiar
                    faster.
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
                        border:
                          "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                        borderRadius: 18,
                        background:
                          "color-mix(in srgb, var(--muted) 56%, transparent)",
                        padding: "13px",
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
                          border:
                            "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                          background:
                            "color-mix(in srgb, var(--card) 88%, var(--green) 4%)",
                          color: "var(--text)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {
                          LOCAL_KNOWLEDGE_ICONS[
                            i % LOCAL_KNOWLEDGE_ICONS.length
                          ]
                        }
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
                  padding: isMobile ? 18 : 22,
                  borderRadius: 24,
                  border:
                    "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  background:
                    "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 92%, var(--green) 3%))",
                  boxShadow: "0 14px 34px rgba(0,0,0,0.075)",
                  display: "grid",
                  gap: 14,
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
                        border:
                          "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                        borderRadius: 999,
                        background:
                          "color-mix(in srgb, var(--muted) 62%, transparent)",
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
                padding: isMobile ? 18 : 22,
                borderRadius: 24,
                border:
                  "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                background:
                  "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 92%, var(--green) 3%))",
                boxShadow: "0 14px 34px rgba(0,0,0,0.075)",
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ minWidth: 0, display: "grid", gap: 5 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gap: 5,
                      minWidth: 0,
                    }}
                  >
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
                      Small golf travel notes from players who know this
                      destination.
                    </div>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      width: isMobile ? "fit-content" : "auto",
                      minHeight: 30,
                      padding: "0 11px",
                      borderRadius: 999,
                      border:
                        "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                      background:
                        "color-mix(in srgb, var(--muted) 62%, transparent)",
                      color: "var(--sub)",
                      fontSize: 12,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tipsLoading
                      ? "Loading tips"
                      : `${destinationTips.length} ${destinationTips.length === 1 ? "tip" : "tips"}`}
                  </div>
                </div>
              </div>

              {token && user ? (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    padding: 13,
                    borderRadius: 20,
                    border:
                      "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                    background:
                      "color-mix(in srgb, var(--muted) 52%, transparent)",
                  }}
                >
                  <textarea
                    value={tipText}
                    maxLength={500}
                    placeholder="Share a practical golf travel tip..."
                    onChange={(event) => {
                      setTipText(event.target.value.slice(0, 500));
                      if (tipError) setTipError(null);
                    }}
                    rows={3}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      minHeight: 78,
                      boxSizing: "border-box",
                      borderRadius: 16,
                      border:
                        "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                      background:
                        "color-mix(in srgb, var(--card) 90%, transparent)",
                      color: "var(--text)",
                      padding: "11px 12px",
                      fontSize: 14,
                      lineHeight: 1.45,
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        color:
                          tipText.length >= 480
                            ? "var(--danger)"
                            : "var(--sub)",
                        fontSize: 12,
                        fontWeight: 750,
                      }}
                    >
                      {tipText.length}/500
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitTip}
                      disabled={!tipText.trim() || tipSubmitting}
                      style={{
                        border:
                          "1px solid color-mix(in srgb, var(--green) 62%, var(--border))",
                        background: "var(--green)",
                        color: "#fff",
                        height: 38,
                        padding: "0 15px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 850,
                        cursor:
                          !tipText.trim() || tipSubmitting
                            ? "default"
                            : "pointer",
                        opacity: !tipText.trim() || tipSubmitting ? 0.62 : 1,
                      }}
                    >
                      {tipSubmitting ? "Sharing..." : "Share tip"}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 13,
                    borderRadius: 18,
                    border:
                      "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                    background:
                      "color-mix(in srgb, var(--muted) 52%, transparent)",
                    color: "var(--sub)",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  Sign in to share a practical tip for this destination.
                </div>
              )}

              {tipError ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border:
                      "1px solid color-mix(in srgb, var(--danger) 36%, var(--border))",
                    background:
                      "color-mix(in srgb, var(--danger) 9%, var(--card))",
                    color: "var(--text)",
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  {tipError}
                </div>
              ) : null}

              {tipsLoading ? (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border:
                      "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                    background:
                      "color-mix(in srgb, var(--muted) 52%, transparent)",
                    color: "var(--sub)",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  Loading community tips...
                </div>
              ) : destinationTips.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10,
                  }}
                >
                  {destinationTips.map((tip) => {
                    const authorName =
                      tip.user?.name ||
                      (tip.user?.handle
                        ? `@${tip.user.handle}`
                        : "Fairwayd golfer");
                    const avatarLabel =
                      authorName.trim().slice(0, 1).toUpperCase() || "F";

                    return (
                      <div
                        key={tip.id}
                        style={{
                          border:
                            "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                          borderRadius: 18,
                          background:
                            "color-mix(in srgb, var(--muted) 56%, transparent)",
                          padding: 13,
                          display: "grid",
                          gap: 11,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 999,
                              border:
                                "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                              background:
                                "color-mix(in srgb, var(--card) 88%, var(--green) 4%)",
                              color: "var(--text)",
                              overflow: "hidden",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 12,
                              fontWeight: 900,
                              flexShrink: 0,
                            }}
                          >
                            {tip.user?.avatarUrl ? (
                              <img
                                src={fileUrl(tip.user.avatarUrl)}
                                alt={authorName}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              avatarLabel
                            )}
                          </div>

                          <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                            <div
                              style={{
                                color: "var(--text)",
                                fontSize: 13,
                                fontWeight: 850,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {authorName}
                            </div>
                            <div
                              style={{
                                color: "var(--sub)",
                                fontSize: 11,
                                fontWeight: 750,
                              }}
                            >
                              {formatTipDate(tip.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            color:
                              "color-mix(in srgb, var(--text) 88%, var(--sub))",
                            fontSize: 14,
                            lineHeight: 1.62,
                            fontWeight: 500,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {tip.text}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            borderTop:
                              "1px solid color-mix(in srgb, var(--border) 34%, transparent)",
                            paddingTop: 8,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleTipHelpful(tip)}
                            disabled={!token || helpfulBusyTipId === tip.id}
                            title={
                              !token
                                ? "Sign in to mark useful"
                                : "Mark as useful"
                            }
                            style={{
                              minHeight: 30,
                              border: tip.viewerHasMarkedHelpful
                                ? "1px solid color-mix(in srgb, var(--green) 55%, var(--border))"
                                : "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                              background: tip.viewerHasMarkedHelpful
                                ? "color-mix(in srgb, var(--green) 16%, var(--card))"
                                : "color-mix(in srgb, var(--card) 76%, var(--muted))",
                              color: tip.viewerHasMarkedHelpful
                                ? "var(--text)"
                                : "var(--sub)",
                              padding: "0 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 850,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              cursor:
                                !token || helpfulBusyTipId === tip.id
                                  ? "default"
                                  : "pointer",
                              opacity: !token
                                ? 0.68
                                : helpfulBusyTipId === tip.id
                                  ? 0.72
                                  : 1,
                              transition:
                                "background 0.16s ease, border-color 0.16s ease, opacity 0.16s ease",
                            }}
                          >
                            <span aria-hidden="true" style={{ fontSize: 12 }}>
                              👍
                            </span>
                            <span>
                              Useful
                              {tip.helpfulCount > 0
                                ? ` · ${tip.helpfulCount}`
                                : ""}
                            </span>
                          </button>

                          {!token ? (
                            <div
                              style={{
                                color: "var(--sub)",
                                fontSize: 11,
                                fontWeight: 750,
                                lineHeight: 1.25,
                              }}
                            >
                              Sign in to mark
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : info?.communityTips?.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10,
                  }}
                >
                  {info.communityTips.map((tip) => (
                    <div
                      key={tip.title}
                      style={{
                        border:
                          "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                        borderRadius: 18,
                        background:
                          "color-mix(in srgb, var(--muted) 56%, transparent)",
                        padding: "13px",
                        display: "grid",
                        gap: 9,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            maxWidth: "100%",
                            minWidth: 0,
                            borderRadius: 999,
                            border: "1px solid var(--border)",
                            background: "var(--card)",
                            color: "var(--sub)",
                            padding: "5px 8px",
                            fontSize: 11,
                            fontWeight: 800,
                            boxSizing: "border-box",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span>Preview tip</span>
                          {tip.category ? <span>{tip.category}</span> : null}
                        </div>
                        {tip.author ? (
                          <div
                            style={{
                              color: "var(--sub)",
                              fontSize: 11,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tip.author}
                          </div>
                        ) : null}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gap: 5,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 850,
                            color: "var(--text)",
                            lineHeight: 1.25,
                          }}
                        >
                          {tip.title}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--sub)",
                            lineHeight: 1.45,
                          }}
                        >
                          {tip.body}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border:
                      "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                    background:
                      "color-mix(in srgb, var(--muted) 52%, transparent)",
                    color: "var(--sub)",
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  Community tips are coming soon.
                </div>
              )}
            </div>

            <div
              style={{
                padding: isMobile ? 18 : 22,
                borderRadius: 24,
                border:
                  "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                background:
                  "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 92%, var(--green) 3%))",
                boxShadow: "0 14px 34px rgba(0,0,0,0.075)",
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
                      fontWeight: 850,
                      letterSpacing: "-0.02em",
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
                      lineHeight: 1.45,
                    }}
                  >
                    A quick preview of places to play in{" "}
                    {data.destination?.name || getCountryName(data.country)}.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openCoursesTab}
                  style={{
                    border:
                      "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                    background:
                      "color-mix(in srgb, var(--muted) 58%, transparent)",
                    color: "var(--text)",
                    height: 42,
                    padding: "0 16px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontWeight: 850,
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
                    borderRadius: 18,
                    border:
                      "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                    background:
                      "color-mix(in srgb, var(--muted) 58%, transparent)",
                    color: "var(--sub)",
                    fontSize: 14,
                  }}
                >
                  Courses for this destination are being prepared.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {featuredCourses.map((c) => {
                    const isCourseFollowed = followedCourseIds.includes(c.id);
                    const isCourseBusy = courseFollowBusyId === c.id;

                    return (
                      <div
                        key={c.id}
                        onClick={() => navigate(`/courses/${c.id}`)}
                        style={{
                          padding: 14,
                          borderRadius: 20,
                          border:
                            "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                          background:
                            "color-mix(in srgb, var(--muted) 42%, transparent)",
                          cursor: "pointer",
                          display: "grid",
                          gap: 10,
                          minWidth: 0,
                        }}
                      >
                        <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
                          <div
                            style={{
                              color: "var(--text)",
                              fontSize: 16,
                              fontWeight: 850,
                              letterSpacing: "-0.02em",
                              lineHeight: 1.2,
                            }}
                          >
                            {c.name}
                          </div>
                          <div
                            style={{
                              color: "var(--sub)",
                              fontSize: 13,
                              lineHeight: 1.35,
                            }}
                          >
                            {[c.city, c.region].filter(Boolean).join(" · ")}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 7,
                          }}
                        >
                          {c.holes ? (
                            <div
                              style={{
                                border:
                                  "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                                background:
                                  "color-mix(in srgb, var(--card) 72%, transparent)",
                                borderRadius: 999,
                                padding: "5px 8px",
                                color: "var(--text)",
                                fontSize: 12,
                                fontWeight: 750,
                              }}
                            >
                              {c.holes} holes
                            </div>
                          ) : null}
                          {c.access ? (
                            <div
                              style={{
                                border:
                                  "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                                background:
                                  "color-mix(in srgb, var(--card) 72%, transparent)",
                                borderRadius: 999,
                                padding: "5px 8px",
                                color: "var(--text)",
                                fontSize: 12,
                                fontWeight: 750,
                              }}
                            >
                              {c.access}
                            </div>
                          ) : null}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: isMobile ? "column" : "row",
                            gap: 8,
                          }}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/courses/${c.id}`);
                            }}
                            style={{
                              border:
                                "1px solid color-mix(in srgb, var(--green) 62%, var(--border))",
                              background: "var(--green)",
                              color: "#fff",
                              height: 38,
                              padding: "0 14px",
                              borderRadius: 999,
                              fontSize: 13,
                              fontWeight: 850,
                              cursor: "pointer",
                              flex: 1,
                            }}
                          >
                            Open Course
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleCourseFollow(c.id);
                            }}
                            disabled={isCourseBusy}
                            style={{
                              border:
                                "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                              background: isCourseFollowed
                                ? "color-mix(in srgb, var(--green) 14%, var(--muted))"
                                : "color-mix(in srgb, var(--muted) 62%, transparent)",
                              color: "var(--text)",
                              height: 38,
                              padding: "0 14px",
                              borderRadius: 999,
                              fontSize: 13,
                              fontWeight: 850,
                              cursor: isCourseBusy ? "default" : "pointer",
                              opacity: isCourseBusy ? 0.68 : 1,
                              flex: 1,
                            }}
                          >
                            {isCourseBusy
                              ? "..."
                              : isCourseFollowed
                                ? t("following")
                                : t("follow")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div
              style={{
                padding: isMobile ? 18 : 22,
                borderRadius: 24,
                border:
                  "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                background:
                  "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 92%, var(--green) 3%))",
                boxShadow: "0 14px 34px rgba(0,0,0,0.075)",
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
                      fontWeight: 850,
                      letterSpacing: "-0.02em",
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
                    border:
                      "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                    background:
                      "color-mix(in srgb, var(--muted) 58%, transparent)",
                    color: "var(--text)",
                    height: 42,
                    padding: "0 16px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontWeight: 850,
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
                    borderRadius: 18,
                    border:
                      "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                    background:
                      "color-mix(in srgb, var(--muted) 58%, transparent)",
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
                    borderRadius: 18,
                    border:
                      "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                    background:
                      "color-mix(in srgb, var(--muted) 58%, transparent)",
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
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gap: 12,
            }}
          >
            {filteredItems.length === 0 ? (
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  padding: 18,
                  borderRadius: 24,
                  border:
                    "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  background:
                    "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 92%, var(--green) 3%))",
                  color: "var(--text)",
                  boxShadow: "0 14px 34px rgba(0,0,0,0.075)",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 850 }}>
                  {t("no_courses_found")}
                </div>
                <div
                  style={{
                    color: "var(--sub)",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  Try another city, region, or course name in this destination.
                </div>
              </div>
            ) : (
              filteredItems.map((c: Course) => {
                const isCourseFollowed = followedCourseIds.includes(c.id);
                const isCourseBusy = courseFollowBusyId === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/courses/${c.id}`)}
                    style={{
                      borderRadius: 24,
                      border:
                        "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                      background:
                        "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 92%, var(--green) 4%))",
                      cursor: "pointer",
                      overflow: "hidden",
                      transition: "transform 0.18s ease, box-shadow 0.18s ease",
                      boxShadow: "0 12px 30px rgba(0,0,0,0.075)",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 16px 34px rgba(0,0,0,0.10)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 12px 30px rgba(0,0,0,0.075)";
                    }}
                  >
                    <div
                      style={{
                        height: 46,
                        background:
                          "linear-gradient(90deg, color-mix(in srgb, var(--green) 10%, transparent) 0%, color-mix(in srgb, var(--sky) 10%, transparent) 60%, transparent 100%)",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 13px",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 850,
                          color: "var(--text)",
                          background:
                            "color-mix(in srgb, var(--muted) 70%, transparent)",
                          border:
                            "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                          padding: "6px 10px",
                          borderRadius: 999,
                          letterSpacing: 0.2,
                        }}
                      >
                        {c.access || t("course")}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 15,
                        display: "grid",
                        gap: 11,
                      }}
                    >
                      <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 850,
                            fontSize: 17,
                            letterSpacing: "-0.02em",
                            color: "var(--text)",
                            lineHeight: 1.2,
                          }}
                        >
                          {c.name}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--sub)",
                            lineHeight: 1.35,
                          }}
                        >
                          {[c.city, c.region].filter(Boolean).join(" ? ")}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 7,
                          flexWrap: "wrap",
                          fontSize: 12,
                          color: "var(--sub)",
                        }}
                      >
                        {c.holes ? (
                          <div
                            style={{
                              border:
                                "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                              background:
                                "color-mix(in srgb, var(--muted) 62%, transparent)",
                              borderRadius: 999,
                              padding: "5px 8px",
                              fontWeight: 750,
                            }}
                          >
                            ? {c.holes}
                          </div>
                        ) : null}
                        {c.access ? (
                          <div
                            style={{
                              border:
                                "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                              background:
                                "color-mix(in srgb, var(--muted) 62%, transparent)",
                              borderRadius: 999,
                              padding: "5px 8px",
                              fontWeight: 750,
                            }}
                          >
                            ?? {c.access}
                          </div>
                        ) : null}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: isMobile ? "column" : "row",
                          gap: 8,
                          alignItems: isMobile ? "stretch" : "center",
                        }}
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/courses/${c.id}`);
                          }}
                          style={{
                            border:
                              "1px solid color-mix(in srgb, var(--green) 62%, var(--border))",
                            background: "var(--green)",
                            color: "#fff",
                            height: 38,
                            padding: "0 14px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 850,
                            cursor: "pointer",
                            flex: isMobile ? "1 1 auto" : "0 0 auto",
                          }}
                        >
                          Open Course
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleCourseFollow(c.id);
                          }}
                          disabled={isCourseBusy}
                          style={{
                            border:
                              "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                            background: isCourseFollowed
                              ? "color-mix(in srgb, var(--green) 14%, var(--muted))"
                              : "color-mix(in srgb, var(--muted) 62%, transparent)",
                            color: "var(--text)",
                            height: 38,
                            padding: "0 14px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 850,
                            cursor: isCourseBusy ? "default" : "pointer",
                            opacity: isCourseBusy ? 0.68 : 1,
                            flex: isMobile ? "1 1 auto" : "0 0 auto",
                          }}
                        >
                          {isCourseBusy
                            ? "..."
                            : isCourseFollowed
                              ? t("following")
                              : t("follow")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "posts" && (
          <div
            style={{
              marginTop: 18,
              width: "100%",
              minWidth: 0,
              overflowX: "hidden",
              display: "grid",
              gap: 14,
            }}
          >
            <div
              style={{
                padding: isMobile ? 16 : 20,
                borderRadius: 24,
                border:
                  "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                background:
                  "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 92%, var(--green) 3%))",
                boxShadow: "0 14px 34px rgba(0,0,0,0.075)",
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: isMobile ? 20 : 22,
                      fontWeight: 850,
                      letterSpacing: "-0.02em",
                      color: "var(--text)",
                      lineHeight: 1.15,
                    }}
                  >
                    {t("posts_from")}{" "}
                    {data.destination?.name || getCountryName(data.country)}
                  </div>
                  <div
                    style={{
                      color: "var(--sub)",
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    Recent golf moments and course notes from this destination.
                  </div>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 30,
                    width: isMobile ? "fit-content" : "auto",
                    padding: "0 11px",
                    borderRadius: 999,
                    border:
                      "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                    background:
                      "color-mix(in srgb, var(--muted) 62%, transparent)",
                    color: "var(--sub)",
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {postsLoading
                    ? t("loading_posts")
                    : `${posts.length} ${posts.length === 1 ? "post" : "posts"}`}
                </div>
              </div>
            </div>

            {postsLoading ? (
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  padding: 18,
                  borderRadius: 24,
                  border:
                    "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
                  color: "var(--text)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.075)",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 850 }}>
                  {t("loading_posts")}
                </div>
                <div
                  style={{
                    color: "var(--sub)",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  Loading the latest destination activity.
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  padding: 18,
                  borderRadius: 24,
                  border:
                    "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
                  color: "var(--text)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.075)",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 850 }}>
                  {t("no_posts_destination")}
                </div>
                <div
                  style={{
                    color: "var(--sub)",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  When golfers share rounds or travel notes here, they will
                  appear in this feed.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {posts.map((p) => (
                  <div key={p.id} style={{ display: "grid", gap: 7 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        width: "fit-content",
                        minHeight: 24,
                        padding: "0 9px",
                        borderRadius: 999,
                        border:
                          "1px solid color-mix(in srgb, var(--border) 66%, transparent)",
                        background:
                          "color-mix(in srgb, var(--muted) 58%, transparent)",
                        fontSize: 11,
                        fontWeight: 800,
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
            onCommentCreated={(postId) => {
              setPosts((prev) =>
                prev.map((item) =>
                  item.id === postId
                    ? {
                        ...item,
                        _count: {
                          ...item._count,
                          comments:
                            (item._count?.comments ??
                              item.comments?.length ??
                              0) + 1,
                        },
                      }
                    : item,
                ),
              );
            }}
          />
        ) : null}

        {galleryImageIndex !== null ? (
          <ImageLightbox
            images={galleryImages.map((image) => ({ url: image.src }))}
            initialIndex={galleryImageIndex}
            isMobile={isMobile}
            onClose={() => setGalleryImageIndex(null)}
          />
        ) : null}

        <BackToTopButton />
      </div>
    </div>
  );
}
