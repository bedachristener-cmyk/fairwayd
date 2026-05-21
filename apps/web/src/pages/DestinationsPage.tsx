import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { API_BASE } from "../api/base";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import BackToTopButton from "../components/BackToTopButton";
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
};

const DESTINATION_VISUALS: Record<string, DestinationVisual> = {
  thailand: {
    image:
      "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Tropical fairways and golden sunsets",
    mood: "Warm-weather golf escape",
  },
  vietnam: {
    image:
      "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Coastal golf corridors and vibrant city bases",
    mood: "Coast and culture",
  },
  portugal: {
    image:
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Atlantic cliffs and endless golf days",
    mood: "Ocean-side golf",
  },
  spain: {
    image:
      "https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Sunlit resort golf and late Spanish evenings",
    mood: "Mediterranean rhythm",
  },
  turkey: {
    image:
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Resort fairways between pines and sea",
    mood: "Resort golf coast",
  },
  "united-arab-emirates": {
    image:
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Desert light, skyline golf, and immaculate greens",
    mood: "Desert precision",
  },
  switzerland: {
    image:
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Alpine mornings and dramatic fairways",
    mood: "Mountain golf",
  },
  germany: {
    image:
      "https://images.unsplash.com/photo-1591491638850-6d0f4fd27a47?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Forest-lined courses and classic club culture",
    mood: "Quiet parkland golf",
  },
  austria: {
    image:
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Lakeside golf days below the Alps",
    mood: "Alpine lake country",
  },
  france: {
    image:
      "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Elegant escapes from coast to countryside",
    mood: "Classic golf travel",
  },
  italy: {
    image:
      "https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Lake mornings, hill towns, and graceful golf",
    mood: "Laid-back elegance",
  },
  japan: {
    image:
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Mountain mornings and precision golf",
    mood: "Precise and serene",
  },
  "united-states": {
    image:
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1400&q=78",
    subtitle: "Big landscapes and destination golf icons",
    mood: "Open-road golf",
  },
};

