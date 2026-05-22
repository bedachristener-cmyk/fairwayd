import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { API_BASE } from "../api/base";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import BackToTopButton from "../components/BackToTopButton";
import { DestinationRowsSkeleton, EmptyState } from "../components/PolishStates";
import { t } from "../i18n/strings";

type CountryItem = {
  country: string;
  courseCount: number;
  id?: string;
  code?: string;
  name?: string;
  slug?: string;
  followerCount?: number;
  tipsCount?: number;
  viewerIsFollowing?: boolean;
};

type DestinationApiItem = {
  id: string;
  code: string;
  name: string;
  slug: string;
  courseCount?: number;
  followerCount?: number;
  tipsCount?: number;
  viewerIsFollowing?: boolean;
};

type FreshTip = {
  id: string;
  text: string;
  createdAt: string;
  helpfulCount: number;
  destination: {
    slug: string;
    name: string;
    code: string;
  };
  user: {
    id: string;
    handle?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  };
};

const COUNTRY_LABELS: Record<string, string> = {
  AT: "Austria",
  CH: "Switzerland",
  DE: "Germany",
  ES: "Spain",
  FR: "France",
  IT: "Italy",
  JP: "Japan",
  PT: "Portugal",
  TH: "Thailand",
  VN: "Vietnam",
};

function getCountryLabel(code: string) {
  return COUNTRY_LABELS[code] || code;
}

type DestinationVisual = {
  image: string;
  subtitle: string;
  mood: string;
  fallback: string;
};

const DESTINATION_VISUALS: Record<string, DestinationVisual> = {
  thailand: {
    image:
      "https://images.pexels.com/photos/8334036/pexels-photo-8334036.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Golden resort fairways framed by palms and tropical air",
    mood: "Tropical resort golf",
    fallback: "linear-gradient(135deg, #1f7a58, #d8a340)",
  },
  vietnam: {
    image:
      "https://images.pexels.com/photos/4226150/pexels-photo-4226150.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Lush coastal fairways and warm resort mornings",
    mood: "Coastal golf corridor",
    fallback: "linear-gradient(135deg, #266f5d, #83a7a1)",
  },
  portugal: {
    image:
      "https://images.pexels.com/photos/32335407/pexels-photo-32335407.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Coastal greens, Atlantic cliffs, and warm ocean light",
    mood: "Atlantic cliff golf",
    fallback: "linear-gradient(135deg, #1c5f73, #d0b16e)",
  },
  spain: {
    image:
      "https://images.pexels.com/photos/35918456/pexels-photo-35918456.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Mediterranean fairways under warm coastal evening light",
    mood: "Spanish coast golf",
    fallback: "linear-gradient(135deg, #80652f, #dbb768)",
  },
  turkey: {
    image:
      "https://images.pexels.com/photos/28104344/pexels-photo-28104344.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Resort fairways, palms, water, and quiet morning air",
    mood: "Resort golf coast",
    fallback: "linear-gradient(135deg, #174d3f, #5f9c89)",
  },
  "united-arab-emirates": {
    image:
      "https://images.pexels.com/photos/17383426/pexels-photo-17383426.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Manicured fairways under bright destination light",
    mood: "Desert precision",
    fallback: "linear-gradient(135deg, #7c6740, #253f35)",
  },
  switzerland: {
    image:
      "/destinations/switzerland-crans-montana-card.jpg",
    subtitle: "Morning alpine fairways under quiet mountain light",
    mood: "Alpine golf morning",
    fallback: "linear-gradient(135deg, #244f68, #9fb7a6)",
  },
  germany: {
    image:
      "https://images.pexels.com/photos/31803613/pexels-photo-31803613.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Parkland fairways, forest edges, and clubhouse calm",
    mood: "German parkland golf",
    fallback: "linear-gradient(135deg, #244a32, #7f9b72)",
  },
  austria: {
    image:
      "https://images.pexels.com/photos/14946030/pexels-photo-14946030.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Lake-side fairways and Austrian mountain horizons",
    mood: "Alpine lake golf",
    fallback: "linear-gradient(135deg, #315c4c, #b0c0a2)",
  },
  france: {
    image:
      "https://images.pexels.com/photos/34794888/pexels-photo-34794888.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Refined countryside fairways with tree-lined quiet",
    mood: "Countryside golf",
    fallback: "linear-gradient(135deg, #4d6f46, #b29b69)",
  },
  italy: {
    image:
      "https://images.pexels.com/photos/32988401/pexels-photo-32988401.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Rolling fairways and quiet mountain-side golf",
    mood: "Laid-back elegance",
    fallback: "linear-gradient(135deg, #506d45, #c4a569)",
  },
  japan: {
    image:
      "https://images.pexels.com/photos/31388903/pexels-photo-31388903.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Fuji-side golf travel with quiet mountain rhythm",
    mood: "Mount Fuji golf",
    fallback: "linear-gradient(135deg, #425f57, #c9b6a8)",
  },
  "united-states": {
    image:
      "https://images.pexels.com/photos/36739253/pexels-photo-36739253.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Big-course landscapes with Pacific and desert light",
    mood: "Coastal destination golf",
    fallback: "linear-gradient(135deg, #315d3c, #b88945)",
  },
  philippines: {
    image:
      "https://images.pexels.com/photos/4226146/pexels-photo-4226146.jpeg?auto=compress&cs=tinysrgb&w=1400",
    subtitle: "Island fairways with palms, ocean air, and lush light",
    mood: "Island golf",
    fallback: "linear-gradient(135deg, #1f6d55, #6fb6a6)",
  },
  "south-africa": {
    image:
      "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Cape fairways with Table Mountain coastal mood",
    mood: "Cape golf",
    fallback: "linear-gradient(135deg, #315d3c, #b8864f)",
  },
};