const DEFAULT_DESTINATION_VISUAL: DestinationVisual = {
  image:
    "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=1400&q=78",
  subtitle: "A new golf journey waiting to be shaped",
  mood: "Golf travel",
};

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
        minHeight: featured ? 224 : 198,
        borderRadius: featured ? 26 : 24,
        overflow: "hidden",
        cursor: "pointer",
        border: "1px solid color-mix(in srgb, var(--border) 56%, transparent)",
        background: "var(--card)",
        boxShadow: featured
          ? "0 16px 38px rgba(0,0,0,0.14)"
          : "0 12px 30px rgba(0,0,0,0.10)",
      }}
    >
      <img
        src={visual.image}
        alt={`${label} golf travel inspiration`}
        loading="lazy"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transform: "scale(1.01)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.34) 48%, rgba(0,0,0,0.08) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: featured ? 224 : 198,
          padding: featured ? 14 : 13,
          display: "grid",
          alignContent: "space-between",
          gap: 12,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              minHeight: 30,
              padding: "4px 8px 4px 5px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.24)",
              background: "rgba(0,0,0,0.28)",
              color: "#fff",
              backdropFilter: "blur(12px)",
            }}
          >
            <span
              style={{
                width: 21,
                height: 21,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.28)",
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
            <span
              style={{
                fontSize: 10,
                fontWeight: 850,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {item.code || visual.mood}
            </span>
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
                minWidth: 78,
                height: 31,
                borderRadius: 999,
                border: isFollowing
                  ? "1px solid rgba(255,255,255,0.28)"
                  : "1px solid color-mix(in srgb, var(--green) 70%, white)",
                background: isFollowing
                  ? "rgba(255,255,255,0.16)"
                  : "var(--green)",
                color: "#fff",
                padding: "0 11px",
                fontSize: 11,
                fontWeight: 850,
                cursor: isBusy ? "default" : "pointer",
                opacity: isBusy ? 0.72 : 1,
                backdropFilter: "blur(12px)",
                boxShadow: isFollowing
                  ? "none"
                  : "0 10px 22px color-mix(in srgb, var(--green) 34%, transparent)",
              }}
            >
              {isBusy ? "..." : isFollowing ? t("following") : t("follow")}
            </button>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gap: 9,
            maxWidth: 560,
          }}
        >
          <div style={{ display: "grid", gap: 5 }}>
            <div
              style={{
                color: "rgba(255,255,255,0.80)",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {visual.mood}
            </div>
            <h2
              style={{
                margin: 0,
                color: "#fff",
                fontSize: featured ? 25 : 23,
                lineHeight: 1.02,
                fontWeight: 900,
                letterSpacing: "-0.045em",
              }}
            >
              {label}
            </h2>
            <div
              style={{
                color: "rgba(255,255,255,0.88)",
                fontSize: featured ? 13 : 12,
                lineHeight: 1.38,
                fontWeight: 600,
              }}
            >
              {visual.subtitle}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
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
  minHeight: 23,
  padding: "0 8px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.22)",
  color: "rgba(255,255,255,0.84)",
  fontSize: 10,
  fontWeight: 800,
  backdropFilter: "blur(12px)",
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
      .slice(0, 6);
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
            gap: 18,
            padding: "26px 20px 22px",
            borderRadius: 32,
            border: "1px solid color-mix(in srgb, var(--border) 54%, transparent)",
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--green) 4%), color-mix(in srgb, var(--card) 88%, var(--bg) 12%))",
            boxShadow: "0 22px 58px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: -44,
              top: -56,
              width: 150,
              height: 150,
              borderRadius: 999,
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--green) 24%, transparent), transparent 68%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", display: "grid", gap: 7 }}>
            <div
              style={{
                width: "fit-content",
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
                background: "color-mix(in srgb, var(--muted) 82%, transparent)",
                color: "var(--sub)",
                fontSize: 11,
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
                fontSize: 34,
                lineHeight: 1.05,
                fontWeight: 900,
                letterSpacing: "-0.055em",
                color: "var(--text)",
                maxWidth: 620,
              }}
            >
              Discover your next golf destination
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 590,
                color: "var(--sub)",
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              Slow down, browse the world by mood, and find places shaped by
              memorable courses, local notes, and travel-worthy fairways.
            </p>
          </div>

          {!loading && !err ? (
            <div
              style={{
                position: "relative",
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 30,
                  padding: "0 12px",
                  borderRadius: 999,
                  border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
                  background: "color-mix(in srgb, var(--muted) 78%, transparent)",
                  color: "var(--text)",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {items.length} {items.length === 1 ? t("country_singular") : t("country_plural")}
              </span>

              {totalCourses > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 30,
                    padding: "0 12px",
                    borderRadius: 999,
                    border: "1px solid color-mix(in srgb, var(--green) 34%, var(--border))",
                    background: "color-mix(in srgb, var(--green) 12%, var(--muted))",
                    color: "var(--text)",
                    fontSize: 12,
                    fontWeight: 800,
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
          <div
            style={{
              display: "grid",
              gap: 6,
              padding: 18,
              borderRadius: 24,
              border: "1px solid color-mix(in srgb, var(--border) 76%, transparent)",
              background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
              color: "var(--text)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 850 }}>
              {t("loading_destinations")}
            </div>
            <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.45 }}>
              Preparing your next golf travel shortlist.
            </div>
          </div>
        ) : null}

        {!loading && !err && items.length === 0 ? (
          <div
            style={{
              display: "grid",
              gap: 6,
              padding: 18,
              borderRadius: 24,
              border: "1px solid color-mix(in srgb, var(--border) 76%, transparent)",
              background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
              color: "var(--text)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 850 }}>
              No destinations yet
            </div>
            <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.45 }}>
              New golf destinations will appear here once they are available.
            </div>
          </div>
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
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 14,
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
                        <img
                          src={`https://flagcdn.com/w40/${tip.destination.code.toLowerCase()}.png`}
                          alt={tip.destination.code}
                          style={{
                            display: "block",
                            width: 24,
                            height: 17,
                            objectFit: "cover",
                            borderRadius: 5,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.16)",
                          }}
                        />
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
              gap: 14,
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