const DEFAULT_DESTINATION_VISUAL: DestinationVisual = {
  image:
    "https://images.pexels.com/photos/17383426/pexels-photo-17383426.jpeg?auto=compress&cs=tinysrgb&w=1400",
  subtitle: "A new golf journey waiting to be shaped",
  mood: "Golf travel",
  fallback: "linear-gradient(135deg, var(--green), color-mix(in srgb, var(--card) 75%, var(--bg)))",
};

const EXPLORE_HERO_IMAGE =
  "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1200&q=78";

function getDestinationVisual(item: CountryItem): DestinationVisual {
  const slug = item.slug || item.country;
  return DESTINATION_VISUALS[slug] || DEFAULT_DESTINATION_VISUAL;
}

function getFlagUrl(code?: string) {
  if (!code) return "";
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

function DestinationHeroCard({
  item,
  featured = false,
  isFollowing = false,
  isBusy = false,
  onOpen,
  onFollow,
}: {
  item: CountryItem;
  featured?: boolean;
  isFollowing?: boolean;
  isBusy?: boolean;
  onOpen: () => void;
  onFollow?: () => void;
}) {
  const label = item.name || getCountryLabel(item.code || item.country);
  const visual = getDestinationVisual(item);

  return (
    <article
      onClick={onOpen}
      style={{
        position: "relative",
        height: featured ? 104 : 98,
        borderRadius: featured ? 22 : 20,
        overflow: "hidden",
        cursor: "pointer",
        border: "1px solid color-mix(in srgb, var(--border) 58%, transparent)",
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--card) 95%, var(--bg) 5%), color-mix(in srgb, var(--card) 90%, var(--green) 5%))",
        boxShadow: featured
          ? "0 12px 28px rgba(0,0,0,0.11)"
          : "0 9px 22px rgba(0,0,0,0.085)",
        display: "grid",
        gridTemplateColumns: "38% 1fr",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: visual.fallback,
        }}
      >
        <img
          src={visual.image}
          alt={`${label} golf travel inspiration`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
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
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.08), rgba(0,0,0,0.22))",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 8,
            top: 8,
            display: "grid",
            placeItems: "center",
            width: 32,
            height: 32,
            borderRadius: 999,
            overflow: "hidden",
            background:
              "color-mix(in srgb, var(--card) 88%, var(--green) 4%)",
            border:
              "1px solid color-mix(in srgb, var(--border) 72%, rgba(255,255,255,0.28))",
            boxShadow:
              "0 7px 16px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.18)",
            backdropFilter: "blur(10px)",
          }}
        >
          {item.code ? (
            <img
              src={getFlagUrl(item.code)}
              alt={item.code}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : null}
        </span>
      </div>

      <div
        style={{
          position: "relative",
          minWidth: 0,
          padding: featured ? "10px 11px 9px" : "9px 10px 8px",
          display: "grid",
          alignContent: "space-between",
          gap: 6,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
            minWidth: 0,
          }}
        >
          <div
            style={{
              minWidth: 0,
              display: "grid",
              gap: 2,
            }}
          >
            <div
              style={{
                color: "var(--sub)",
                fontSize: 9,
                fontWeight: 850,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {visual.mood}
            </div>
            <h2
              style={{
                margin: 0,
                color: "var(--text)",
                fontSize: featured ? 18 : 17,
                lineHeight: 1.05,
                fontWeight: 900,
                letterSpacing: "-0.035em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </h2>
          </div>

          {onFollow ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onFollow();
              }}
              disabled={isBusy}
              style={{
                minWidth: 64,
                height: 27,
                borderRadius: 999,
                border: isFollowing
                  ? "1px solid color-mix(in srgb, var(--green) 45%, var(--border))"
                  : "1px solid color-mix(in srgb, var(--green) 68%, var(--border))",
                background: isFollowing
                  ? "color-mix(in srgb, var(--green) 13%, var(--muted))"
                  : "var(--green)",
                color: isFollowing ? "var(--text)" : "#fff",
                padding: "0 9px",
                fontSize: 10,
                fontWeight: 850,
                cursor: isBusy ? "default" : "pointer",
                opacity: isBusy ? 0.72 : 1,
                flexShrink: 0,
                boxShadow: isFollowing
                  ? "none"
                  : "0 6px 14px color-mix(in srgb, var(--green) 26%, transparent)",
              }}
            >
              {isBusy ? "..." : isFollowing ? t("following") : t("follow")}
            </button>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gap: 7,
            minWidth: 0,
          }}
        >
          <div
            style={{
              color: "var(--sub)",
              fontSize: 11,
              lineHeight: 1.28,
              fontWeight: 650,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {visual.subtitle}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 5,
              minWidth: 0,
            }}
          >
            <span style={cinematicPillStyle}>
              {item.courseCount || 0} {t("course_plural")}
            </span>
            <span style={cinematicPillStyle}>
              {item.tipsCount || 0} local notes
            </span>
            <span style={cinematicPillStyle}>
              {(item.followerCount || 0) > 0 ? "Trending" : "Emerging"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

const cinematicPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 19,
  padding: "0 6px",
  borderRadius: 999,
  border: "1px solid color-mix(in srgb, var(--border) 58%, transparent)",
  background: "color-mix(in srgb, var(--muted) 68%, transparent)",
  color: "var(--sub)",
  fontSize: 9,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

export default function DestinationsPage() {
  const nav = useNavigate();
  const { token, logout } = useAuth();
  const [items, setItems] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [followedDestinationSlugs, setFollowedDestinationSlugs] = useState<
    string[]
  >([]);
  const [destinationFollowBusySlug, setDestinationFollowBusySlug] = useState<
    string | null
  >(null);
  const [freshTips, setFreshTips] = useState<FreshTip[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`${API_BASE}/destinations`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(
            `Failed to load destinations. HTTP ${res.status} ${t}`.trim(),
          );
        }

        const data = await res.json();
        console.log("destinations raw response", data);

        const source = Array.isArray(data?.items) ? data.items : [];

        const normalized: CountryItem[] = source.map(
          (item: DestinationApiItem) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            slug: item.slug,

            // bestehendes UI weiterverwenden
            country: item.slug,
            courseCount: item.courseCount || 0,
            followerCount: item.followerCount || 0,
            tipsCount: item.tipsCount || 0,
            viewerIsFollowing: Boolean(item.viewerIsFollowing),
          }),
        );

        console.log("destinations normalized", normalized);
        setItems(normalized);
        setFollowedDestinationSlugs(
          normalized
            .filter((item) => item.viewerIsFollowing)
            .map((item) => item.slug || item.country)
            .filter((slug): slug is string => Boolean(slug)),
        );
      } catch (e: any) {
        console.error("Failed to load destination countries", e);
        setErr(e?.message ?? "Failed to load destinations");
        setItems([]);
        setFollowedDestinationSlugs([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/destinations/discovery/tips?take=6`);

        if (!res.ok) {
          throw new Error(`Failed to load fresh local notes: ${res.status}`);
        }

        const data = await res.json();
        const source = Array.isArray(data?.items) ? data.items : [];

        setFreshTips(
          source
            .filter(
              (tip: any): tip is FreshTip =>
                typeof tip?.id === "string" &&
                typeof tip?.text === "string" &&
                typeof tip?.destination?.slug === "string",
            )
            .map((tip: FreshTip) => ({
              ...tip,
              helpfulCount:
                typeof tip.helpfulCount === "number" ? tip.helpfulCount : 0,
              user: tip.user || { id: "", handle: null, name: null, avatarUrl: null },
            })),
        );
      } catch (err) {
        console.error("Failed to load fresh local notes", err);
        setFreshTips([]);
      }
    };

    run();
  }, []);

  const totalCourses = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.courseCount || 0), 0);
  }, [items]);

  const popularDestinations = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const followerDelta = (b.followerCount || 0) - (a.followerCount || 0);
        if (followerDelta !== 0) return followerDelta;
        return (b.courseCount || 0) - (a.courseCount || 0);
      })
      .slice(0, 4);
  }, [items]);

  const handleToggleDestinationFollow = useCallback(
    async (item: CountryItem) => {
      const slug = item.slug || item.country;
      if (!slug) return;
      if (destinationFollowBusySlug) return;

      if (!token) {
        nav("/");
        return;
      }

      const currentlyFollowing = followedDestinationSlugs.includes(slug);

      try {
        setDestinationFollowBusySlug(slug);

        setFollowedDestinationSlugs((prev) =>
          currentlyFollowing
            ? prev.filter((entry) => entry !== slug)
            : prev.includes(slug)
              ? prev
              : [...prev, slug],
        );

        setItems((prev) =>
          prev.map((entry) =>
            (entry.slug || entry.country) === slug
              ? {
                  ...entry,
                  followerCount: currentlyFollowing
                    ? Math.max(0, (entry.followerCount || 0) - 1)
                    : (entry.followerCount || 0) + 1,
                }
              : entry,
          ),
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
          setFollowedDestinationSlugs((prev) =>
            json.following
              ? prev.includes(slug)
                ? prev
                : [...prev, slug]
              : prev.filter((entry) => entry !== slug),
          );
        }

        if (typeof json?.followerCount === "number") {
          setItems((prev) =>
            prev.map((entry) =>
              (entry.slug || entry.country) === slug
                ? { ...entry, followerCount: json.followerCount }
                : entry,
            ),
          );
        }
      } catch (err) {
        setFollowedDestinationSlugs((prev) =>
          currentlyFollowing
            ? prev.includes(slug)
              ? prev
              : [...prev, slug]
            : prev.filter((entry) => entry !== slug),
        );

        setItems((prev) =>
          prev.map((entry) =>
            (entry.slug || entry.country) === slug
              ? {
                  ...entry,
                  followerCount: currentlyFollowing
                    ? (entry.followerCount || 0) + 1
                    : Math.max(0, (entry.followerCount || 0) - 1),
                }
              : entry,
          ),
        );

        console.error("Destination follow toggle failed", err);
      } finally {
        setDestinationFollowBusySlug(null);
      }
    },
    [token, logout, nav, destinationFollowBusySlug, followedDestinationSlugs],
  );

  return (
    <div className="fw-page">
      <div className="fw-page-atmosphere" aria-hidden="true">
        <div className="fw-page-atmosphere-overlay" />
      </div>

      <div
        className="fw-page-shell"
        style={{
          display: "grid",
          gap: 22,
          padding: "12px 12px 96px",
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        <section
          style={{
            position: "relative",
            display: "grid",
            gap: 14,
            minHeight: 190,
            padding: "22px 18px 18px",
            borderRadius: 30,
            border: "1px solid color-mix(in srgb, var(--border) 46%, transparent)",
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--card) 98%, white 10%), color-mix(in srgb, var(--card) 92%, var(--bg) 8%))",
            boxShadow: "0 18px 44px rgba(0,0,0,0.10)",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, color-mix(in srgb, var(--card) 99%, white 12%) 0%, color-mix(in srgb, var(--card) 97%, transparent) 48%, transparent 100%)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0 0 0 auto",
              width: "48%",
              minWidth: 150,
              background:
                "linear-gradient(135deg, #9fbf9d, #d5c292)",
              pointerEvents: "none",
            }}
          >
            <img
              src={EXPLORE_HERO_IMAGE}
              alt=""
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                opacity: 0.78,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, color-mix(in srgb, var(--card) 96%, transparent) 0%, rgba(255,255,255,0.18) 38%, rgba(255,255,255,0.02) 100%)",
              }}
            />
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 3,
              display: "grid",
              gap: 8,
              maxWidth: "min(100%, 560px)",
            }}
          >
            <div
              style={{
                width: "fit-content",
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
                background: "color-mix(in srgb, var(--muted) 76%, transparent)",
                color: "var(--sub)",
                fontSize: 10,
                fontWeight: 850,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Discovery
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 31,
                lineHeight: 1.05,
                fontWeight: 900,
                letterSpacing: "-0.052em",
                color: "var(--text)",
                maxWidth: 430,
              }}
            >
              Explore golf destinations
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 390,
                color: "var(--sub)",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              Browse countries shaped by memorable courses, local notes, and
              travel-worthy fairways.
            </p>
          </div>

          {!loading && !err ? (
            <div
              style={{
                position: "relative",
                zIndex: 3,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 42,
                  padding: "0 12px",
                  borderRadius: 16,
                  border: "1px solid color-mix(in srgb, var(--border) 58%, transparent)",
                  background: "color-mix(in srgb, var(--card) 88%, white 8%)",
                  color: "var(--text)",
                  fontSize: 12,
                  fontWeight: 800,
                  boxShadow: "0 8px 18px rgba(0,0,0,0.055)",
                }}
              >
                {items.length} {items.length === 1 ? t("country_singular") : t("country_plural")}
              </span>

              {totalCourses > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 42,
                    padding: "0 12px",
                    borderRadius: 16,
                    border: "1px solid color-mix(in srgb, var(--green) 28%, var(--border))",
                    background: "color-mix(in srgb, var(--green) 10%, var(--card))",
                    color: "var(--text)",
                    fontSize: 12,
                    fontWeight: 800,
                    boxShadow: "0 8px 18px rgba(0,0,0,0.055)",
                  }}
                >
                  {totalCourses} {t("course_plural")}
                </span>
              ) : null}
            </div>
          ) : null}
        </section>

        {err ? (
          <div
            style={{
              padding: 16,
              borderRadius: 22,
              border: "1px solid color-mix(in srgb, #ef4444 32%, var(--border))",
              background: "color-mix(in srgb, #ef4444 9%, var(--card))",
              color: "var(--text)",
              fontSize: 13,
              lineHeight: 1.45,
              boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            }}
          >
            <strong>{t("error")}:</strong> {err}
          </div>
        ) : null}

        {loading ? (
          <DestinationRowsSkeleton count={4} />
        ) : null}

        {!loading && !err && items.length === 0 ? (
          <EmptyState
            title="No destinations yet"
            body="New golf destinations will appear here once they are available."
          />
        ) : null}

        {!loading && !err && popularDestinations.length > 0 ? (
          <section
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "end",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "grid", gap: 3 }}>
                <div
                  style={{
                    color: "var(--text)",
                    fontSize: 18,
                    fontWeight: 850,
                    letterSpacing: "-0.025em",
                  }}
                >
                  Popular destinations
                </div>
                <div
                  style={{
                    color: "var(--sub)",
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  Places golfers are following and exploring.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 9,
              }}
            >
              {popularDestinations.map((item) => {
                const slug = item.slug || item.country;

                return (
                  <DestinationHeroCard
                    key={`popular-${slug}`}
                    item={item}
                    featured
                    onOpen={() => nav(`/destinations/${slug}`)}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        {freshTips.length > 0 ? (
          <section
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "grid", gap: 3 }}>
              <div
                style={{
                  color: "var(--text)",
                  fontSize: 18,
                  fontWeight: 850,
                  letterSpacing: "-0.025em",
                }}
              >
                Fresh local notes
              </div>
              <div
                style={{
                  color: "var(--sub)",
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                Recent practical tips from golfers around the world.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              {freshTips.map((tip) => {
                const author =
                  tip.user?.name ||
                  (tip.user?.handle ? `@${tip.user.handle}` : "Fairwayd golfer");

                return (
                  <button
                    key={tip.id}
                    type="button"
                    onClick={() => nav(`/destinations/${tip.destination.slug}`)}
                    style={{
                      display: "grid",
                      gap: 11,
                      padding: 14,
                      borderRadius: 22,
                      border:
                        "1px solid color-mix(in srgb, var(--border) 64%, transparent)",
                      background:
                        "color-mix(in srgb, var(--muted) 54%, transparent)",
                      color: "var(--text)",
                      textAlign: "left",
                      cursor: "pointer",
                      boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 9,
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 999,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                            overflow: "hidden",
                            background:
                              "color-mix(in srgb, var(--card) 88%, var(--green) 4%)",
                            border:
                              "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                            boxShadow:
                              "0 4px 10px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.16)",
                          }}
                        >
                          <img
                            src={`https://flagcdn.com/w40/${tip.destination.code.toLowerCase()}.png`}
                            alt={tip.destination.code}
                            style={{
                              display: "block",
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                        <div style={{ minWidth: 0, display: "grid", gap: 1 }}>
                          <div
                            style={{
                              minWidth: 0,
                              color: "var(--text)",
                              fontSize: 12,
                              fontWeight: 850,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tip.destination.name}
                          </div>
                          <div
                            style={{
                              color: "var(--sub)",
                              fontSize: 10,
                              fontWeight: 850,
                              letterSpacing: "0.08em",
                              lineHeight: 1,
                            }}
                          >
                            {tip.destination.code}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          flexShrink: 0,
                          color: "var(--sub)",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        Useful · {tip.helpfulCount || 0}
                      </span>
                    </div>

                    <div
                      style={{
                        color: "color-mix(in srgb, var(--text) 88%, var(--sub))",
                        fontSize: 14,
                        lineHeight: 1.58,
                        fontWeight: 500,
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {tip.text}
                    </div>

                    <div
                      style={{
                        color: "var(--sub)",
                        fontSize: 12,
                        fontWeight: 750,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {author}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {!loading && !err && items.length > 0 ? (
          <div
            style={{
              display: "grid",
              gap: 9,
            }}
          >
            {items.map((item) => {
              const slug = item.slug || item.country;
              const isFollowing = followedDestinationSlugs.includes(slug);
              const isBusy = destinationFollowBusySlug === slug;

              return (
                <DestinationHeroCard
                  key={item.country}
                  item={item}
                  isFollowing={isFollowing}
                  isBusy={isBusy}
                  onOpen={() => nav(`/destinations/${slug}`)}
                  onFollow={() => handleToggleDestinationFollow(item)}
                />
              );
            })}
          </div>
        ) : null}

        <BackToTopButton />
      </div>
    </div>
  );
}
